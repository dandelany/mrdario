import * as t from "io-ts";

import {LobbyMessageType} from './constants';

// Types associated with the Lobby API

export const TLobbyUser = t.type({
  name: t.string,
  id: t.string,
  joined: t.number
});
export type LobbyUser = t.TypeOf<typeof TLobbyUser>;

// types of event requests/responses emitted by the lobby module

export const TLobbyJoinRequest = t.null;
export type LobbyJoinRequest = t.TypeOf<typeof TLobbyJoinResponse>;

export const TLobbyJoinResponse = t.array(TLobbyUser);
export type LobbyJoinResponse = t.TypeOf<typeof TLobbyJoinResponse>;

export const TLobbyLeaveResponse = t.null;
export type LobbyLeaveResponse = t.TypeOf<typeof TLobbyLeaveResponse>;

// todo mapping from LobbyEventTypes to their response request types?

// types of messages sent on the lobby channel

export const TLobbyJoinMessage = t.type({
  type: t.literal(LobbyMessageType.Join),
  payload: TLobbyUser
}, 'LobbyJoinMessage');
export type LobbyJoinMessage = t.TypeOf<typeof TLobbyJoinMessage>;

export const TLobbyLeaveMessage = t.type({
  type: t.literal(LobbyMessageType.Leave),
  payload: TLobbyUser
}, 'LobbyLeaveMessage');
export type LobbyLeaveMessage = t.TypeOf<typeof TLobbyLeaveMessage>;

export const TLobbyChatMessageIn = t.type({
  type: t.literal(LobbyMessageType.ChatIn),
  payload: t.string
}, 'LobbyChatMessageIn');
export type LobbyChatMessageIn = t.TypeOf<typeof TLobbyChatMessageIn>;

export const TLobbyChatMessageOut = t.type({
  type: t.literal(LobbyMessageType.ChatOut),
  payload: t.string,
  userName: t.string
}, 'LobbyChatMessageOut');
export type LobbyChatMessageOut = t.TypeOf<typeof TLobbyChatMessageOut>;

export const TLobbyMessage = t.union([
  TLobbyJoinMessage,
  TLobbyLeaveMessage,
  TLobbyChatMessageIn,
  TLobbyChatMessageOut
]);
export type LobbyMessage = t.TypeOf<typeof TLobbyMessage>;
