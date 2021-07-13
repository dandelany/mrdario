import { applyMiddleware, compose, createStore } from "redux";
import thunk, { ThunkMiddleware } from "redux-thunk";

import { AppAction } from "./actions/types";
import { AppState } from "./state/types";
import { reducer } from "./reducers";

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const store = createStore<AppState, AppAction, {}, {}>(
  reducer,
  composeEnhancers(applyMiddleware(thunk as ThunkMiddleware<AppState, AppAction>))
);
