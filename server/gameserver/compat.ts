import type { RedisClient } from "redis";

export type LegacyNextFunction = (error?: string | true | Error | undefined) => void;

export interface LegacyCompatSocket {
  id: string;
  state: string;
  request: any;
  remoteAddress?: string;
  remoteFamily?: string;
  remotePort?: number;
  authToken?: any;
  authState?: string;
  AUTHENTICATED?: string;
  emit(eventName: string, data?: any): any;
  setAuthToken(token: any, options?: any): any;
  deauthenticate(): any;
  on(eventName: string, handler: (...args: any[]) => void): void;
  off(eventName: string, handler: (...args: any[]) => void): void;
}

export interface LegacyCompatServer {
  MIDDLEWARE_PUBLISH_IN: "publishIn";
  MIDDLEWARE_PUBLISH_OUT: "publishOut";
  exchange: {
    publish(channelName: string, data: any, callback?: (error?: Error) => void): any;
    transmitPublish(channelName: string, data: any): any;
    invokePublish(channelName: string, data: any): any;
  };
  addMiddleware(
    type: "publishIn" | "publishOut",
    middleware: (req: any, next: LegacyNextFunction) => void
  ): void;
  on(eventName: string, handler: (...args: any[]) => void): void;
}

export interface ServerModuleOptions {
  scServer: LegacyCompatServer;
  rClient: RedisClient;
}
