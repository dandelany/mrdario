import * as t from "io-ts";

export * from "./scores";

// user

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

// lobby

export enum LobbyMessageType {
  Join = "join",
  Leave = "leave"
}

export const TLobbyUser = t.type({
  name: t.string,
  id: t.string,
  joined: t.number
});
export type LobbyUser = t.TypeOf<typeof TLobbyUser>;

export const TLobbyResponse = t.array(TLobbyUser);
export type LobbyResponse = t.TypeOf<typeof TLobbyResponse>;

export const TLobbyJoinMessage = t.type({
  type: t.literal(LobbyMessageType.Join),
  payload: TLobbyUser
});
export type LobbyJoinMessage = t.TypeOf<typeof TLobbyJoinMessage>;

export const TLobbyLeaveMessage = t.type({
  type: t.literal(LobbyMessageType.Leave),
  payload: TLobbyUser
});
export type LobbyLeaveMessage = t.TypeOf<typeof TLobbyLeaveMessage>;

export const TLobbyMessage = t.taggedUnion("type", [TLobbyJoinMessage, TLobbyLeaveMessage]);
export type LobbyMessage = t.TypeOf<typeof TLobbyMessage>;
