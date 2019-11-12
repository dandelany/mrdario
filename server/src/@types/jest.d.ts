// import * as t from "io-ts";

declare namespace jest {
  interface Matchers<R> {
    toDecodeWith: (codec: import("io-ts").Type<any>) => void;
  }
}
