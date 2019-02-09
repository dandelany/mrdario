// import { Action, Dispatch, Middleware, MiddlewareAPI } from "redux";
// import { GameClient } from "mrdario-core/lib/api/client";
//
// export enum GameClientInputActionType {
//   Connect = "GameClient:Connect"
// }
//
// interface GameClientConnectAction extends Action {
//   type: GameClientInputActionType.Connect
// }
//
// // export type GameClientInputAction = GameClientConnectAction
//
//
// export enum GameClientOutputActionType {
//   Connected = "GameClient:Connected"
// }
//
// interface GameClientConnectedAction extends Action {
//   type: GameClientOutputActionType.Connected
// }
//
// function gameClientConnected(): GameClientConnectedAction {
//   return {type: GameClientOutputActionType.Connected};
// }
//
// // export type GameClientOutputAction = GameClientConnectedAction;
//
// // interface GameClientState {
// //   socketStatus: string
// // };
//
// let gameClient: GameClient;
//
// export const gameClientMiddleware: Middleware = (api: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
//   switch(action.type) {
//     case GameClientInputActionType.Connect:
//       gameClient = new GameClient();
//       gameClient.socket.on("connect", () => {
//         api.dispatch(gameClientConnected());
//       });
//   }
//   return next(action);
// };
