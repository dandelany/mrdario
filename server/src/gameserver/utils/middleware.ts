import {
  nextMiddlewareFunction,
  HandshakeSCRequest,
  AuthenticateRequest,
  SubscribeRequest,
  PublishInRequest,
  PublishOutRequest,
  EmitRequest
} from "socketcluster-server/scserver";
import * as t from "io-ts";
import { SCServer } from "socketcluster-server";
import { PathReporter } from "io-ts/lib/PathReporter";
import { hasValidAuthToken, NOT_AUTHENTICATED_MESSAGE } from "./auth";
import { SCMiddlewareType } from "./index";
import { isRight } from "fp-ts/lib/Either";

export type SCServerRequest =
  | AuthenticateRequest
  | HandshakeSCRequest
  | SubscribeRequest
  | PublishInRequest
  | PublishOutRequest
  | EmitRequest;
export type SCChannelRequest = PublishInRequest | PublishOutRequest;

export type BaseMiddleware<ReqType extends SCServerRequest> = (
  req: ReqType,
  next: nextMiddlewareFunction
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
  next: nextMiddlewareFunction
) => void;;


export type BaseValidatedChannelMiddleware<ReqType extends SCChannelRequest, DataType = any> = (
  // req: ReqWithDataType<ReqType, DataType>,
  req: ReqType & { validData: DataType },
  next: nextMiddlewareFunction
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

export type ValidatedChannelMiddleware = ValidatedPublishInMiddleware | ValidatedPublishOutMiddleware;

export type ValidatedChannelMiddlewareConfig<DataType = any> =
  | { type: SCMiddlewareType.MIDDLEWARE_PUBLISH_IN; middleware: ValidatedPublishInMiddleware<DataType> }
  | { type: SCMiddlewareType.MIDDLEWARE_PUBLISH_OUT; middleware: ValidatedPublishOutMiddleware<DataType> };

// export type MakeChainable<T> = T extends (req: infer ReqType, next: SCServer.nextMiddlewareFunction) => void
export type MakeChainable<T> = T extends BaseMiddleware<infer ReqType>
  ? (req: ReqType, next: SCServer.nextMiddlewareFunction, end: SCServer.nextMiddlewareFunction) => void
  : never;

// experiment
export type PrependParameter<T, ParamType> = T extends (...args: infer T) => any
  ? (param: ParamType, ...args: T) => any
  : never;

function getChainedNext<ReqType extends SCChannelRequest>(
  i: number,
  middlewares: MakeChainable<BaseMiddleware<ReqType>>[],
  req: ReqType,
  next: SCServer.nextMiddlewareFunction
) {
  if (i + 1 === middlewares.length) {
    return next;
  } else {
    return function proxiedNext(error?: string | true | Error | undefined) {
      // if there is an error, stop chaining and call next()
      if (error) next(error);
      // otherwise, call the next middleware
      const nextMiddleware = middlewares[i + 1];
      nextMiddleware(req, getChainedNext(i + 1, middlewares, req, next), next);
    };
  }
}

export function chainMiddleware<ReqType extends SCChannelRequest>(
  middlewares: MakeChainable<BaseMiddleware<ReqType>>[]
): BaseMiddleware<ReqType> {
  return function chainedMiddleware(req: ReqType, next: SCServer.nextMiddlewareFunction): void {
    // call each middleware in list in order
    // each gets a proxied next function which calls the real next(error) if an error is returned,
    // otherwise calls the next middleware in the list
    if (!middlewares.length) {
      next();
    } else {
      // todo rewrite to not use recursion?
      middlewares[0](req, getChainedNext(0, middlewares, req, next), next);
    }
  };
}

export function requireAuthMiddleware(req: SCChannelRequest, next: nextMiddlewareFunction): void {
  if (!hasValidAuthToken(req.socket)) {
    next(new Error(NOT_AUTHENTICATED_MESSAGE));
  } else {
    next();
  }
}

export function getValidateMiddleware<ExpectedType>(
  messageCodec: t.Type<ExpectedType>
): ValidatedChannelMiddleware {
  return function validateMiddleware(req: SCChannelRequest, next: SCServer.nextMiddlewareFunction): void {
    const decoded = messageCodec.decode(req.data);
    if (isRight(decoded)) {
      next();
    } else {
      next(new Error(PathReporter.report(decoded)[0]));
    }
  };
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
