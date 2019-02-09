import { ActionCreator, Dispatch } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { GameClient, GameClientOptions } from "mrdario-core/lib/api/client";

import {
  AppAction,
  AppActionType,
  SocketConnectingAction,
  SocketConnectAction,
  SocketConnectAbortAction,
  GetHighScoresAction,
  RequestStatus,
  SocketDisconnectAction,
  SocketCloseAction,
  SocketErrorAction
} from "./types";
import { AppState } from "../state";
import { SCClientSocket } from "socketcluster-client";

export type AppThunkAction<R> = ThunkAction<R, AppState, null, AppAction>;

export type AppThunkDispatch = ThunkDispatch<AppState, null, AppAction>;

export type AsyncActionCreator<A = AppAction> = ActionCreator<AppThunkAction<Promise<A>>>;

export const socketConnecting: ActionCreator<SocketConnectingAction> = () => ({
  type: AppActionType.SocketConnecting
});

export const socketConnect: ActionCreator<SocketConnectAction> = (status: SCClientSocket.ConnectStatus) => ({
  type: AppActionType.SocketConnect,
  payload: { status }
});

export const socketConnectAbort: ActionCreator<SocketConnectAbortAction> = (
  code: number,
  data: string | object
) => ({
  type: AppActionType.SocketConnectAbort,
  payload: { code, data }
});

export const socketDisconnect: ActionCreator<SocketDisconnectAction> = (
  code: number,
  data: string | object
) => ({
  type: AppActionType.SocketDisconnect,
  payload: { code, data }
});

export const socketClose: ActionCreator<SocketCloseAction> = (code: number, data: string | object) => ({
  type: AppActionType.SocketClose,
  payload: { code, data }
});

export const socketError: ActionCreator<SocketErrorAction> = (err: Error) => ({
  type: AppActionType.SocketError,
  payload: { err }
});


export const initGameClient: ActionCreator<AppThunkAction<GameClient>> = (
  options: Partial<GameClientOptions> = {}
) => {
  return (dispatch: Dispatch) => {
    const wrapDispatch = (func: ActionCreator<AppAction>) => {
      return (...args: any) => dispatch(func(...args))
    };
    const gameClient = new GameClient({
      ...options,
      onConnecting: wrapDispatch(socketConnecting),
      onConnect: wrapDispatch(socketConnect),
      onConnectAbort: wrapDispatch(socketConnectAbort),
      onDisconnect: wrapDispatch(socketDisconnect),
      onClose: wrapDispatch(socketClose),
      onError: wrapDispatch(socketError),
    });
    console.log(gameClient);
    return gameClient;
  };
};


// export const connectGameServer: ActionCreator<
//   ThunkAction<void, AppState, null, SocketConnectAction | SocketConnectedAction | SocketConnectAbortAction>
// > = (gameSocket: GameSocket) => {
//   return (dispatch: Dispatch<SocketConnectAction | SocketConnectedAction | SocketConnectAbortAction>) => {
//     dispatch({ type: AppActionType.SocketConnect, status: RequestStatus.Loading });
//     gameSocket
//       .connect()
//       .then(() => {
//         dispatch({ type: AppActionType.SocketConnected, status: RequestStatus.Success });
//       })
//       .catch((err: Error) => {
//         dispatch({ type: AppActionType.SocketConnectAbort, status: RequestStatus.Failed, payload: err });
//       });
//   };
// };

export const getHighScores: ActionCreator<GetHighScoresAction> = () => {
  return {
    type: AppActionType.GetHighScores,
    status: RequestStatus.Loading
  };
};
