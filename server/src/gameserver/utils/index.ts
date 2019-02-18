import { SCServerSocket } from "socketcluster-server";
import { get } from "lodash";

export function getClientIpAddress(socket: SCServerSocket) {
  return get(socket, "request.headers.x-forwarded-for", socket.remoteAddress);
}

export function getSocketInfo(socket: SCServerSocket) {
  return {
    state: socket.state,
    ip: getClientIpAddress(socket),
    id: socket.id,
    ua: get(socket, "request.headers.user-agent", ""),
    time: Number(new Date())
  };
}
export function socketInfoStr(socket: SCServerSocket) {
  return JSON.stringify(getSocketInfo(socket));
}

export type EventHandlersObj =  { [k in string]: () => void };

export function bindSocketHandlers(socket: SCServerSocket, handlers: EventHandlersObj) {
  for (let eventType of Object.keys(handlers)) {
    //@ts-ignore
    socket.on(eventType, handlers[eventType]);
  }
}

export function unbindSocketHandlers(socket: SCServerSocket, handlers: EventHandlersObj) {
  for (let eventType of Object.keys(handlers)) {
    socket.off(eventType, handlers[eventType]);
    delete handlers[eventType];
  }
}
