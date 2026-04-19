const LOCAL_SOCKET_EVENTS = new Set([
  'connect',
  'disconnect',
  'close',
  'error',
  'authenticate',
  'deauthenticate',
  'authStateChange',
  'connectAbort',
  'subscribe',
  'unsubscribe',
  'message',
  'raw',
  'end'
]);

function makeMiddlewareRunner(middlewares) {
  return async (stream) => {
    for await (const action of stream) {
      if (action.type !== 'publishIn' && action.type !== 'publishOut') {
        action.allow();
        continue;
      }

      const req = {
        socket: action.socket,
        channel: action.channel,
        data: action.data
      };

      try {
        await runLegacyMiddlewareChain(middlewares[action.type], req);
        action.allow({ data: req.data });
      } catch (error) {
        action.block(error);
      }
    }
  };
}

async function runLegacyMiddlewareChain(middlewares, req) {
  let index = -1;

  async function runNext(error) {
    if (error) {
      throw normalizeLegacyMiddlewareError(error);
    }

    index += 1;
    if (index >= middlewares.length) {
      return;
    }

    await new Promise((resolve, reject) => {
      let settled = false;
      const next = (nextError) => {
        if (settled) {
          return;
        }
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

function normalizeLegacyMiddlewareError(error) {
  if (error === true) {
    return new Error('middleware blocked request');
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return error;
}

export function createCompatServer(agServer) {
  const wrappedSockets = new WeakMap();
  const middlewares = {
    publishIn: [],
    publishOut: []
  };

  const wrapSocket = (agSocket) => {
    if (!wrappedSockets.has(agSocket)) {
      wrappedSockets.set(agSocket, createCompatSocket(agSocket));
    }
    return wrappedSockets.get(agSocket);
  };

  agServer.setMiddleware(agServer.MIDDLEWARE_INBOUND, makeMiddlewareRunner(middlewares));
  agServer.setMiddleware(agServer.MIDDLEWARE_OUTBOUND, makeMiddlewareRunner(middlewares));

  return {
    MIDDLEWARE_PUBLISH_IN: 'publishIn',
    MIDDLEWARE_PUBLISH_OUT: 'publishOut',
    exchange: {
      publish(channelName, data, callback) {
        const publishPromise = agServer.exchange.transmitPublish(channelName, data);
        if (callback) {
          publishPromise.then(() => callback()).catch((error) => callback(error));
        }
        return publishPromise;
      },
      transmitPublish(channelName, data) {
        return agServer.exchange.transmitPublish(channelName, data);
      },
      invokePublish(channelName, data) {
        return agServer.exchange.invokePublish(channelName, data);
      }
    },
    addMiddleware(type, middleware) {
      if (type !== 'publishIn' && type !== 'publishOut') {
        throw new Error(`unsupported legacy middleware type: ${type}`);
      }
      middlewares[type].push(middleware);
    },
    on(eventName, handler) {
      if (eventName === 'connection') {
        void (async () => {
          for await (const { socket } of agServer.listener('connection')) {
            handler(wrapSocket(socket));
          }
        })();
        return;
      }

      void (async () => {
        for await (const event of agServer.listener(eventName)) {
          handler(event);
        }
      })();
    }
  };
}

function createCompatSocket(agSocket) {
  const bindings = new Map();

  const compatSocket = {
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
      if (!binding) {
        return;
      }
      binding.close();
      bindings.delete(key);
    }
  };

  return compatSocket;
}

function createBinding(agSocket, eventName, handler) {
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

async function consumeLocalEvents(eventName, handler, consumer) {
  try {
    for await (const event of consumer) {
      if (eventName === 'error') {
        handler(event.error);
      } else if (eventName === 'authenticate') {
        handler(event.authToken);
      } else {
        handler(event);
      }
    }
  } catch (error) {
    if (error && error.name !== 'AbortError') {
      throw error;
    }
  }
}

async function consumeReceiverEvents(handler, consumer) {
  try {
    for await (const data of consumer) {
      handler(data, noopRespond);
    }
  } catch (error) {
    if (error && error.name !== 'AbortError') {
      throw error;
    }
  }
}

async function consumeProcedureEvents(handler, consumer) {
  try {
    for await (const request of consumer) {
      handler(request.data, (error, data) => {
        if (error) {
          request.error(normalizeLegacyResponderError(error));
        } else {
          request.end(data);
        }
      });
    }
  } catch (error) {
    if (error && error.name !== 'AbortError') {
      throw error;
    }
  }
}

function normalizeLegacyResponderError(error) {
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (error === true) {
    return new Error('request blocked');
  }
  return error;
}

function noopRespond() {}

function getBindingKey(eventName, handler) {
  return `${eventName}::${handler}`;
}
