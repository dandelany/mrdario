import { Action } from "redux";
import { SCClientSocket } from "socketcluster-client";

import { HighScoresResponse } from "mrdario-core/lib/api/types/scores";

// master list of app action type strings
export enum AppActionType {
  SocketConnecting = "GameClient:SocketConnecting",
  SocketConnect = "GameClient:SocketConnect",
  SocketConnectAbort = "GameClient:SocketConnectAbort",
  SocketDisconnect = "GameClient:SocketDisconnect",
  SocketClose = "GameClient:SocketClose",
  SocketError = "GameClient:SocketError",
  GetHighScores = "GameClient:GetHighScores"
}

// base action types
export interface IAppAction extends Action {
  type: AppActionType;
  error?: Error;
}
export interface IActionWithStatus extends IAppAction {
  status: string;
}
export interface IActionWithPayload extends IAppAction {
  payload: {[K in string]: any};
}
export enum RequestStatus {
  Loading = "Loading",
  Failed = "Failed",
  Success = "Success"
}
export interface IRequestAction extends IActionWithStatus {
  status: RequestStatus;
}

// app actions
export interface SocketConnectingAction extends IAppAction {
  type: AppActionType.SocketConnecting;
  payload: {
    socketState: SCClientSocket.States
  }
}
export interface SocketConnectAction extends IActionWithPayload {
  type: AppActionType.SocketConnect;
  payload: {
    status: SCClientSocket.ConnectStatus,
    socketState: SCClientSocket.States
  }
}
export interface SocketConnectAbortAction extends IActionWithPayload {
  type: AppActionType.SocketConnectAbort;
  payload: {
    code: number,
    data: string | object,
    socketState: SCClientSocket.States
  }
}
export interface SocketDisconnectAction extends IActionWithPayload {
  type: AppActionType.SocketDisconnect;
  payload: {
    code: number,
    data: string | object,
    socketState: SCClientSocket.States
  }
}
export interface SocketCloseAction extends IActionWithPayload {
  type: AppActionType.SocketClose;
  payload: {
    code: number,
    data: string | object,
    socketState: SCClientSocket.States
  }
}
export interface SocketErrorAction extends IActionWithPayload {
  type: AppActionType.SocketError;
  error: Error,
  payload: {
    socketState: SCClientSocket.States
  }
}

export interface GetHighScoresAction extends IRequestAction {
  type: AppActionType.GetHighScores;
  payload: {
    level: number
  }
}
export interface GetHighScoresSuccessAction extends GetHighScoresAction {
  status: RequestStatus.Success,
  payload: {
    level: number,
    response: HighScoresResponse
  }
}
export interface GetHighScoresFailedAction extends GetHighScoresAction {
  status: RequestStatus.Failed,
  error: Error
}

export type AppAction =
  | SocketConnectingAction
  | SocketConnectAction
  | SocketConnectAbortAction
  | SocketDisconnectAction
  | SocketCloseAction
  | SocketErrorAction
  | SocketDisconnectAction
  | GetHighScoresAction;
