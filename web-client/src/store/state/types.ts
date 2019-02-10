import {SCClientSocket} from "socketcluster-client";

export interface GameClientState {
  socketState: SCClientSocket.States;
  socketId?: string;
}

export interface AppState {
  gameClient: GameClientState;
}
