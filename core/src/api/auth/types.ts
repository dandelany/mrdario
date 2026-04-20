import * as t from "io-ts";

export const TAppAuthToken = t.type({
  id: t.string,
  name: t.string
});
export type AppAuthToken = t.TypeOf<typeof TAppAuthToken>;

export const TUser = t.type({
  id: t.string,
  name: t.string
});
export type User = t.TypeOf<typeof TUser>;

export const TClientAuthenticatedUser = t.intersection([TUser, t.type({ token: t.string })]);
export type ClientAuthenticatedUser = t.TypeOf<typeof TClientAuthenticatedUser>;

export const TServerUser = t.intersection([
  TUser,
  t.type({ tokenHash: t.string }),
  t.partial({ socketId: t.string })
]);
export type ServerUser = t.TypeOf<typeof TServerUser>;

// login
export const TLoginRequest = t.type({
  name: t.string,
  id: t.union([t.string, t.undefined]),
  token: t.union([t.string, t.undefined])
});
export type LoginRequest = t.TypeOf<typeof TLoginRequest>;
