import SyncClient from "@ircam/sync/client";
import { SCClientSocket } from "socketcluster-client";

export function setupSyncClient(
  socket: SCClientSocket,
  getTime: SyncClient.GetTimeFunction,
  options?: SyncClient.ClientOptions | undefined
): SyncClient {
  const syncSend = (pingId: number, clientPingTime: number) => {
    // const request = new Float64Array(3);
    // request[0] = 0; // this is a ping
    // request[1] = pingId;
    // request[2] = clientPingTime;
    const request = [pingId, clientPingTime];
    console.log(`[ping] - id: ${pingId}, pingTime: ${clientPingTime}`);

    socket.emit("sPing", request);
  };

  const syncReceive: SyncClient.ReceiveFunction = callback => {
    socket.on("sPong", (response: any) => {
      if (response) {
        const [pingId, clientPingTime, serverPingTime, serverPongTime] = response;

        console.log(
          `[pong] - id: %s, clientPingTime: %s, serverPingTime: %s, serverPongTime: %s`,
          pingId,
          clientPingTime,
          serverPingTime,
          serverPongTime
        );

        callback(pingId, clientPingTime, serverPingTime, serverPongTime);
      }
    });
  };

  const syncReport: SyncClient.ReportFunction = report => {
    console.log(report);
  };

  const syncClient = new SyncClient(getTime, options);
  syncClient.start(syncSend, syncReceive, syncReport);
  return syncClient;
}
