import * as t from "io-ts";

// Types associated with the Lobby API

export const TLobbyUser = t.type({
  name: t.string,
  id: t.string,
  joined: t.number
});
export type LobbyUser = t.TypeOf<typeof TLobbyUser>;

export const TLobbyResponse = t.array(TLobbyUser);
export type LobbyResponse = t.TypeOf<typeof TLobbyResponse>;

// types of messages sent on the lobby channel

export enum LobbyMessageType {
  Join = "join",
  Leave = "leave",
  ChatIn = "chatIn",
  ChatOut = "chatOut"
}

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

export const TLobbyChatMessageIn = t.type({
  type: t.literal(LobbyMessageType.ChatIn),
  payload: t.string
});
export type LobbyChatMessageIn = t.TypeOf<typeof TLobbyChatMessageIn>;

export const TLobbyChatMessageOut = t.type({
  type: t.literal(LobbyMessageType.ChatOut),
  payload: t.string,
  userName: t.string
});
export type LobbyChatMessageOut = t.TypeOf<typeof TLobbyChatMessageOut>;

export const TLobbyMessage = t.taggedUnion("type", [
  TLobbyJoinMessage,
  TLobbyLeaveMessage,
  TLobbyChatMessageIn,
  TLobbyChatMessageOut
]);
export type LobbyMessage = t.TypeOf<typeof TLobbyMessage>;
