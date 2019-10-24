import { SocketResponder } from "./index";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";

export function respondInvalidData(respond: SocketResponder<any>, message: string = ""): void {
  respond(`Invalid data sent with request: ${message}`, null);
}

export function validateSocketData<RequestType>(
  data: unknown,
  TCodec: t.Type<RequestType>,
  respond: SocketResponder<any>,
  successCallback: (data: RequestType, respond: SocketResponder<any>) => void,
  failureCallback: (respond: SocketResponder<any>, message: string) => void = respondInvalidData
): void {
  const decoded = TCodec.decode(data);
  if (decoded.isRight()) {
    successCallback(decoded.value, respond);
  } else {
    failureCallback(respond, PathReporter.report(decoded)[0]);
  }
}
