import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter.js";
import { hasValidAuthToken, NOT_AUTHENTICATED_MESSAGE } from "./auth.js";
import { isRight } from "fp-ts/lib/Either.js";
import {
  PublishInRequest,
  PublishOutRequest,
  TransportNextFunction,
  TransportSocket
} from "../runtime/types.js";

export type SCServerRequest = {
  socket: TransportSocket;
  channel?: string;
  data?: unknown;
};
export type AuthenticateRequest = SCServerRequest;
export type HandshakeSCRequest = SCServerRequest;
export type SubscribeRequest = SCServerRequest;
export type EmitRequest = SCServerRequest;

export type SCChannelRequest = PublishInRequest | PublishOutRequest;

export type BaseMiddleware<ReqType extends SCServerRequest> = (
  req: ReqType,
  next: TransportNextFunction
) => void;

export type PublishInMiddleware = BaseMiddleware<PublishInRequest>;
export type PublishOutMiddleware = BaseMiddleware<PublishOutRequest>;

export type ValidatedChannelRequest<ReqType extends SCChannelRequest, DataType = any> = ReqType & {
  validData: DataType;
};

export type PublishOutRequestWithDataType<DataType> = Omit<PublishOutRequest, 'data'> & {data: DataType};
// export type PublishOutMiddlewareWithDataType<DataType> = BaseMiddleware<PublishOutRequestWithDataType<DataType>>;
export type PublishOutMiddlewareWithDataType<DataType> = (
  req: Omit<PublishOutRequest, 'data'> & {data: DataType},
  next: TransportNextFunction
) => void;


export type BaseValidatedChannelMiddleware<ReqType extends SCChannelRequest, DataType = any> = (
  // req: ReqWithDataType<ReqType, DataType>,
  req: ReqType & { validData: DataType },
  next: TransportNextFunction
) => // data: DataType
void;

export type ValidatedPublishInMiddleware<DataType = any> = BaseValidatedChannelMiddleware<
  PublishInRequest,
  DataType
>;
export type ValidatedPublishOutMiddleware<DataType = any> = BaseValidatedChannelMiddleware<
  PublishOutRequest,
  DataType
>;

export function requireAuthMiddleware(req: SCChannelRequest, next: TransportNextFunction): void {
  if (!hasValidAuthToken(req.socket)) {
    next(new Error(NOT_AUTHENTICATED_MESSAGE));
  } else {
    next();
  }
}

export function validateChannelRequest<ReqType extends SCChannelRequest, DataType>(
  req: ReqType,
  codec: t.Type<DataType>,
  callback: (validReq: ValidatedChannelRequest<ReqType, DataType>) => void,
  failCallback: (error: Error) => void = (e) => { throw e; }
): void {
  const decoded = codec.decode(req.data);

  if (isRight(decoded)) {
    (req as any).validData = decoded.right;
    const validReq = req as ValidatedChannelRequest<ReqType, DataType>;
    validReq.validData = decoded.right;
    callback(validReq);
  } else {
    failCallback(new Error(PathReporter.report(decoded)[0]));
  }
}
