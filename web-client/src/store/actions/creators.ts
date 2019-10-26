import { ActionCreator, Dispatch } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { SCClientSocket } from "socketcluster-client";

import { GameClient, GameClientOptions } from "mrdario-core/lib/client";
import { AppAuthToken, ClientAuthenticatedUser } from "mrdario-core/lib/api/auth";
import { GetHighScoresResponse } from "mrdario-core/lib/api/scores";

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
  SocketAuthenticateAction,
  SocketAuthStateChangeAction,
  SocketCloseAction,
  SocketConnectAbortAction,
  SocketConnectAction,
  SocketConnectingAction,
  SocketDeauthenticateAction,
  SocketDisconnectAction,
  SocketErrorAction
} from "./types";
import { AppState } from "../state/types";


export type AppThunkAction<R> = ThunkAction<R, AppState, null, AppAction>;

export type AppThunkDispatch = ThunkDispatch<AppState, null, AppAction>;

export type AsyncActionCreator<A = AppAction> = ActionCreator<AppThunkAction<Promise<A>>>;

// simple action creators
export const socketConnecting = (socket: SCClientSocket): SocketConnectingAction => ({
  type: AppActionType.SocketConnecting,
  payload: { socketState: socket.state }
});

export const socketConnect = (
  status: SCClientSocket.ConnectStatus,
  _processSubscriptions: any,
  socket: SCClientSocket
): SocketConnectAction => ({
  type: AppActionType.SocketConnect,
  payload: { status, socketState: socket.state }
});

export const socketConnectAbort = (
  code: number,
  data: string | object,
  socket: SCClientSocket
): SocketConnectAbortAction => ({
  type: AppActionType.SocketConnectAbort,
  payload: { code, data, socketState: socket.state }
});

export const socketDisconnect = (
  code: number,
  data: string | object,
  socket: SCClientSocket
): SocketDisconnectAction => ({
  type: AppActionType.SocketDisconnect,
  payload: { code, data, socketState: socket.state }
});

export const socketClose = (
  code: number,
  data: string | object,
  socket: SCClientSocket
): SocketCloseAction => ({
  type: AppActionType.SocketClose,
  payload: { code, data, socketState: socket.state }
});

export const socketError = (error: Error, socket: SCClientSocket): SocketErrorAction => ({
  type: AppActionType.SocketError,
  error,
  payload: { socketState: socket.state }
});

export const socketAuthenticate = (
  _signedAuthToken: string | null,
  socket: SCClientSocket
): SocketAuthenticateAction => ({
  type: AppActionType.SocketAuthenticate,
  payload: {
    authToken: socket.authToken as AppAuthToken | null,
    authState: socket.authState,
    socketState: socket.state
  }
});

export const socketDeauthenticate = (
  _oldSignedToken: string | null,
  socket: SCClientSocket
): SocketDeauthenticateAction => ({
  type: AppActionType.SocketDeauthenticate,
  payload: {
    authToken: socket.authToken as AppAuthToken | null,
    authState: socket.authState,
    socketState: socket.state
  }
});

export const socketAuthStateChange = (
  stateChangeData: SCClientSocket.AuthStateChangeData,
  socket: SCClientSocket
): SocketAuthStateChangeAction => ({
  type: AppActionType.SocketAuthStateChange,
  payload: {
    authToken: socket.authToken as AppAuthToken | null,
    authState: socket.authState,
    stateChangeData: stateChangeData,
    socketState: socket.state
  }
});

export const getHighScoresLoading = (level: number): GetHighScoresAction => ({
  type: AppActionType.GetHighScores,
  status: RequestStatus.Loading,
  payload: { level }
});
export const getHighScoresSuccess = (
  level: number,
  response: GetHighScoresResponse
): GetHighScoresSuccessAction => ({
  type: AppActionType.GetHighScores,
  status: RequestStatus.Success,
  payload: { level, response }
});
export const getHighScoresFailed = (level: number, error: Error): GetHighScoresFailedAction => ({
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
    // ugh... it would be nice to use this, but doing so causes all the action creators to lose
    // their typing and become (...args: any) => {} . any way to avoid this??
    // const wrapDispatch = (func: ActionCreator<AppAction>) => {
    //   return (...args: any) => dispatch(func(...args));
    // };

    const gameClient = new GameClient({
      ...options,
      onConnecting: (socket: SCClientSocket) => {
        dispatch(socketConnecting(socket));
      },
      onConnect: (
        status: SCClientSocket.ConnectStatus,
        processSubscriptions: () => void,
        socket: SCClientSocket
      ) => {
        dispatch(socketConnect(status, processSubscriptions, socket));
      },
      onConnectAbort: (code: number, data: string | object, socket: SCClientSocket) => {
        dispatch(socketConnectAbort(code, data, socket));
      },
      onDisconnect: (code: number, data: string | object, socket: SCClientSocket) => {
        dispatch(socketDisconnect(code, data, socket));
      },
      onClose: (code: number, data: string | object, socket: SCClientSocket) => {
        dispatch(socketClose(code, data, socket));
      },
      onError: (err: Error, socket: SCClientSocket) => {
        dispatch(socketError(err, socket));
      },
      onAuthenticate: (signedAuthToken: string | null, socket: SCClientSocket) => {
        dispatch(socketAuthenticate(signedAuthToken, socket));
      },
      onDeauthenticate: (oldSignedToken: string | null, socket: SCClientSocket) => {
        dispatch(socketDeauthenticate(oldSignedToken, socket));
      },
      onAuthStateChange: (stateChangeData: SCClientSocket.AuthStateChangeData, socket: SCClientSocket) => {
        dispatch(socketAuthStateChange(stateChangeData, socket));
      }
    });
    console.log(gameClient);
    return gameClient;
  };
};

// async actions

export const getHighScores: AsyncActionCreator<GetHighScoresAction> = (gameClient, level) => {
  return (dispatch: Dispatch<GetHighScoresAction>) => {
    dispatch(getHighScoresLoading(level));
    return gameClient
      .getHighScores(level)
      .then((response: GetHighScoresResponse) => {
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
  token?: string
) => {
  return (dispatch: Dispatch<LoginAction>) => {
    dispatch(loginLoading(name, id, token));
    return gameClient
      .login(name, id, token)
      .then((clientUser: ClientAuthenticatedUser) => {
        if (window.localStorage) {
          window.localStorage.setItem("mrdario-userId", clientUser.id);
          window.localStorage.setItem("mrdario-token", clientUser.token);
        }
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
