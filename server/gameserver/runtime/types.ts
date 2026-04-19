import type { RedisClient } from "redis";
import type * as t from "io-ts";
import type { AppAuthToken } from "mrdario-core/api";

// these are the transport-facing types that gameserver modules are allowed to know about.
// the goal is to keep module code stable even if we swap socketcluster out later.

export type TransportNextFunction = (error?: string | true | Error | undefined) => void;

export interface TransportSocket {
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

export type PublishInRequest = {
  socket: TransportSocket;
  channel: string;
  data: unknown;
};

export type PublishOutRequest = {
  socket: TransportSocket;
  channel: string;
  data: unknown;
};

export type TopicPublishMiddleware<ReqType extends PublishInRequest | PublishOutRequest> = (
  req: ReqType,
  next: TransportNextFunction
) => void;

export interface ClientConnection {
  readonly id: string;
  readonly socket: TransportSocket;
  readonly authToken?: AppAuthToken;
  // server -> client push
  send(eventName: string, payload: unknown): void;
  setAuthToken(token: AppAuthToken): void;
  clearAuthToken(): void;
  // intentionally generic for now, even though event/procedure/lifecycle should probably
  // become distinct concepts later.
  on(eventName: string, handler: (...args: any[]) => void): void;
  off(eventName: string, handler: (...args: any[]) => void): void;
}

export interface TransportRuntime {
  // topic-style publish used by lobby/game broadcast flows
  publish(topic: string, payload: unknown): void;
  onPublishIn(middleware: TopicPublishMiddleware<PublishInRequest>): void;
  onPublishOut(middleware: TopicPublishMiddleware<PublishOutRequest>): void;
  // connection lifecycle entrypoint used by GameServer
  onConnection(handler: (connection: ClientConnection) => void): void;
}

export interface ServerServices {
  redisClient: RedisClient;
  transport: TransportRuntime;
}

export interface ModuleContext {
  connection: ClientConnection;
  services: ServerServices;
}

export interface AuthenticatedModuleContext extends ModuleContext {
  authToken: AppAuthToken;
}

export type NoAuthProcedure<RequestType, ResponseType> = {
  auth: "none";
  eventType: string;
  codec: t.Type<RequestType>;
  handler: (ctx: ModuleContext, request: RequestType) => Promise<ResponseType> | ResponseType;
};

export type AuthenticatedProcedure<RequestType, ResponseType> = {
  auth: "required";
  eventType: string;
  codec: t.Type<RequestType>;
  handler: (
    ctx: AuthenticatedModuleContext,
    request: RequestType
  ) => Promise<ResponseType> | ResponseType;
};

export type ProcedureDefinition<RequestType = any, ResponseType = any> =
  | NoAuthProcedure<RequestType, ResponseType>
  | AuthenticatedProcedure<RequestType, ResponseType>;

export type TopicContext = ModuleContext;
export type AuthenticatedTopicContext = AuthenticatedModuleContext;

export type NoAuthTopic<DataType> = {
  auth: "none";
  name: string;
  codec: t.Type<DataType>;
  onPublishIn?: (ctx: TopicContext, payload: DataType) => DataType | Promise<DataType>;
  onPublishOut?: (ctx: TopicContext, payload: DataType) => void | Promise<void>;
};

export type AuthenticatedTopic<DataType> = {
  auth: "required";
  name: string;
  codec: t.Type<DataType>;
  onPublishIn?: (
    ctx: AuthenticatedTopicContext,
    payload: DataType
  ) => DataType | Promise<DataType>;
  onPublishOut?: (
    ctx: AuthenticatedTopicContext,
    payload: DataType
  ) => void | Promise<void>;
};

export type TopicDefinition<DataType = any> = NoAuthTopic<DataType> | AuthenticatedTopic<DataType>;

export interface ServerModuleDefinition {
  name: string;
  // connection-local setup such as lifecycle listeners
  onConnect?(ctx: ModuleContext): void;
  // request/response style handlers
  procedures?: ProcedureDefinition[];
  // topic auth/validation/transform hooks
  topics?: TopicDefinition[];
}

export function defineServerModule(definition: ServerModuleDefinition): ServerModuleDefinition {
  return definition;
}
