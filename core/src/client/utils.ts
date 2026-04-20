import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter.js";
import { AGClientChannel, SCClientSocket } from "socketcluster-client";
import { isRight } from "fp-ts/lib/Either.js";

export type ValidatedSCChannel<MessageType> = Omit<AGClientChannel<MessageType>, "watch" | "unwatch"> & {
  watch: (handler: (data: MessageType) => void) => void;
  unwatch: (handler?: (data: MessageType) => void) => void;
};

/**
 * Given a Socketcluster client channel, and an io-ts codec which validates a MessageType,
 * returns a typed and validated version of the channel which only .emits MessageType messages
 * and is guaranteed to only call .watch handlers with MessageType messages
 *
 * @param channel
 * @param codec
 * @param shouldThrow
 */
export function validatedChannel<MessageType>(
  channel: AGClientChannel,
  codec: t.Type<MessageType>,
  shouldThrow: boolean = true
): ValidatedSCChannel<MessageType> {
  const watchHandlerMap = new Map<(data: MessageType) => void, (data: unknown) => void>();
  let consumer: (AsyncIterable<unknown> & { return?(): any }) | undefined;

  const ensureConsumer = () => {
    if (consumer) return;
    consumer = channel.createConsumer();
    void (async () => {
      for await (const data of consumer!) {
        for (const handler of watchHandlerMap.values()) {
          handler(data);
        }
      }
    })();
  };

  const resetConsumerIfUnused = () => {
    if (!watchHandlerMap.size && consumer?.return) {
      consumer.return();
      consumer = undefined;
    }
  };

  return new Proxy(channel, {
    get(target, propKey) {
      // replace channel.watch method with one which validates incoming messages
      if (propKey === "watch") {
        return function(origHandler: (data: MessageType) => void): void {
          // wrap user-provided handler with a func that validates data against codec
          const wrappedHandler = function(data: any) {
            const decoded = codec.decode(data);
            if (isRight(decoded)) {
              // passed validation, call handler
              origHandler(data);
            } else {
              const message = PathReporter.report(decoded)[0];
              if (shouldThrow) { throw new Error(message); }
              else { console.error(message); }
            }
          };
          // save original handler in map so we can unwatch
          watchHandlerMap.set(origHandler, wrappedHandler);
          ensureConsumer();
        };
      } else if (propKey === "unwatch") {
        return function(origHandler?: (data: MessageType) => void): void {
          // look up the originally-passed handler in map to find the wrapped handler that's actually bound
          if (origHandler && watchHandlerMap.has(origHandler)) {
            watchHandlerMap.delete(origHandler);
          } else {
            watchHandlerMap.clear();
          }
          resetConsumerIfUnused();
        };
      }
      // todo type?
      // @ts-ignore
      return target[propKey];
    }
    // todo proxy publish
  }) as unknown as ValidatedSCChannel<MessageType>;
}

export async function promisifySocketRequest<ResponseType, RequestType = any>(
  socket: SCClientSocket,
  eventName: string,
  requestData: RequestType,
  TResponseType: t.Type<ResponseType>
): Promise<ResponseType> {
  const data = await socket.invoke(eventName, requestData);
  const decoded = TResponseType.decode(data);
  if (isRight(decoded)) {
    return decoded.right;
  }
  throw new Error(PathReporter.report(decoded)[0]);
}

export async function promisifySocketPublish<AckDataType = undefined>(
  socket: SCClientSocket,
  channelName: string,
  data: any
): Promise<AckDataType> {
  return await socket.invokePublish(channelName, data) as AckDataType;
}
