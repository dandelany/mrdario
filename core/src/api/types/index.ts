import * as t from "io-ts";

export * from "./scores";

export const TLobby = t.array(
  t.type({
    name: t.string,
    id: t.string,
    joined: t.number
  })
);
export type Lobby = t.TypeOf<typeof TLobby>;
