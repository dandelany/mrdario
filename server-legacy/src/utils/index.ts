import _ from "lodash";
import { SCServerSocket } from "socketcluster-server";
import randomWord from "random-word-by-length";

// export * from "./socket";

// todo use or delete these?
export function makeGameToken() {
  return Math.round(Math.random() * 1000000).toString(36);
}

export function initSingleGame() {
  // const id = uuid.v4();
  const id = _.times(3, () => _.capitalize(randomWord(8))).join("");
  const token = makeGameToken();
  return { id, token };
}

function getClientIpAddress(socket: SCServerSocket) {
  return _.get(socket, "request.headers.x-forwarded-for", socket.remoteAddress);
}

export function socketInfoStr(socket: SCServerSocket) {
  return JSON.stringify(getSocketInfo(socket));
}

export function getSocketInfo(socket: SCServerSocket) {
  return {
    state: socket.state,
    ip: getClientIpAddress(socket),
    id: socket.id,
    ua: _.get(socket, "request.headers.user-agent", ""),
    time: Number(new Date())
  };
}
