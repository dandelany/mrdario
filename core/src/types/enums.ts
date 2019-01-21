export enum GameControllerMode {
  Ready = "Ready",
  Playing = "Playing",
  Paused = "Paused",
  Won = "Won",
  Lost = "Lost",
  Ended = "Ended"
}

export enum GameMode {
  // Loading: pre-ready state, todo: use this to populate viruses slowly?
  Loading = "Loading",
  // Ready: ready for a new pill (first or otherwise)
  Ready = "Ready",
  // Playing: pill is in play and falling
  Playing = "Playing",
  // Reconcile: pill is locked in place, checking for lines to destroy
  Reconcile = "Reconcile",
  // Cascade: cascading line destruction & debris falling
  Cascade = "Cascade",
  // Destruction: lines are being destroyed
  Destruction = "Destruction",
  // Ended: game has ended
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

export enum InputEventType {
  KeyUp = "keyup",
  KeyDown = "keydown"
}
