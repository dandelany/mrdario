import { AppAction } from "../actions/types";
import { AppState } from "@/store/state/types";

import { combineReducers, Reducer } from "redux";
import { gameClientReducer } from "./gameClient";


export const reducer: Reducer<AppState, AppAction> = combineReducers<AppState>({
  gameClient: gameClientReducer
});
