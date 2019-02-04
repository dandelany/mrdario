import { SCServerSocket } from "socketcluster-server";
import {get} from "lodash";

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

export function logWithTime(...args: any) {
  // console.log(format(new Date(), 'MM-DD-YYYY HH:mm:ss'), ...args);
  // todo install date-fns
  console.log(...args);
}