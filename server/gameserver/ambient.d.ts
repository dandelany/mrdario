declare module "@ircam/sync/server/index.js" {
  export type ReceiveFunction = (callback: (pingId: number, clientPingTime: number) => void) => void;
  export type SendFunction = (
    pingId: number,
    clientPingTime: number,
    serverPingTime: number,
    serverPongTime: number
  ) => void;

  export default class SyncServer {
    constructor(getTimeFunction: () => number);
    start(send: SendFunction, receive: ReceiveFunction): void;
  }
}
