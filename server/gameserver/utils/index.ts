import lodash from "lodash";
import { TransportSocket } from "../runtime/types.js";

const { get } = lodash;

export * from "./auth.js";
export * from "./io.js";
export * from "./log.js";

export function getClientIpAddress(socket: TransportSocket) {
  return get(socket, "request.headers.x-forwarded-for", socket.remoteAddress);
}

export function getSocketInfo(socket: TransportSocket) {
  return {
    state: socket.state,
    ip: getClientIpAddress(socket),
    id: socket.id,
    ua: get(socket, "request.headers.user-agent", ""),
    time: Number(new Date())
  };
}
export function socketInfoStr(socket: TransportSocket) {
  return JSON.stringify(getSocketInfo(socket));
}

export type EventHandlersObj =  { [k in string]: () => void };

export function bindSocketHandlers(socket: TransportSocket, handlers: EventHandlersObj) {
  for (let eventType of Object.keys(handlers)) {
    //@ts-ignore
    socket.on(eventType, handlers[eventType]);
  }
}

export function unbindSocketHandlers(socket: TransportSocket, handlers: EventHandlersObj) {
  for (let eventType of Object.keys(handlers)) {
    socket.off(eventType, handlers[eventType]);
    delete handlers[eventType];
  }
}

export interface SocketResponder<T> {
  (error: Error | string | true, data: null): void;
  (error: null, data: T): void;
}
