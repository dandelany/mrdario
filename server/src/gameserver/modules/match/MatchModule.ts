import { SCServer, SCServerSocket } from "socketcluster-server";
import { Match } from "mrdario-core/lib/api/types/match";
import uuid from "uuid/v4";
import { AppAuthToken, hasValidAuthToken } from "mrdario-core/lib/api/types";


interface Responder<T> {
  (error: Error | string | true, data: null): void;
  (error: null, data: T): void;
}

function requireAuthToken(socket: SCServerSocket, respond: (error: string, data: null) => void): AppAuthToken | null {
  if (hasValidAuthToken(socket)) {
    return socket.authToken;
  } else {
    respond("User is not authenticated - login first", null);
    return null;
  }
}

export class MatchModule {
  scServer: SCServer;

  constructor(scServer: SCServer) {
    this.scServer = scServer;
  }
  public handleConnect(socket: SCServerSocket) {
    // @ts-ignore
    socket.on('createMatch', (data: null, respond: Responder<Match>) => {
      const authToken = requireAuthToken(socket, respond);
      if(authToken) {
        const match: Match = {
          id: uuid(),
          creatorId: authToken.id,
          playerCount: 2,
          playerIds: [authToken.id, null],
          invitationOnly: true,
          challengeToken: uuid().slice(10),
          level: 10,
          baseSpeed: 15
        };
        respond(null, match);
      }
    });
  }
}
