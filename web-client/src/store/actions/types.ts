import { Action } from "redux";
import { SCClientSocket } from "socketcluster-client";

import { HighScoresResponse } from "mrdario-core/lib/api/scores";
import { AppAuthToken, ClientAuthenticatedUser, LoginRequest } from "mrdario-core/lib/api/auth";

// master list of app action type strings
export enum AppActionType {
  SocketConnecting = "GameClient:SocketConnecting",
  SocketConnect = "GameClient:SocketConnect",
  SocketConnectAbort = "GameClient:SocketConnectAbort",
  SocketDisconnect = "GameClient:SocketDisconnect",
  SocketClose = "GameClient:SocketClose",
  SocketError = "GameClient:SocketError",
  SocketAuthenticate = "GameClient:SocketAuthenticate",
  SocketDeauthenticate = "GameClient:SocketDeauthenticate",
  SocketAuthStateChange = "GameClient:SocketAuthStateChange",

  GetHighScores = "GameClient:GetHighScores",
  Login = "GameClient:Login"
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
  payload: { [K in string]: any };
}
export enum RequestStatus {
  Loading = "Loading",
  Failed = "Failed",
  Success = "Success"
}
export interface IRequestAction extends IActionWithStatus {
  status: RequestStatus;
}
export interface IPayloadWithSocketState {
  socketState: SCClientSocket.States;
}
export interface IPayloadWithAuthState {
  authState: SCClientSocket.AuthStates;
  authToken: null | AppAuthToken;
}

// app actions
export interface SocketConnectingAction extends IAppAction {
  type: AppActionType.SocketConnecting;
  payload: IPayloadWithSocketState;
}
export interface SocketConnectAction extends IActionWithPayload {
  type: AppActionType.SocketConnect;

  payload: IPayloadWithSocketState & {
    status: SCClientSocket.ConnectStatus;
  };
}
export interface SocketConnectAbortAction extends IActionWithPayload {
  type: AppActionType.SocketConnectAbort;
  payload: IPayloadWithSocketState & {
    code: number;
    data: string | object;
  };
}
export interface SocketDisconnectAction extends IActionWithPayload {
  type: AppActionType.SocketDisconnect;
  payload: IPayloadWithSocketState & {
    code: number;
    data: string | object;
  };
}
export interface SocketCloseAction extends IActionWithPayload {
  type: AppActionType.SocketClose;
  payload: IPayloadWithSocketState & {
    code: number;
    data: string | object;
  };
}
export interface SocketErrorAction extends IActionWithPayload {
  type: AppActionType.SocketError;
  error: Error;
  payload: IPayloadWithSocketState;
}
export interface SocketAuthenticateAction extends IActionWithPayload {
  type: AppActionType.SocketAuthenticate;
  payload: IPayloadWithSocketState & IPayloadWithAuthState;
}
export interface SocketDeauthenticateAction extends IActionWithPayload {
  type: AppActionType.SocketDeauthenticate;
  payload: IPayloadWithSocketState & IPayloadWithAuthState;
}
export interface SocketAuthStateChangeAction extends IActionWithPayload {
  type: AppActionType.SocketAuthStateChange;
  payload: IPayloadWithSocketState &
    IPayloadWithAuthState & {
      stateChangeData: SCClientSocket.AuthStateChangeData;
    };
}

// high scores
export interface GetHighScoresAction extends IRequestAction {
  type: AppActionType.GetHighScores;
  payload: {
    level: number;
  };
}
export interface GetHighScoresSuccessAction extends GetHighScoresAction {
  status: RequestStatus.Success;
  payload: {
    level: number;
    response: HighScoresResponse;
  };
}
export interface GetHighScoresFailedAction extends GetHighScoresAction {
  status: RequestStatus.Failed;
  error: Error;
}

// login
export interface LoginAction extends IRequestAction {
  type: AppActionType.Login;
}
export interface LoginLoadingAction extends LoginAction {
  status: RequestStatus.Loading;
  payload: LoginRequest;
}
export interface LoginSuccessAction extends LoginAction {
  status: RequestStatus.Success;
  payload: ClientAuthenticatedUser;
}
export interface LoginFailedAction extends LoginAction {
  status: RequestStatus.Failed;
  error: Error;
}

export type AppAction =
  | SocketConnectingAction
  | SocketConnectAction
  | SocketConnectAbortAction
  | SocketDisconnectAction
  | SocketCloseAction
  | SocketErrorAction
  | SocketDisconnectAction
  | SocketAuthenticateAction
  | SocketDeauthenticateAction
  | SocketAuthStateChangeAction
  | GetHighScoresAction
  | LoginAction;
