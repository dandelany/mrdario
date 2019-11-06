import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import * as SCChannel from "sc-channel";
import { SCClientSocket } from "socketcluster-client";

export type ValidatedSCChannel<MessageType> = Omit<SCChannel.SCChannel, "watch"> & {
  watch: (handler: (data: MessageType) => void) => void;
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
  channel: SCChannel.SCChannel,
  codec: t.Type<MessageType>,
  shouldThrow: boolean = true
): ValidatedSCChannel<MessageType> {
  const watchHandlerMap = new Map<Function, (data: any) => void>();
  return new Proxy(channel, {
    get(target, propKey) {
      // replace channel.watch method with one which validates incoming messages
      if (propKey === "watch") {
        const origWatch = target[propKey];
        return function(origHandler: (data: MessageType) => void): void {
          // wrap user-provided handler with a func that validates data against codec
          const wrappedHandler = function(data: any) {
            const decoded = codec.decode(data);
            if (decoded.isRight()) {
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
          // call original channel.watch function with our wrapped (validated) handler
          origWatch.call(channel, wrappedHandler);
        };
      } else if (propKey === "unwatch") {
        const origUnwatch = target[propKey];
        return function(origHandler?: (data: MessageType) => void): void {
          // look up the originally-passed handler in map to find the wrapped handler that's actually bound
          if (origHandler && watchHandlerMap.has(origHandler)) {
            const wrappedHandler = watchHandlerMap.get(origHandler);
            watchHandlerMap.delete(origHandler);
            origUnwatch(wrappedHandler);
          } else {
            origUnwatch(origHandler);
          }
        };
      }
      // todo type?
      // @ts-ignore
      return target[propKey];
    }
    // todo proxy publish
  });
}

export async function promisifySocketRequest<ResponseType, RequestType = any>(
  socket: SCClientSocket,
  eventName: string,
  requestData: RequestType,
  TResponseType: t.Type<ResponseType>
): Promise<ResponseType> {
  return await new Promise<ResponseType>(function(resolve, reject) {
    socket.emit(eventName, requestData, (err: string | undefined, data: any) => {
      if (err) {
        reject(new Error(err));
      }
      const decoded = TResponseType.decode(data);
      if (decoded.isRight()) {
        resolve(decoded.value);
      } else if (decoded.isLeft()) {
        reject(new Error(PathReporter.report(decoded)[0]));
      }
      resolve(data);
    });
  });
}

export async function promisifySocketPublish<AckDataType = undefined>(
  socket: SCClientSocket,
  channelName: string,
  data: any
): Promise<AckDataType> {
  return new Promise((resolve, reject) => {
    socket.publish(channelName, data, (err: Error, ackData: AckDataType) => {
      if (err) { reject(err); }
      else { resolve(ackData); }
    });
  });
}
