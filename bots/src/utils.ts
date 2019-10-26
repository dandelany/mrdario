import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";

export const A_JIFFY = 25;
export const TWO_SHAKES = 100;

export async function expectToRejectNotAuthenticated(promise: Promise<any>) {
  return await expect(promise).rejects.toThrow(/not authenticated/i);
}

export function sleep(time: number): Promise<number> {
  return new Promise(resolve => setTimeout(resolve, time));
}

export function toDecodeWith<DecodedType>(data: any, codec: t.Type<DecodedType>): jest.CustomMatcherResult {
  const result = codec.decode(data);
  const pass = result.isRight();
  //@ts-ignore
  const that: jest.MatcherUtils = this;
  const options = {
    isNot: that.isNot,
    //@ts-ignore
    promise: that.promise
  };

  return {
    pass,
    message: pass
      ? () =>
          //@ts-ignore
          that.utils.matcherHint("toDecodeWith", "data", "codec", options) +
          `\n\n` +
          `Decoded successfully (expected not to)\n` +
          `Data: ${JSON.stringify(data)}\n` +
          `Decoded value: ${JSON.stringify(result.value)}`
      : () =>
          //@ts-ignore
          that.utils.matcherHint("toDecodeWith", "data", "codec", options) +
          `\n\n` +
          `Failed to decode data with codec\n` +
          `${PathReporter.report(result)[0]}\n` +
          `Data: ${JSON.stringify(data)}\n`
  };
}
