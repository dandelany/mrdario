import SyncServerModule, { ReceiveFunction, SendFunction } from "@ircam/sync/server/index.js";

import { defineServerModule } from "../../runtime/types.js";

const SyncServer = (SyncServerModule as any).default ?? SyncServerModule;

const startTime = process.hrtime();
export const getTimeFunction = () => {
  const now = process.hrtime(startTime);
  return now[0] + now[1] * 1e-9;
};

const syncServer = new SyncServer(getTimeFunction);

export function createSyncModule() {
  return defineServerModule({
    name: "sync",
    onConnect: ctx => {
      const syncReceive: ReceiveFunction = callback => {
        ctx.connection.on("sPing", (data: [number, number]) => {
          const [pingId, clientPingTime] = data;
          console.log(`[ping] - pingid: %s, clientpingtime: %s`, clientPingTime);
          callback(pingId, clientPingTime);
        });
      };

      const syncSend: SendFunction = (pingId, clientPingTime, serverPingTime, serverPongTime) => {
        console.log(
          `[pong] - id: %s, clientpingtime: %s, serverpingtime: %s, serverpongtime: %s`,
          pingId,
          clientPingTime,
          serverPingTime,
          serverPongTime
        );
        ctx.connection.send("sPong", [pingId, clientPingTime, serverPingTime, serverPongTime]);
      };

      syncServer.start(syncSend, syncReceive);
    }
  });
}
