declare module "@ircam/sync/server" {
  class SyncServer {
    constructor(getTimeFunction: SyncServer.GetTimeFunction);
    start(
      sendFunction: SyncServer.SendFunction,
      receiveFunction: SyncServer.ReceiveFunction
    ): void;
    getSyncTime(localTime?: number): number;
    getLocalTime(syncTime?: number): number;

  }
  export = SyncServer;
}

declare namespace SyncServer {
  type GetTimeFunction = () => number;

  type SendFunction = (
    pingId: number,
    clientPingTime: number,
    serverPingTime: number,
    serverPongTime: number
  ) => void;

  type ReceiveCallback = (
    pingId: number,
    clientPingTime: number
  ) => void;
  type ReceiveFunction = (receiveCallback: ReceiveCallback) => void;

}
