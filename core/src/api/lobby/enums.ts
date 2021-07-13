export const LOBBY_CHANNEL_NAME = "mrdario-lobby";

export enum LobbyEventType {
  Join = "joinLobby",
  Leave = "leaveLobby",
}

export enum LobbyMessageType {
  Join = "join",
  Leave = "leave",
  ChatIn = "chatIn",
  ChatOut = "chatOut"
}
