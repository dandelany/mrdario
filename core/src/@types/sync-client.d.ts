declare module "@ircam/sync/client" {
  class SyncClient {
    constructor(getTimeFunction: SyncClient.GetTimeFunction, options?: SyncClient.ClientOptions);
    getSyncTime(localTime?: number): number;
    start(
      sendFunction: SyncClient.SendFunction,
      receiveFunction: SyncClient.ReceiveFunction,
      reportFunction: SyncClient.ReportFunction
    ): void;
  }
  export = SyncClient;
}

declare namespace SyncClient {
  type GetTimeFunction = () => number;
  type SendFunction = (pingId: number, clientPingTime: number) => void;

  type ReceiveCallback = (
    pingId: number,
    clientPingTime: number,
    serverPingTime: number,
    serverPongTime: number
  ) => void;
  type ReceiveFunction = (receiveCallback: ReceiveCallback) => void;

  interface Report {
    status: string;
    statusDuration: number;
    timeOffset: number;
    frequencyRatio: number;
    connection: string;
    connectionDuration: number;
    connectionTimeOut: number;
    travelDuration: number;
    travelDurationMin: number;
    travelDurationMax: number;
  }
  type ReportFunction = (report: Report) => void;

  interface ClientOptions {
    estimationMonotonicity?: boolean;
    estimationStability?: number;
    pingTimeOutDelay?: {min: number, max: number};
    pingSeriesIterations?: number;
    pingSeriesPeriod?: number;
    pingSeriesDelay?: {min: number, max: number};
    longTermDataTrainingDuration?: number;
    longTermDataDuration?: number;
  }

  // todo options object
  type SyncClientOptions = { [K in string]: any };
}
