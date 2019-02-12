import { Reducer } from "redux";
import { GameClientState } from "../state/types";
import { AppAction, AppActionType } from "../actions/types";
import { initialGameClientState } from "../state/initialState";

export const gameClientReducer: Reducer<GameClientState, AppAction> = (
  state: GameClientState = initialGameClientState,
  action: AppAction
): GameClientState => {
  switch (action.type) {
    case AppActionType.SocketConnecting:
      return {
        ...state,
        socketState: action.payload.socketState
      };

    case AppActionType.SocketConnect:
      return {
        ...state,
        socketState: action.payload.socketState,
        socketId: action.payload.status.id,
        // error: action.error
      };

    case AppActionType.SocketClose:
      return {
        ...state,
        socketState: action.payload.socketState
      };

    case AppActionType.SocketAuthenticate:
      return {
        ...state,
        authState: action.payload.authState,
        authToken: action.payload.authToken,
        socketState: action.payload.socketState
      };

    case AppActionType.SocketDeauthenticate:
      return {
        ...state,
        authState: action.payload.authState,
        authToken: action.payload.authToken,
        socketState: action.payload.socketState
      };

    case AppActionType.SocketAuthStateChange:
      return {
        ...state,
        authState: action.payload.authState,
        authToken: action.payload.authToken,
        socketState: action.payload.socketState
      };

    default:
      return state;
  }
};
