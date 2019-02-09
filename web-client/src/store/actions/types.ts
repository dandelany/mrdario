import { Action } from "redux";
import { SCClientSocket } from "socketcluster-client";

// master list of app action type strings
export enum AppActionType {
  SocketConnecting = "SocketConnecting",
  SocketConnect = "SocketConnect",
  SocketConnectAbort = "SocketConnectAbort",
  SocketDisconnect = "SocketDisconnect",
  SocketClose = "SocketClose",
  SocketError = "SocketError",

  GetHighScores = "GetHighScores"
}

// base action types
export interface IAppAction extends Action {
  type: AppActionType;
}
export interface IActionWithStatus extends IAppAction {
  status: string;
}
export interface IActionWithPayload extends IAppAction {
  payload: any;
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
}
export interface SocketConnectAction extends IActionWithPayload {
  type: AppActionType.SocketConnect;
  payload: {
    status: SCClientSocket.ConnectStatus
  }
}
export interface SocketConnectAbortAction extends IAppAction {
  type: AppActionType.SocketConnectAbort;
  payload: {
    code: number,
    data: string | object
  }
}
export interface SocketDisconnectAction extends IAppAction {
  type: AppActionType.SocketDisconnect;
  payload: {
    code: number,
    data: string | object
  }
}
export interface SocketCloseAction extends IAppAction {
  type: AppActionType.SocketClose;
  payload: {
    code: number,
    data: string | object
  }
}
export interface SocketErrorAction extends IAppAction {
  type: AppActionType.SocketError;
  payload: {
    err: Error
  }
}

export interface GetHighScoresAction extends IRequestAction {
  type: AppActionType.GetHighScores;
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
