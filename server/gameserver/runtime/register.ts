import type { AppAuthToken } from "mrdario-core/api";
import { authAndValidateRequest, type SocketResponder, validateRequest } from "../utils/index.js";
import { requireAuthMiddleware, validateChannelRequest } from "../utils/middleware.js";
import { createClientConnection } from "./socketcluster.js";
import type {
  ServerModuleDefinition,
  ServerServices,
  ModuleContext,
  AuthenticatedModuleContext,
  TopicDefinition
} from "./types.js";

export function attachModule(module: ServerModuleDefinition, ctx: ModuleContext): void {
  // per-connection wiring for a module definition.
  // this is the place where transport-agnostic module intent gets bound onto a live connection.
  module.onConnect?.(ctx);

  for (const procedure of module.procedures ?? []) {
    if (procedure.auth === "required") {
      ctx.connection.on(
        procedure.eventType,
        authAndValidateRequest(ctx.connection.socket, procedure.codec, (request, authToken, respond) => {
          void runAuthenticatedProcedure(procedure.handler, ctx, authToken, request, respond);
        })
      );
    } else {
      ctx.connection.on(
        procedure.eventType,
        validateRequest(procedure.codec, (request, respond) => {
          void runProcedure(procedure.handler, ctx, request, respond);
        })
      );
    }
  }
}

export function registerModuleTopics(module: ServerModuleDefinition, services: ServerServices): void {
  // topic middleware is registered once per module, not per connection.
  for (const topic of module.topics ?? []) {
    registerTopic(topic, services);
  }
}

async function runProcedure<RequestType, ResponseType>(
  handler: (ctx: ModuleContext, request: RequestType) => Promise<ResponseType> | ResponseType,
  ctx: ModuleContext,
  request: RequestType,
  respond: SocketResponder<ResponseType>
): Promise<void> {
  try {
    const response = await handler(ctx, request);
    respond(null, response as ResponseType);
  } catch (error) {
    respond(error instanceof Error ? error : String(error), null);
  }
}

async function runAuthenticatedProcedure<RequestType, ResponseType>(
  handler: (
    ctx: AuthenticatedModuleContext,
    request: RequestType
  ) => Promise<ResponseType> | ResponseType,
  ctx: ModuleContext,
  authToken: AppAuthToken,
  request: RequestType,
  respond: SocketResponder<ResponseType>
): Promise<void> {
  const authCtx: AuthenticatedModuleContext = { ...ctx, authToken };
  return runProcedure(handler as any, authCtx as any, request, respond);
}

export function createModuleContext(connection: ModuleContext["connection"], services: ServerServices): ModuleContext {
  return {
    connection,
    services
  };
}

function registerTopic(topic: TopicDefinition, services: ServerServices): void {
  // inbound publish path:
  // auth/codec validation first, then optional payload transform.
  services.transport.onPublishIn((req, next) => {
    if (req.channel !== topic.name) {
      next();
      return;
    }

    const run = () =>
      validateChannelRequest(
        req,
        topic.codec,
        async validReq => {
          try {
            if (topic.onPublishIn) {
              const connection = createClientConnection(validReq.socket);
              const ctx = createModuleContext(connection, services);
              const nextPayload =
                topic.auth === "required"
                  ? await topic.onPublishIn({ ...ctx, authToken: connection.authToken! }, validReq.validData)
                  : await topic.onPublishIn(ctx, validReq.validData);
              if (typeof nextPayload !== "undefined") {
                req.data = nextPayload;
              }
            }
            next();
          } catch (error) {
            next(error instanceof Error ? error : new Error(String(error)));
          }
        },
        error => next(error)
      );

    if (topic.auth === "required") {
      requireAuthMiddleware(req, error => {
        if (error) next(error);
        else void run();
      });
    } else {
      void run();
    }
  });

  if (topic.onPublishOut) {
    // outbound publish path:
    // currently only used for observation/logging side effects, not payload mutation.
    services.transport.onPublishOut((req, next) => {
      if (req.channel !== topic.name) {
        next();
        return;
      }

      const run = () =>
        validateChannelRequest(
          req,
          topic.codec,
          async validReq => {
            try {
              const connection = createClientConnection(validReq.socket);
              const ctx = createModuleContext(connection, services);
              if (topic.auth === "required") {
                await topic.onPublishOut!({ ...ctx, authToken: connection.authToken! }, validReq.validData);
              } else {
                await topic.onPublishOut!(ctx, validReq.validData);
              }
              next();
            } catch (error) {
              next(error instanceof Error ? error : new Error(String(error)));
            }
          },
          error => next(error)
        );

      if (topic.auth === "required") {
        requireAuthMiddleware(req, error => {
          if (error) next(error);
          else void run();
        });
      } else {
        void run();
      }
    });
  }
}
