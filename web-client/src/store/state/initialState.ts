import { AppState } from "@/store/state/types";
import { SCClientSocket } from "socketcluster-client";

export const initialGameClientState = {
  socketState: "closed" as SCClientSocket.States
};
export const initialState: AppState = {
  gameClient: initialGameClientState
};
