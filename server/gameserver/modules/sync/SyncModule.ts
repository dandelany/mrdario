import SyncServerModule, { ReceiveFunction, SendFunction } from "@ircam/sync/server/index.js";
import { LegacyCompatServer, LegacyCompatSocket } from "../../compat.js";

const SyncServer = (SyncServerModule as any).default ?? SyncServerModule;

const startTime = process.hrtime();
export const getTimeFunction = () => {
  const now = process.hrtime(startTime);
  return now[0] + now[1] * 1e-9;
};

// Module which maintains a synchronized clock between the client and server
// using @ircam/sync library
// todo - be less aggressive, don't send as many messages.

export class SyncModule {
  public syncServer: any;
  scServer: LegacyCompatServer;

  constructor(scServer: LegacyCompatServer) {
    this.scServer = scServer;
    this.syncServer = new SyncServer(getTimeFunction);
  }
  public handleConnect(socket: LegacyCompatSocket) {
    const syncReceive: ReceiveFunction = callback => {
      //@ts-ignore
      socket.on('sPing', (data: [number, number]) => {
        const [pingId, clientPingTime] = data;
        console.log(`[ping] - pingId: %s, clientPingTime: %s`, clientPingTime);
        callback(pingId, clientPingTime);
      });
    };

    const syncSend: SendFunction = (pingId, clientPingTime, serverPingTime, serverPongTime) => {
      console.log(`[pong] - id: %s, clientPingTime: %s, serverPingTime: %s, serverPongTime: %s`,
        pingId, clientPingTime, serverPingTime, serverPongTime);
      socket.emit('sPong', [pingId, clientPingTime, serverPingTime, serverPongTime]);
    };

    this.syncServer.start(syncSend, syncReceive);
  }
}
