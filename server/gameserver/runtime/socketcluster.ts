import type { AppAuthToken } from "mrdario-core/api";

import type {
  ClientConnection,
  PublishInRequest,
  PublishOutRequest,
  TopicPublishMiddleware,
  TransportRuntime,
  TransportSocket
} from "./types.js";

// socketcluster-specific transport adapter.
// this is the one place where gameserver is allowed to know how socketcluster 20 actually behaves.

const LOCAL_SOCKET_EVENTS = new Set([
  "connect",
  "disconnect",
  "close",
  "error",
  "authenticate",
  "deauthenticate",
  "authStateChange",
  "connectAbort",
  "subscribe",
  "unsubscribe",
  "message",
  "raw",
  "end"
]);

export function createSocketClusterTransport(agServer: any): TransportRuntime {
  const wrappedSockets = new WeakMap<object, TransportSocket>();
  const middlewares: {
    publishIn: TopicPublishMiddleware<PublishInRequest>[];
    publishOut: TopicPublishMiddleware<PublishOutRequest>[];
  } = {
    publishIn: [],
    publishOut: []
  };

  const wrapSocket = (agSocket: any): TransportSocket => {
    if (!wrappedSockets.has(agSocket)) {
      // keep one stable wrapper per underlying socket so module code can add/remove handlers sanely.
      wrappedSockets.set(agSocket, createSocketClusterSocket(agSocket));
    }
    return wrappedSockets.get(agSocket)!;
  };

  // socketcluster middleware streams are adapted into the simpler publishIn/publishOut hooks
  // used by the module runtime.
  agServer.setMiddleware(agServer.MIDDLEWARE_INBOUND, makeMiddlewareRunner(middlewares, wrapSocket));
  agServer.setMiddleware(agServer.MIDDLEWARE_OUTBOUND, makeMiddlewareRunner(middlewares, wrapSocket));

  return {
    publish(topic: string, payload: unknown) {
      return agServer.exchange.transmitPublish(topic, payload);
    },
    onPublishIn(middleware) {
      middlewares.publishIn.push(middleware);
    },
    onPublishOut(middleware) {
      middlewares.publishOut.push(middleware);
    },
    onConnection(handler) {
      void (async () => {
        for await (const { socket } of agServer.listener("connection")) {
          handler(createClientConnection(wrapSocket(socket)));
        }
      })();
    }
  };
}

export function createClientConnection(socket: TransportSocket): ClientConnection {
  return {
    get id() {
      return socket.id;
    },
    get socket() {
      return socket;
    },
    get authToken() {
      return socket.authToken as AppAuthToken | undefined;
    },
    send(eventName: string, payload: unknown) {
      socket.emit(eventName, payload);
    },
    setAuthToken(token: AppAuthToken) {
      socket.setAuthToken(token);
    },
    clearAuthToken() {
      socket.deauthenticate();
    },
    on(eventName: string, handler: (...args: any[]) => void) {
      socket.on(eventName, handler);
    },
    off(eventName: string, handler: (...args: any[]) => void) {
      socket.off(eventName, handler);
    }
  };
}

function makeMiddlewareRunner(
  middlewares: {
    publishIn: TopicPublishMiddleware<PublishInRequest>[];
    publishOut: TopicPublishMiddleware<PublishOutRequest>[];
  },
  wrapSocket: (agSocket: any) => TransportSocket
) {
  return async (stream: AsyncIterable<any>) => {
    // socketcluster feeds middleware as async stream actions; we translate those into the
    // older "req + next" shape that the module runtime currently expects.
    for await (const action of stream) {
      if (action.type !== "publishIn" && action.type !== "publishOut") {
        action.allow();
        continue;
      }

      const req =
        action.type === "publishIn"
          ? ({ socket: wrapSocket(action.socket), channel: action.channel, data: action.data } satisfies PublishInRequest)
          : ({ socket: wrapSocket(action.socket), channel: action.channel, data: action.data } satisfies PublishOutRequest);

      try {
        await runMiddlewareChain(middlewares[action.type], req);
        action.allow({ data: req.data });
      } catch (error) {
        action.block(error);
      }
    }
  };
}

async function runMiddlewareChain<ReqType extends PublishInRequest | PublishOutRequest>(
  middlewares: TopicPublishMiddleware<ReqType>[],
  req: ReqType
) {
  let index = -1;

  async function runNext(error?: string | true | Error | undefined) {
    if (error) {
      throw normalizeMiddlewareError(error);
    }

    index += 1;
    if (index >= middlewares.length) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const next = (nextError?: string | true | Error | undefined) => {
        if (settled) return;
        settled = true;
        Promise.resolve(runNext(nextError)).then(resolve, reject);
      };

      try {
        middlewares[index](req, next);
      } catch (handlerError) {
        reject(handlerError);
      }
    });
  }

  await runNext();
}

function normalizeMiddlewareError(error: string | true | Error) {
  if (error === true) return new Error("middleware blocked request");
  if (typeof error === "string") return new Error(error);
  return error;
}

function createSocketClusterSocket(agSocket: any): TransportSocket {
  const bindings = new Map<string, { close(): void }>();

  return {
    get id() {
      return agSocket.id;
    },
    get state() {
      return agSocket.state;
    },
    get request() {
      return agSocket.request;
    },
    get remoteAddress() {
      return agSocket.remoteAddress;
    },
    get remoteFamily() {
      return agSocket.remoteFamily;
    },
    get remotePort() {
      return agSocket.remotePort;
    },
    get authToken() {
      return agSocket.authToken;
    },
    set authToken(value) {
      agSocket.authToken = value;
    },
    get authState() {
      return agSocket.authState;
    },
    get AUTHENTICATED() {
      return agSocket.AUTHENTICATED;
    },
    emit(eventName, data) {
      return agSocket.transmit(eventName, data);
    },
    setAuthToken(token, options) {
      return agSocket.setAuthToken(token, options);
    },
    deauthenticate() {
      return agSocket.deauthenticate();
    },
    on(eventName, handler) {
      const binding = createBinding(agSocket, eventName, handler);
      bindings.set(binding.key, binding);
    },
    off(eventName, handler) {
      const key = getBindingKey(eventName, handler);
      const binding = bindings.get(key);
      if (!binding) return;
      binding.close();
      bindings.delete(key);
    }
  };
}

function createBinding(agSocket: any, eventName: string, handler: (...args: any[]) => void) {
  const key = getBindingKey(eventName, handler);

  if (LOCAL_SOCKET_EVENTS.has(eventName)) {
    const consumer = agSocket.listener(eventName).createConsumer();
    void consumeLocalEvents(eventName, handler, consumer);
    return {
      key,
      close() {
        consumer.return();
      }
    };
  }

  // for legacy continuity, a single `socket.on(event)` binding listens to both:
  // - receiver events (fire-and-forget transmit)
  // - procedure events (request/response)
  // this is still a little ugly, but it keeps the module/runtime surface small for now.
  const receiverConsumer = agSocket.receiver(eventName).createConsumer();
  const procedureConsumer = agSocket.procedure(eventName).createConsumer();
  void consumeReceiverEvents(handler, receiverConsumer);
  void consumeProcedureEvents(handler, procedureConsumer);

  return {
    key,
    close() {
      receiverConsumer.return();
      procedureConsumer.return();
    }
  };
}

async function consumeLocalEvents(eventName: string, handler: (...args: any[]) => void, consumer: any) {
  try {
    for await (const event of consumer) {
      if (eventName === "error") {
        handler(event.error);
      } else if (eventName === "authenticate") {
        handler(event.authToken);
      } else {
        handler(event);
      }
    }
  } catch (error: any) {
    if (error?.name !== "AbortError") throw error;
  }
}

async function consumeReceiverEvents(handler: (...args: any[]) => void, consumer: any) {
  try {
    for await (const data of consumer) {
      handler(data, noopRespond);
    }
  } catch (error: any) {
    if (error?.name !== "AbortError") throw error;
  }
}

async function consumeProcedureEvents(handler: (...args: any[]) => void, consumer: any) {
  try {
    for await (const request of consumer) {
      handler(request.data, (error: any, data: any) => {
        if (error) {
          request.error(normalizeResponderError(error));
        } else {
          request.end(data);
        }
      });
    }
  } catch (error: any) {
    if (error?.name !== "AbortError") throw error;
  }
}

function normalizeResponderError(error: string | true | Error) {
  if (typeof error === "string") return new Error(error);
  if (error === true) return new Error("request blocked");
  return error;
}

function noopRespond() {}

function getBindingKey(eventName: string, handler: (...args: any[]) => void) {
  return `${eventName}::${handler}`;
}
