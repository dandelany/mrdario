export type AppState = {
  hello: number;
  socketState: string;
};

export const initialState: AppState = {
  hello: 0,
  socketState: "bad"
};
