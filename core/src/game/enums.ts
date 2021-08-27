export enum GameMode {
  // Ready: pre-play state
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
  // todo: should be Won and Lost instead of ended?
  Ended = "Ended"
}

export enum GameInput {
  Left = "Left",
  Right = "Right",
  Up = "Up",
  Down = "Down",
  RotateCCW = "RotateCCW",
  RotateCW = "RotateCW",
  Play = "Play",
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

export enum GameColor {
  Color1 = 0,
  Color2 = 1,
  Color3 = 2
}

export enum GridDirection {
  Up = "DirUp",
  Down = "DirDown",
  Left = "DirLeft",
  Right = "DirRight"
}
export enum RotateDirection {
  Clockwise = "Clockwise",
  CounterClockwise = "CounterClockwise"
}

export enum InputEventType {
  KeyUp = "keyup",
  KeyDown = "keydown"
}

export enum SpeedLevel {
  Low = "Low",
  Medium = "Medium",
  High = "High"
}
