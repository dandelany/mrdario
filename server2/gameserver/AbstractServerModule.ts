import { SCServer, SCServerSocket } from "socketcluster-server";
import * as t from "io-ts";
import { AppAuthToken } from "mrdario-core/lib/api";
import { authAndValidateRequest, SocketResponder, validateRequest } from "./utils";
import {
  PublishOutMiddlewareWithDataType,
  PublishOutRequestWithDataType,
  requireAuthMiddleware,
  validateChannelRequest,
  ValidatedChannelMiddlewareConfig,
  ValidatedPublishInMiddleware
} from "./utils/middleware";
import { RedisClient } from "redis";

export interface ServerModuleOptions {
  scServer: SCServer;
  rClient: RedisClient;
}

export abstract class AbstractServerModule {
  scServer: SCServer;
  rClient: RedisClient;

  constructor(options: ServerModuleOptions) {
    this.scServer = options.scServer;
    this.rClient = options.rClient;
  }

  public abstract handleConnect(socket: SCServerSocket): void;

  protected bindListener<RequestType, ResponseType>(
    socket: SCServerSocket,
    options: {
      eventType: string;
      codec: t.Type<RequestType>;
      listener: (data: RequestType, authToken: AppAuthToken, respond: SocketResponder<ResponseType>) => void;
    }
  ) {
    const { eventType, codec, listener } = options;
    socket.on(eventType, authAndValidateRequest<RequestType, ResponseType>(socket, codec, listener));
  }

  protected bindNoAuthListener<RequestType, ResponseType>(
    socket: SCServerSocket,
    options: {
      eventType: string;
      codec: t.Type<RequestType>;
      listener: (data: RequestType, respond: SocketResponder<ResponseType>) => void;
    }
  ) {
    const { eventType, codec, listener } = options;
    socket.on(eventType, validateRequest(codec, listener));
  }

  protected addMiddleware(channels: ModuleChannelConfig<any>[]) {
    channels.forEach(channelConfig => {
      const { messageCodec, publishInMiddleware } = channelConfig;
      this.scServer.addMiddleware(this.scServer.MIDDLEWARE_PUBLISH_IN, (req, next) => {
        // todo match regex
        if (req.channel === channelConfig.name) {
          requireAuthMiddleware(req, (e?: string | true | Error | undefined) => {
            if (e) next(e);
            else {
              validateChannelRequest(
                req,
                messageCodec,
                validReq => {
                  if (publishInMiddleware) publishInMiddleware(validReq, next);
                  else next();
                },
                (e: Error) => next(e)
              );
            }
          });
        } else {
          next();
        }
      });

      if (channelConfig.publishOutMiddleware) {
        const { publishOutMiddleware } = channelConfig;

        this.scServer.addMiddleware(this.scServer.MIDDLEWARE_PUBLISH_OUT, (req, next) => {
          if (req.channel === channelConfig.name) {
            publishOutMiddleware(req as PublishOutRequestWithDataType<t.TypeOf<typeof messageCodec>>, next);
          } else next();
        });
      }
    });
  }
}

export type ModuleConfig = {
  channels: ModuleChannelConfig<any>[];
};
export type ModuleChannelConfig<DataType> = {
  name: string; // todo allow regex and match function
  requireAuth: boolean;
  messageCodec: t.Type<DataType>;
  middlewares?: ValidatedChannelMiddlewareConfig<DataType>[];
  publishInMiddleware?: ValidatedPublishInMiddleware<DataType>;
  publishOutMiddleware?: PublishOutMiddlewareWithDataType<DataType>;
  // middleware: PublishInMiddleware<DataType>;
};

// the only way i can figure out to infer Datatype from the codec type
export function makeChannelConfig<DataType>(
  // codec: t.Type<DataType>,
  config: ModuleChannelConfig<DataType>
): ModuleChannelConfig<DataType> {
  return config;
}
