import { SocketResponder } from "./index";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import { isRight } from "fp-ts/lib/Either";

export function respondInvalidData(respond: SocketResponder<any>, message: string = ""): void {
  respond(`Invalid data sent with request: ${message}`, null);
}

export function validateSocketData<RequestType, ResponseType = any>(
  data: unknown,
  TCodec: t.Type<RequestType>,
  respond: SocketResponder<ResponseType>,
  successCallback: (data: RequestType, respond: SocketResponder<ResponseType>) => void,
  failureCallback: (respond: SocketResponder<any>, message: string) => void = respondInvalidData
): void {
  const decoded = TCodec.decode(data);
  if (isRight(decoded)) {
    successCallback(decoded.right, respond);
  } else {
    failureCallback(respond, PathReporter.report(decoded)[0]);
  }
}

export function validateRequest<RequestType, ResponseType = any>(
  codec: t.Type<RequestType>,
  successCallback: (data: RequestType, respond: SocketResponder<ResponseType>) => void,
  failureCallback: (respond: SocketResponder<any>, message: string) => void = respondInvalidData
): (data: unknown, respond: SocketResponder<ResponseType>) => void {
  return function validateRequestHandler(data: unknown, respond: SocketResponder<ResponseType>) {
    validateSocketData<RequestType, ResponseType>(data, codec, respond, successCallback, failureCallback);
  };
}
