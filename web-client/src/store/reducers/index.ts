import { AppAction, AppActionType } from "../actions/types";
import { AppState, initialState } from "../state";

export const reducer = function(state: AppState = initialState, action: AppAction) {
  switch (action.type) {
    case AppActionType.SocketConnecting:
      return {
        ...state,
        hello: state.hello + 1
      };
    default:
      return state;
  }
};

