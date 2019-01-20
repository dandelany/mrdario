export enum GameMode {
  Ready = "Ready",
  Playing = "Playing",
  Paused = "Paused",
  Won = "Won",
  Lost = "Lost",
  Ended = "Ended"
}

export enum GameInput {
  Play = "Play",
  Left = "Left",
  Right = "Right",
  Up = "Up",
  Down = "Down",
  RotateCCW = "RotateCCW",
  RotateCW = "RotateCW",
  Pause = "Pause",
  Resume = "Resume",
  Reset = "Reset"
}

export enum GridObjectType {
  Destroyed = "Destroyed",
  Empty = "Empty",
  PillTop = "PillTop",
  PillBottom = "PillBottom",
  PillLeft = "PillLeft",
  PillRight = "PillRight",
  PillSegment = "PillSegment",
  Virus = "Virus"
}

export enum SpeedLevel {
  Low = "Low",
  Medium = "Medium",
  High = "High"
}

export enum GameColor {
  Color1,
  Color2,
  Color3
}

export enum Direction {
  Up = "Up",
  Down = "Down",
  Left = "Left",
  Right = "Right"
}
export enum RotateDirection {
  Clockwise = "Clockwise",
  CounterClockwise = "CounterClockwise"
}
