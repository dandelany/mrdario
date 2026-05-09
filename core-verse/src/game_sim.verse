# single-board deterministic simulation.

MakeInitialGameState(Level:int, BaseSpeed:int, Seed:string):game_state =
    # height includes the hidden top row, matching the ts game.
    InitialGrid := GenerateEnemies(MakeEmptyGrid(PlayfieldWidth, PlayfieldHeight + 1), Level, "{Seed}enemies")
    game_state{
        Mode := game_mode.Ready,
        Grid := InitialGrid,
        Seed := Seed,
        Level := Level,
        BaseSpeed := BaseSpeed,
        NextPill := GetNextPill(Seed, 0)
    }

BuildGameState(Source:game_state, Mode:game_mode, Grid:[][]grid_object, Pill:?pill_location, NextPill:pill_colors, Frame:int, GameTicks:int, ModeTicks:int, PillCount:int, Score:int, TimeBonus:int, LineColors:[]game_color, Garbage:[]game_color):game_state =
    game_state{
        Mode := Mode,
        Grid := Grid,
        Pill := Pill,
        NextPill := NextPill,
        MovingCounters := Source.MovingCounters,
        Seed := Source.Seed,
        Level := Source.Level,
        BaseSpeed := Source.BaseSpeed,
        Frame := Frame,
        GameTicks := GameTicks,
        ModeTicks := ModeTicks,
        PillCount := PillCount,
        Score := Score,
        TimeBonus := TimeBonus,
        LineColors := LineColors,
        Garbage := Garbage
    }

BuildGameStateWithCounters(Source:game_state, MovingCounters:moving_counters):game_state =
    game_state{
        Mode := Source.Mode,
        Grid := Source.Grid,
        Pill := Source.Pill,
        NextPill := Source.NextPill,
        MovingCounters := MovingCounters,
        Seed := Source.Seed,
        Level := Source.Level,
        BaseSpeed := Source.BaseSpeed,
        Frame := Source.Frame,
        GameTicks := Source.GameTicks,
        ModeTicks := Source.ModeTicks,
        PillCount := Source.PillCount,
        Score := Source.Score,
        TimeBonus := Source.TimeBonus,
        LineColors := Source.LineColors,
        Garbage := Source.Garbage
    }

NextPillColors(State:game_state):pill_colors =
    GetNextPill(State.Seed, State.PillCount + 1)

GetNextPill(Seed:string, PillCount:int):pill_colors =
    pill_colors{
        A := SeedRandomColor("\"{Seed}\"-{PillCount}-0-nextPill"),
        B := SeedRandomColor("\"{Seed}\"-{PillCount}-1-nextPill")
    }

GravityFrames(Speed:int):int =
    if (Speed <= 0):
        69
    else if (Speed = 1):
        67
    else if (Speed = 2):
        65
    else if (Speed = 3):
        63
    else if (Speed = 4):
        61
    else if (Speed = 5):
        59
    else if (Speed = 6):
        57
    else if (Speed = 7):
        55
    else if (Speed = 8):
        53
    else if (Speed = 9):
        51
    else if (Speed = 10):
        49
    else if (Speed = 11):
        47
    else if (Speed = 12):
        45
    else if (Speed = 13):
        43
    else if (Speed = 14):
        41
    else if (Speed = 15):
        39
    else if (Speed = 16):
        37
    else if (Speed = 17):
        35
    else if (Speed = 18):
        33
    else if (Speed = 19):
        31
    else if (Speed = 20):
        29
    else if (Speed = 21):
        27
    else if (Speed = 22):
        25
    else if (Speed = 23):
        23
    else if (Speed = 24):
        21
    else if (Speed = 25):
        19
    else if (Speed = 26):
        18
    else if (Speed = 27):
        17
    else if (Speed = 28):
        16
    else if (Speed = 29):
        15
    else if (Speed = 30):
        14
    else if (Speed = 31):
        13
    else if (Speed = 32):
        12
    else if (Speed = 33):
        11
    else if (Speed = 34):
        10
    else if (Speed = 35):
        9
    else if (Speed = 36):
        9
    else if (Speed = 37):
        8
    else if (Speed = 38):
        8
    else if (Speed = 39):
        7
    else if (Speed = 40):
        7
    else if (Speed = 41):
        6
    else if (Speed = 42):
        6
    else if (Speed < 55):
        5
    else if (Speed < 60):
        4
    else if (Speed < 65):
        3
    else if (Speed < 70):
        2
    else:
        1

AccelerationSteps(PillCount:int):int =
    var Count : int = PillCount
    var Steps : int = 0

    loop:
        if (Count < AccelerateInterval):
            break
        set Count -= AccelerateInterval
        set Steps += 1

    Steps

GetGravity(State:game_state):int =
    GravityFrames(State.BaseSpeed + AccelerationSteps(State.PillCount))

IntPow(Base:int, Exponent:int):int =
    var Result : int = 1
    var Count : int = 0

    loop:
        if (Count >= Exponent):
            break
        set Result *= Base
        set Count += 1

    Result

PositiveDifference(Value:int, Subtract:int):int =
    Diff := Value - Subtract
    if (Diff > 0):
        Diff
    else:
        0

TimeBonusForLevel(Level:int, GameTicks:int):int =
    OrigVirusCount := LevelVirusCount(Level)
    ExtraTickFactor := PositiveDifference(40, OrigVirusCount)
    ExpectedTicksPerVirus := 320 + (ExtraTickFactor * 3)
    ExpectedTicks := OrigVirusCount * ExpectedTicksPerVirus
    PositiveDifference(ExpectedTicks, GameTicks)

FirstFourColors(Colors:[]game_color):[]game_color =
    var Result : []game_color = array{}

    for (Color : Colors):
        if (Result.Length < 4):
            set Result += array{Color}

    Result

RepeatInterval(Input:game_input):int =
    case (Input):
        game_input.Up => 24
        game_input.Down => 4
        game_input.Left => 8
        game_input.Right => 8
        game_input.RotateCcw => 12
        game_input.RotateCw => 12

CounterForInput(Counters:moving_counters, Input:game_input):?int =
    case (Input):
        game_input.Up => Counters.Up
        game_input.Down => Counters.Down
        game_input.Left => Counters.Left
        game_input.Right => Counters.Right
        game_input.RotateCcw => Counters.RotateCcw
        game_input.RotateCw => Counters.RotateCw

SetCounterForInput(Counters:moving_counters, Input:game_input, Counter:?int):moving_counters =
    case (Input):
        game_input.Up => moving_counters{
            Left := Counters.Left,
            Right := Counters.Right,
            Up := Counter,
            Down := Counters.Down,
            RotateCcw := Counters.RotateCcw,
            RotateCw := Counters.RotateCw
        }
        game_input.Down => moving_counters{
            Left := Counters.Left,
            Right := Counters.Right,
            Up := Counters.Up,
            Down := Counter,
            RotateCcw := Counters.RotateCcw,
            RotateCw := Counters.RotateCw
        }
        game_input.Left => moving_counters{
            Left := Counter,
            Right := Counters.Right,
            Up := Counters.Up,
            Down := Counters.Down,
            RotateCcw := Counters.RotateCcw,
            RotateCw := Counters.RotateCw
        }
        game_input.Right => moving_counters{
            Left := Counters.Left,
            Right := Counter,
            Up := Counters.Up,
            Down := Counters.Down,
            RotateCcw := Counters.RotateCcw,
            RotateCw := Counters.RotateCw
        }
        game_input.RotateCcw => moving_counters{
            Left := Counters.Left,
            Right := Counters.Right,
            Up := Counters.Up,
            Down := Counters.Down,
            RotateCcw := Counter,
            RotateCw := Counters.RotateCw
        }
        game_input.RotateCw => moving_counters{
            Left := Counters.Left,
            Right := Counters.Right,
            Up := Counters.Up,
            Down := Counters.Down,
            RotateCcw := Counters.RotateCcw,
            RotateCw := Counter
        }

IncrementCounter(Counters:moving_counters, Input:game_input):moving_counters =
    MaybeCounter := CounterForInput(Counters, Input)
    if (Counter := MaybeCounter?):
        SetCounterForInput(Counters, Input, option{Counter + 1})
    else:
        Counters

IncrementMovingCounters(Counters:moving_counters):moving_counters =
    var NextCounters : moving_counters = Counters
    set NextCounters = IncrementCounter(NextCounters, game_input.Up)
    set NextCounters = IncrementCounter(NextCounters, game_input.Down)
    set NextCounters = IncrementCounter(NextCounters, game_input.Left)
    set NextCounters = IncrementCounter(NextCounters, game_input.Right)
    set NextCounters = IncrementCounter(NextCounters, game_input.RotateCcw)
    set NextCounters = IncrementCounter(NextCounters, game_input.RotateCw)
    NextCounters

ApplyInputActionToRepeater(Counters:moving_counters, Action:game_action):input_repeat_output =
    var NextCounters : moving_counters = Counters
    var Inputs : []game_input = array{}

    if (Input := Action.Input?):
        MaybeEventType := Action.EventType
        if (EventType := MaybeEventType?):
            if (EventType = input_event_type.KeyDown):
                MaybeCounter := CounterForInput(NextCounters, Input)
                if (MaybeCounter?):
                    true
                else:
                    set Inputs += array{Input}
                    set NextCounters = SetCounterForInput(NextCounters, Input, option{0})
            else if (EventType = input_event_type.KeyUp):
                set NextCounters = SetCounterForInput(NextCounters, Input, false)
        else:
            set Inputs += array{Input}

    input_repeat_output{MovingCounters := NextCounters, Inputs := Inputs}

AppendRepeatInput(Input:game_input, Counters:moving_counters, Inputs:[]game_input):input_repeat_output =
    var NextCounters : moving_counters = Counters
    var NextInputs : []game_input = Inputs
    MaybeCounter := CounterForInput(Counters, Input)

    if (Counter := MaybeCounter?):
        Interval := RepeatInterval(Input)
        if (Counter >= Interval):
            set NextInputs += array{Input}
            set NextCounters = SetCounterForInput(Counters, Input, option{0})

    input_repeat_output{MovingCounters := NextCounters, Inputs := NextInputs}

BuildMoveQueue(Counters:moving_counters, Actions:[]game_action):input_repeat_output =
    var NextCounters : moving_counters = IncrementMovingCounters(Counters)
    var Inputs : []game_input = array{}

    for (Action : Actions):
        if (Action.Kind = game_action_kind.Move):
            Applied := ApplyInputActionToRepeater(NextCounters, Action)
            set NextCounters = Applied.MovingCounters
            set Inputs += Applied.Inputs

    RepeatUp := AppendRepeatInput(game_input.Up, NextCounters, Inputs)
    set NextCounters = RepeatUp.MovingCounters
    set Inputs = RepeatUp.Inputs

    RepeatDown := AppendRepeatInput(game_input.Down, NextCounters, Inputs)
    set NextCounters = RepeatDown.MovingCounters
    set Inputs = RepeatDown.Inputs

    RepeatLeft := AppendRepeatInput(game_input.Left, NextCounters, Inputs)
    set NextCounters = RepeatLeft.MovingCounters
    set Inputs = RepeatLeft.Inputs

    RepeatRight := AppendRepeatInput(game_input.Right, NextCounters, Inputs)
    set NextCounters = RepeatRight.MovingCounters
    set Inputs = RepeatRight.Inputs

    RepeatRotateCcw := AppendRepeatInput(game_input.RotateCcw, NextCounters, Inputs)
    set NextCounters = RepeatRotateCcw.MovingCounters
    set Inputs = RepeatRotateCcw.Inputs

    RepeatRotateCw := AppendRepeatInput(game_input.RotateCw, NextCounters, Inputs)
    set NextCounters = RepeatRotateCw.MovingCounters
    set Inputs = RepeatRotateCw.Inputs

    var DownHeld : logic = false
    if (NextCounters.Down?):
        set DownHeld = true

    input_repeat_output{MovingCounters := NextCounters, Inputs := Inputs, DownHeld := DownHeld}

MoveDirectionForInput(Input:game_input):?grid_direction =
    case (Input):
        game_input.Left => option{grid_direction.Left}
        game_input.Right => option{grid_direction.Right}
        game_input.Down => option{grid_direction.Down}
        _ => false

ApplyMoveInput(State:game_state, Input:game_input):game_state =
    if (Pill := State.Pill?):
        MaybeDirection := MoveDirectionForInput(Input)
        if (Direction := MaybeDirection?):
            Moved := MovePill(State.Grid, Pill, Direction)
            if (Moved.DidMove?):
                BuildGameState(State, State.Mode, Moved.Grid, option{Moved.Pill}, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
            else if (Input = game_input.Down):
                BuildGameState(State, game_mode.Reconcile, State.Grid, false, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
            else:
                State
        else if (Input = game_input.Up):
            Slammed := SlamPill(State)
            BuildGameState(Slammed, game_mode.Reconcile, Slammed.Grid, false, Slammed.NextPill, Slammed.Frame, Slammed.GameTicks, Slammed.ModeTicks, Slammed.PillCount, Slammed.Score, Slammed.TimeBonus, Slammed.LineColors, Slammed.Garbage)
        else if (Input = game_input.RotateCcw):
            Rotated := RotatePill(State.Grid, Pill, rotate_direction.CounterClockwise)
            if (Rotated.DidMove?):
                BuildGameState(State, State.Mode, Rotated.Grid, option{Rotated.Pill}, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
            else:
                State
        else if (Input = game_input.RotateCw):
            Rotated := RotatePill(State.Grid, Pill, rotate_direction.Clockwise)
            if (Rotated.DidMove?):
                BuildGameState(State, State.Mode, Rotated.Grid, option{Rotated.Pill}, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
            else:
                State
        else:
            State
    else:
        State

ApplyActions(State:game_state, Inputs:[]game_input):game_state =
    var NextState : game_state = State

    for (Input : Inputs):
        set NextState = ApplyMoveInput(NextState, Input)

    NextState

ApplyQueuedGarbage(State:game_state, Actions:[]game_action):game_state =
    var NextState : game_state = State
    var NextGarbage : []game_color = State.Garbage

    for (Action : Actions):
        if (Action.Kind = game_action_kind.Garbage):
            for (Color : Action.Colors):
                if (NextGarbage.Length < 4):
                    set NextGarbage += array{Color}

    if (NextGarbage.Length > 0):
        BuildGameState(NextState, NextState.Mode, NextState.Grid, NextState.Pill, NextState.NextPill, NextState.Frame, NextState.GameTicks, NextState.ModeTicks, NextState.PillCount, NextState.Score, NextState.TimeBonus, NextState.LineColors, NextGarbage)
    else:
        NextState

ForcedActionResult(State:game_state, Actions:[]game_action):?game_tick_result =
    var Result : ?game_tick_result = false

    for (Action : Actions):
        if (Action.Kind = game_action_kind.Defeat):
            set Result = option{game_tick_result{Kind := game_tick_result_kind.Lose}}
        else if (Action.Kind = game_action_kind.ForfeitWin):
            set Result = option{game_tick_result{Kind := game_tick_result_kind.Win}}

    Result

SlamPill(State:game_state):game_state =
    if (Pill := State.Pill?):
        var NextGrid : [][]grid_object = State.Grid
        var NextPill : pill_location = Pill
        var DidMove : logic = false

        loop:
            Moved := MovePill(NextGrid, NextPill, grid_direction.Down)
            if (Moved.DidMove?):
                set NextGrid = Moved.Grid
                set NextPill = Moved.Pill
                set DidMove = true
            else:
                break

        if (DidMove?):
            BuildGameState(State, State.Mode, NextGrid, option{NextPill}, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
        else:
            State
    else:
        State

ApplyGravity(State:game_state, DownHeld:logic):game_state =
    if (Pill := State.Pill?):
        Gravity := GetGravity(State)
        if (DownHeld?):
            State
        else if (State.ModeTicks <= Gravity):
            State
        else:
            Moved := MovePill(State.Grid, Pill, grid_direction.Down)
            if (Moved.DidMove?):
                BuildGameState(State, State.Mode, Moved.Grid, option{Moved.Pill}, State.NextPill, State.Frame, State.GameTicks, 0, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
            else:
                BuildGameState(State, game_mode.Reconcile, State.Grid, false, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
    else:
        State

TickReady(State:game_state):game_tick_output =
    PlayingState := BuildGameState(State, game_mode.Playing, State.Grid, State.Pill, State.NextPill, State.Frame, State.GameTicks, 0, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
    game_tick_output{State := PlayingState}

TickPlaying(State:game_state, MoveQueue:[]game_input, DownHeld:logic):game_tick_output =
    PlayTickState := BuildGameState(State, State.Mode, State.Grid, State.Pill, State.NextPill, State.Frame, State.GameTicks + 1, State.ModeTicks + 1, State.PillCount, State.Score, State.TimeBonus, array{}, State.Garbage)
    MaybePill := PlayTickState.Pill

    if (MaybePill?):
        WithActions := ApplyActions(PlayTickState, MoveQueue)
        WithGravity := ApplyGravity(WithActions, DownHeld)
        game_tick_output{State := WithGravity}
    else:
        Given := GivePill(PlayTickState.Grid, PlayTickState.NextPill)
        if (Given.DidGive?):
            SpawnedState := BuildGameState(PlayTickState, PlayTickState.Mode, Given.Grid, option{Given.Pill}, NextPillColors(PlayTickState), PlayTickState.Frame, PlayTickState.GameTicks, PlayTickState.ModeTicks, PlayTickState.PillCount + 1, PlayTickState.Score, PlayTickState.TimeBonus, PlayTickState.LineColors, PlayTickState.Garbage)
            WithActions := ApplyActions(SpawnedState, MoveQueue)
            WithGravity := ApplyGravity(WithActions, DownHeld)
            game_tick_output{State := WithGravity}
        else:
            LoseState := BuildGameState(PlayTickState, game_mode.Ended, PlayTickState.Grid, false, PlayTickState.NextPill, PlayTickState.Frame, PlayTickState.GameTicks, PlayTickState.ModeTicks, PlayTickState.PillCount, PlayTickState.Score, PlayTickState.TimeBonus, PlayTickState.LineColors, PlayTickState.Garbage)
            game_tick_output{
                State := LoseState,
                Result := option{game_tick_result{Kind := game_tick_result_kind.Lose}}
            }

TickReconcile(State:game_state):game_tick_output =
    var WorkingGrid : [][]grid_object = ClearTopRow(State.Grid)
    var RemainingGarbage : []game_color = State.Garbage

    Destroyed := DestroyLines(WorkingGrid)
    var LineColors : []game_color = State.LineColors
    var NextScore : int = State.Score
    HasLines := Destroyed.HasLines

    if (HasLines?):
        set LineColors += Destroyed.LineColors
        ComboLineCount := Destroyed.LineColors.Length
        set NextScore += (IntPow(Destroyed.DestroyedCount, ComboLineCount) * 5) + (IntPow(Destroyed.VirusCount, ComboLineCount) * 15)

    Viruses := HasViruses(Destroyed.Grid)

    if (Viruses?):
        if (HasLines?):
            DestroyState := BuildGameState(State, game_mode.Destruction, Destroyed.Grid, false, State.NextPill, State.Frame, State.GameTicks, 0, State.PillCount, NextScore, State.TimeBonus, LineColors, RemainingGarbage)
            game_tick_output{State := DestroyState}
        else if (RemainingGarbage.Length > 0):
            GarbageGrid := GiveGarbage(Destroyed.Grid, RemainingGarbage, State.Seed, State.Frame)
            GarbageState := BuildGameState(State, game_mode.Reconcile, GarbageGrid, false, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks, State.PillCount, NextScore, State.TimeBonus, LineColors, array{})
            game_tick_output{State := GarbageState}
        else:
            CascadeState := BuildGameState(State, game_mode.Cascade, Destroyed.Grid, false, State.NextPill, State.Frame, State.GameTicks, 0, State.PillCount, NextScore, State.TimeBonus, LineColors, RemainingGarbage)
            game_tick_output{State := CascadeState}
    else:
        TimeBonus := TimeBonusForLevel(State.Level, State.GameTicks)
        DestroyState := BuildGameState(State, game_mode.Ended, Destroyed.Grid, false, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks, State.PillCount, NextScore + TimeBonus, TimeBonus, LineColors, RemainingGarbage)
        game_tick_output{
            State := DestroyState,
            Result := option{game_tick_result{Kind := game_tick_result_kind.Win}}
        }

TickDestruction(State:game_state):game_tick_output =
    if (State.ModeTicks < DestroyTickCount):
        TickState := BuildGameState(State, State.Mode, State.Grid, State.Pill, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks + 1, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
        game_tick_output{State := TickState}
    else:
        CascadeState := BuildGameState(State, game_mode.Cascade, RemoveDestroyed(State.Grid), State.Pill, State.NextPill, State.Frame, State.GameTicks, 0, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
        game_tick_output{State := CascadeState}

TickCascade(State:game_state):game_tick_output =
    CascadeGravity := GravityFrames(CascadeTickCount)

    if (State.ModeTicks = 0):
        PreviewDrop := DropDebris(State.Grid)
        if (PreviewDrop.FallingCells.Length > 0):
            TickState := BuildGameState(State, State.Mode, State.Grid, State.Pill, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks + 1, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
            game_tick_output{State := TickState}
        else:
            ReadyState := BuildGameState(State, game_mode.Playing, State.Grid, false, State.NextPill, State.Frame, State.GameTicks, 0, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)

            if (State.LineColors.Length >= 2):
                ComboResult := game_tick_result{
                    Kind := game_tick_result_kind.Combo,
                    Colors := FirstFourColors(State.LineColors)
                }
                ComboState := BuildGameState(ReadyState, ReadyState.Mode, ReadyState.Grid, ReadyState.Pill, ReadyState.NextPill, ReadyState.Frame, ReadyState.GameTicks, ReadyState.ModeTicks, ReadyState.PillCount, ReadyState.Score, ReadyState.TimeBonus, array{}, ReadyState.Garbage)
                game_tick_output{State := ComboState, Result := option{ComboResult}}
            else:
                CleanState := BuildGameState(ReadyState, ReadyState.Mode, ReadyState.Grid, ReadyState.Pill, ReadyState.NextPill, ReadyState.Frame, ReadyState.GameTicks, ReadyState.ModeTicks, ReadyState.PillCount, ReadyState.Score, ReadyState.TimeBonus, array{}, ReadyState.Garbage)
                game_tick_output{State := CleanState}
    else:
        CascadeMod := PositiveMod(State.ModeTicks, CascadeGravity)
        if (CascadeMod = 0):
            Dropped := DropDebris(State.Grid)
            NextDrop := DropDebris(Dropped.Grid)
            if (NextDrop.FallingCells.Length < Dropped.FallingCells.Length):
                ReconcileState := BuildGameState(State, game_mode.Reconcile, Dropped.Grid, false, State.NextPill, State.Frame, State.GameTicks, 0, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
                game_tick_output{State := ReconcileState}
            else:
                TickState := BuildGameState(State, State.Mode, Dropped.Grid, State.Pill, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks + 1, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
                game_tick_output{State := TickState}
        else:
            TickState := BuildGameState(State, State.Mode, State.Grid, State.Pill, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks + 1, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
            game_tick_output{State := TickState}

TickGame(State:game_state, Actions:[]game_action):game_tick_output =
    ForcedResult := ForcedActionResult(State, Actions)
    if (Result := ForcedResult?):
        EndedState := BuildGameState(State, game_mode.Ended, State.Grid, State.Pill, State.NextPill, State.Frame, State.GameTicks, State.ModeTicks, State.PillCount, State.Score, State.TimeBonus, State.LineColors, State.Garbage)
        game_tick_output{State := EndedState, Result := option{Result}}
    else if (State.Mode = game_mode.Ended):
        game_tick_output{State := State}
    else:
        WithGarbage := ApplyQueuedGarbage(State, Actions)
        Repeater := BuildMoveQueue(WithGarbage.MovingCounters, Actions)
        WithCounters := BuildGameStateWithCounters(WithGarbage, Repeater.MovingCounters)
        NextState := BuildGameState(WithCounters, WithCounters.Mode, WithCounters.Grid, WithCounters.Pill, WithCounters.NextPill, WithCounters.Frame + 1, WithCounters.GameTicks, WithCounters.ModeTicks, WithCounters.PillCount, WithCounters.Score, WithCounters.TimeBonus, WithCounters.LineColors, WithCounters.Garbage)

        case (WithCounters.Mode):
            game_mode.Ready =>
                TickReady(NextState)
            game_mode.Playing =>
                TickPlaying(NextState, Repeater.Inputs, Repeater.DownHeld)
            game_mode.Reconcile =>
                TickReconcile(NextState)
            game_mode.Destruction =>
                TickDestruction(NextState)
            game_mode.Cascade =>
                TickCascade(NextState)
            _ =>
                game_tick_output{State := NextState}
