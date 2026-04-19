import lodash from "lodash";
import { LegacyCompatSocket } from "../compat.js";

const { get } = lodash;

export * from "./auth.js";
export * from "./io.js";
export * from "./log.js";

export function getClientIpAddress(socket: LegacyCompatSocket) {
  return get(socket, "request.headers.x-forwarded-for", socket.remoteAddress);
}

export function getSocketInfo(socket: LegacyCompatSocket) {
  return {
    state: socket.state,
    ip: getClientIpAddress(socket),
    id: socket.id,
    ua: get(socket, "request.headers.user-agent", ""),
    time: Number(new Date())
  };
}
export function socketInfoStr(socket: LegacyCompatSocket) {
  return JSON.stringify(getSocketInfo(socket));
}

export type EventHandlersObj =  { [k in string]: () => void };

export function bindSocketHandlers(socket: LegacyCompatSocket, handlers: EventHandlersObj) {
  for (let eventType of Object.keys(handlers)) {
    //@ts-ignore
    socket.on(eventType, handlers[eventType]);
  }
}

export function unbindSocketHandlers(socket: LegacyCompatSocket, handlers: EventHandlersObj) {
  for (let eventType of Object.keys(handlers)) {
    socket.off(eventType, handlers[eventType]);
    delete handlers[eventType];
  }
}

export interface SocketResponder<T> {
  (error: Error | string | true, data: null): void;
  (error: null, data: T): void;
}

// SCServer only exports these constants on a class instance
// convenient for typing reasons to have them as an enum
export enum SCMiddlewareType {
  MIDDLEWARE_HANDSHAKE_WS = "handshakeWS",
  MIDDLEWARE_HANDSHAKE_SC ="handshakeSC",
  MIDDLEWARE_AUTHENTICATE = "authenticate",
  MIDDLEWARE_SUBSCRIBE = "subscribe",
  MIDDLEWARE_PUBLISH_IN ="publishIn",
  MIDDLEWARE_PUBLISH_OUT = "publishOut",
  MIDDLEWARE_EMIT = "emit"
}
