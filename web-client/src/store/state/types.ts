import { SCClientSocket } from "socketcluster-client";
import { AppAuthToken } from "mrdario-core/lib/api/auth";

export interface GameClientState {
  socketState: SCClientSocket.States;
  socketId?: string;
  authState: SCClientSocket.AuthStates;
  authToken: AppAuthToken | null;
}

export interface AppState {
  gameClient: GameClientState;
}
