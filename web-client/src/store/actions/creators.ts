import { ActionCreator, Dispatch } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { SCClientSocket } from "socketcluster-client"

import { GameClient, GameClientOptions } from "mrdario-core/lib/api/client";
import { ClientAuthenticatedUser, HighScoresResponse } from "mrdario-core/lib/api/types";

import {
  AppAction,
  AppActionType,
  GetHighScoresAction,
  GetHighScoresFailedAction,
  GetHighScoresSuccessAction,
  LoginAction,
  LoginFailedAction,
  LoginLoadingAction,
  LoginSuccessAction,
  RequestStatus,
  SocketCloseAction,
  SocketConnectAbortAction,
  SocketConnectAction,
  SocketConnectingAction,
  SocketDisconnectAction,
  SocketErrorAction
} from "./types";
import { AppState } from "../state/types";
;


export type AppThunkAction<R> = ThunkAction<R, AppState, null, AppAction>;

export type AppThunkDispatch = ThunkDispatch<AppState, null, AppAction>;

export type AsyncActionCreator<A = AppAction> = ActionCreator<AppThunkAction<Promise<A>>>;

// simple action creators
export const socketConnecting: ActionCreator<SocketConnectingAction> = (socket: SCClientSocket) => ({
  type: AppActionType.SocketConnecting,
  payload: { socketState: socket.state }
});

export const socketConnect: ActionCreator<SocketConnectAction> = (
  status: SCClientSocket.ConnectStatus,
  _processSubscriptions: any,
  socket: SCClientSocket
) => ({
  type: AppActionType.SocketConnect,
  payload: { status, socketState: socket.state }
});

export const socketConnectAbort: ActionCreator<SocketConnectAbortAction> = (
  code: number,
  data: string | object,
  socket: SCClientSocket
) => ({
  type: AppActionType.SocketConnectAbort,
  payload: { code, data, socketState: socket.state }
});

export const socketDisconnect: ActionCreator<SocketDisconnectAction> = (
  code: number,
  data: string | object,
  socket: SCClientSocket
) => ({
  type: AppActionType.SocketDisconnect,
  payload: { code, data, socketState: socket.state }
});

export const socketClose: ActionCreator<SocketCloseAction> = (
  code: number,
  data: string | object,
  socket: SCClientSocket
) => ({
  type: AppActionType.SocketClose,
  payload: { code, data, socketState: socket.state }
});

export const socketError: ActionCreator<SocketErrorAction> = (error: Error, socket: SCClientSocket) => ({
  type: AppActionType.SocketError,
  error,
  payload: { socketState: socket.state }
});

export const getHighScoresLoading: ActionCreator<GetHighScoresAction> = (level: number) => ({
  type: AppActionType.GetHighScores,
  status: RequestStatus.Loading,
  payload: { level }
});
export const getHighScoresSuccess: ActionCreator<GetHighScoresSuccessAction> = (
  level: number,
  response: HighScoresResponse
) => ({
  type: AppActionType.GetHighScores,
  status: RequestStatus.Success,
  payload: { level, response }
});
export const getHighScoresFailed: ActionCreator<GetHighScoresFailedAction> = (
  level: number,
  error: Error
) => ({
  type: AppActionType.GetHighScores,
  status: RequestStatus.Failed,
  payload: { level },
  error
});

export const loginLoading = (name: string, id?: string, token?: string): LoginLoadingAction => ({
  type: AppActionType.Login,
  status: RequestStatus.Loading,
  payload: { name, id, token }
});
export const loginSuccess = (clientUser: ClientAuthenticatedUser): LoginSuccessAction => ({
  type: AppActionType.Login,
  status: RequestStatus.Success,
  payload: clientUser
});
export const loginFailed = (error: Error): LoginFailedAction => ({
  type: AppActionType.Login,
  status: RequestStatus.Failed,
  error
});

// thunk actions

export const initGameClient: ActionCreator<AppThunkAction<GameClient>> = (
  options: Partial<GameClientOptions> = {}
) => {
  return (dispatch: Dispatch) => {
    const wrapDispatch = (func: ActionCreator<AppAction>) => {
      return (...args: any) => dispatch(func(...args));
    };
    const gameClient = new GameClient({
      ...options,
      onConnecting: wrapDispatch(socketConnecting),
      onConnect: wrapDispatch(socketConnect),
      onConnectAbort: wrapDispatch(socketConnectAbort),
      onDisconnect: wrapDispatch(socketDisconnect),
      onClose: wrapDispatch(socketClose),
      onError: wrapDispatch(socketError)
    });
    console.log(gameClient);
    return gameClient;
  };
};

// async actions

export const getHighScores: AsyncActionCreator<GetHighScoresAction> = (
  gameClient,
  level
) => {
  return (dispatch: Dispatch<GetHighScoresAction>) => {
    dispatch(getHighScoresLoading(level));
    return gameClient
      .getHighScores(level)
      .then((response: HighScoresResponse) => {
        return dispatch(getHighScoresSuccess(level, response));
      })
      .catch((error: Error) => {
        return dispatch(getHighScoresFailed(level, error));
      });
  };
};

export const login: AsyncActionCreator<LoginAction> = (
  gameClient: GameClient,
  name: string,
  id?: string,
  token?: string,
) => {
  return (dispatch: Dispatch<LoginAction>) => {
    dispatch(loginLoading(name, id, token));
    return gameClient.login(name, id, token)
      .then((clientUser: ClientAuthenticatedUser) => {
        return dispatch(loginSuccess(clientUser));
      })
      .catch((error: Error) => {
        return dispatch(loginFailed(error));
      });
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

// export const getHighScores: ActionCreator<GetHighScoresAction> = () => {
//   return {
//     type: AppActionType.GetHighScores,
//     status: RequestStatus.Loading
//   };
// };
