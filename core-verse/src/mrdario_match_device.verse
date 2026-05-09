using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }
using { /UnrealEngine.com/Temporary/Diagnostics }

# main playable device. owns match lifecycle, sim clock, input queues, and board renderers.
mrdario_match_device := class(creative_device):
    @editable
    PlayerCount : int = 2

    @editable
    Level : int = 0

    @editable
    BaseSpeed : int = 15

    @editable
    Seed : string = "mrdario"

    @editable
    Boards : []mrdario_board_device = array{}

    @editable
    UseBoardCountForPlayerCount : logic = true

    @editable
    LogHeartbeat : logic = false

    @editable
    HeartbeatFrames : int = 120

    @editable
    LogPhaseChanges : logic = false

    @editable
    LogRenderBoundaries : logic = false

    @editable
    LogGridSnapshots : logic = false

    @editable
    LogGridKinds : logic = false

    @editable
    GridSnapshotFrames : int = 120

    var State : multi_game_state = multi_game_state{}
    var PendingActions : [][]game_action = array{}
    var HeartbeatCounter : int = 0
    var GridSnapshotCounter : int = 0
    var LastLoggedFrame : int = -1
    var LastLoggedMode : game_mode = game_mode.Ready
    var LastLoggedTerminalFrame : int = -1

    ActivePlayerCount():int =
        if (UseBoardCountForPlayerCount?):
            if (Boards.Length > 0):
                Boards.Length
            else:
                PlayerCount
        else:
            PlayerCount

    OnBegin<override>()<suspends>:void =
        ResetMatch()
        RunClock()

    ResetMatch():void =
        PlayerTotal := ActivePlayerCount()
        if (PlayerTotal <> PlayerCount):
            Print("mrdario player count: using {PlayerTotal} configured boards instead of PlayerCount {PlayerCount}")
        set State = MakeInitialMultiGameState(PlayerTotal, Level, BaseSpeed, Seed)
        set HeartbeatCounter = 0
        set GridSnapshotCounter = 0
        set LastLoggedFrame = -1
        set LastLoggedTerminalFrame = -1
        set LastLoggedMode = game_mode.Ready
        set PendingActions =
            for (Player := 0..PlayerTotal - 1):
                array{}
        Render()

    QueueAction(Player:int, Action:game_action):void =
        if (PlayerActions := PendingActions[Player]):
            var NextActions : []game_action = PlayerActions
            set NextActions += array{Action}
            if (set PendingActions[Player] = NextActions):
                true

    QueueInput(Player:int, Input:game_input, EventType:input_event_type):void =
        QueueAction(Player, game_action{
            Kind := game_action_kind.Move,
            Input := option{Input},
            EventType := option{EventType}
        })

    QueueTap(Player:int, Input:game_input):void =
        QueueAction(Player, game_action{
            Kind := game_action_kind.Move,
            Input := option{Input}
        })

    QueueLeftDown(Player:int):void =
        QueueInput(Player, game_input.Left, input_event_type.KeyDown)

    QueueLeftUp(Player:int):void =
        QueueInput(Player, game_input.Left, input_event_type.KeyUp)

    QueueRightDown(Player:int):void =
        QueueInput(Player, game_input.Right, input_event_type.KeyDown)

    QueueRightUp(Player:int):void =
        QueueInput(Player, game_input.Right, input_event_type.KeyUp)

    QueueDownDown(Player:int):void =
        QueueInput(Player, game_input.Down, input_event_type.KeyDown)

    QueueDownUp(Player:int):void =
        QueueInput(Player, game_input.Down, input_event_type.KeyUp)

    QueueSlam(Player:int):void =
        QueueTap(Player, game_input.Up)

    QueueRotateCcw(Player:int):void =
        QueueTap(Player, game_input.RotateCcw)

    QueueRotateCw(Player:int):void =
        QueueTap(Player, game_input.RotateCw)

    GameModeName(Mode:game_mode):string =
        case (Mode):
            game_mode.Ready => "ready"
            game_mode.Playing => "playing"
            game_mode.Reconcile => "reconcile"
            game_mode.Destruction => "destruction"
            game_mode.Cascade => "cascade"
            game_mode.Ended => "ended"

    MatchResultName(Result:multi_game_result):string =
        case (Result.Kind):
            multi_game_result_kind.Win => "win"
            multi_game_result_kind.Lose => "lose"
            multi_game_result_kind.Draw => "draw"

    GridObjectKindName(Kind:grid_object_kind):string =
        case (Kind):
            grid_object_kind.Empty => "empty"
            grid_object_kind.Destroyed => "destroyed"
            grid_object_kind.PillTop => "pill_top"
            grid_object_kind.PillBottom => "pill_bottom"
            grid_object_kind.PillLeft => "pill_left"
            grid_object_kind.PillRight => "pill_right"
            grid_object_kind.PillSegment => "pill_segment"
            grid_object_kind.Virus => "virus"

    SpawnCellText(Grid:[][]grid_object, Col:int):string =
        Cell := grid_cell_location{Row := PillSpawnRow, Col := Col}
        MaybeObj := GetInGrid(Grid, Cell)
        if (Obj := MaybeObj?):
            GridObjectKindName(Obj.Kind)
        else:
            "missing"

    RunClock()<suspends>:void =
        var LastTime : float = GetSimulationElapsedTime()
        var Accumulator : float = 0.0

        loop:
            Sleep(SimStepSeconds)
            Now := GetSimulationElapsedTime()
            Delta := Now - LastTime
            set LastTime = Now
            set Accumulator += Delta

            if (Accumulator > 0.25):
                if (LogHeartbeat?):
                    Print("mrdario accumulator clamp from {Accumulator}")
                set Accumulator = 0.25

            var TicksThisUpdate : int = 0
            loop:
                if (Accumulator < SimStepSeconds or TicksThisUpdate >= MaxCatchupTicks):
                    break

                StepSimulation()
                set Accumulator -= SimStepSeconds
                set TicksThisUpdate += 1

            if (TicksThisUpdate > 0):
                Render()

    StepSimulation():void =
        Output := TickMultiGame(State, PendingActions)
        set State = Output.State
        set PendingActions =
            for (Player := 0..State.GameStates.Length - 1):
                array{}
        if (LogHeartbeat?):
            set HeartbeatCounter += 1
            if (HeartbeatCounter >= HeartbeatFrames):
                set HeartbeatCounter = 0
                Print("mrdario heartbeat: match frame {State.Frame}")
        LogTerminalState()
        LogStatePhase()
        LogGridSnapshot()

    LogTerminalState():void =
        if (Result := State.Result?):
            if (State.Frame = LastLoggedTerminalFrame):
                true
            else:
                set LastLoggedTerminalFrame = State.Frame
                PlayerText : string =
                    if (Player := Result.Player?):
                        "player {Player}"
                    else:
                        "no player"
                Print("mrdario terminal result: {MatchResultName(Result)} at frame {State.Frame}, {PlayerText}")
                for (Player := 0..State.GameStates.Length - 1):
                    if (GameState := State.GameStates[Player]):
                        PillText : string =
                            if (Pill := GameState.Pill?):
                                "pill {Pill.A.Row},{Pill.A.Col}-{Pill.B.Row},{Pill.B.Col}"
                            else:
                                "no pill"
                        SpawnA := SpawnCellText(GameState.Grid, PillSpawnCol)
                        SpawnB := SpawnCellText(GameState.Grid, PillSpawnCol + 1)
                        Print("mrdario terminal game {Player}: mode {GameModeName(GameState.Mode)}, frame {GameState.Frame}, gameTicks {GameState.GameTicks}, modeTicks {GameState.ModeTicks}, {PillText}, spawn {SpawnA}/{SpawnB}, score {GameState.Score}")

    LogStatePhase():void =
        if (LogPhaseChanges?):
            if (GameState := State.GameStates[0]):
                var ShouldLog : logic = false
                if (GameState.Mode = LastLoggedMode):
                    true
                else:
                    set ShouldLog = true
                if (State.Frame = LastLoggedFrame):
                    true
                else:
                    if (State.Frame < 20):
                        set ShouldLog = true
                    FrameMod := PositiveMod(State.Frame, 60)
                    if (FrameMod = 0):
                        set ShouldLog = true

                if (ShouldLog?):
                    set LastLoggedFrame = State.Frame
                    set LastLoggedMode = GameState.Mode
                    PillText : string =
                        if (Pill := GameState.Pill?):
                            "pill {Pill.A.Row},{Pill.A.Col}-{Pill.B.Row},{Pill.B.Col}"
                        else:
                            "no pill"
                    Print("mrdario phase: match {State.Frame}, game {GameState.Frame}, mode {GameModeName(GameState.Mode)}, modeTicks {GameState.ModeTicks}, gameTicks {GameState.GameTicks}, {PillText}")

    GridObjectSymbol(Obj:grid_object):string =
        Destroyed := IsDestroyed(Obj)
        if (Destroyed?):
            "x"
        else:
            MaybeColor := Obj.Color
            if (Color := MaybeColor?):
                if (Color = game_color.Color1):
                    "1"
                else if (Color = game_color.Color2):
                    "2"
                else:
                    "3"
            else:
                "."

    GridObjectKindSymbol(Obj:grid_object):string =
        case (Obj.Kind):
            grid_object_kind.Empty => "."
            grid_object_kind.Destroyed => "x"
            grid_object_kind.PillTop => "t"
            grid_object_kind.PillBottom => "b"
            grid_object_kind.PillLeft => "l"
            grid_object_kind.PillRight => "r"
            grid_object_kind.PillSegment => "s"
            grid_object_kind.Virus => "v"

    GridCellSymbol(Grid:[][]grid_object, Row:int, Col:int):string =
        Cell := grid_cell_location{Row := Row, Col := Col}
        MaybeObj := GetInGrid(Grid, Cell)
        if (Obj := MaybeObj?):
            GridObjectSymbol(Obj)
        else:
            "?"

    GridCellKindSymbol(Grid:[][]grid_object, Row:int, Col:int):string =
        Cell := grid_cell_location{Row := Row, Col := Col}
        MaybeObj := GetInGrid(Grid, Cell)
        if (Obj := MaybeObj?):
            GridObjectKindSymbol(Obj)
        else:
            "?"

    GridRowText(Grid:[][]grid_object, Row:int):string =
        var Text : string = ""
        for (Col := 0..PlayfieldWidth - 1):
            set Text = "{Text}{GridCellSymbol(Grid, Row, Col)}"
        Text

    GridKindRowText(Grid:[][]grid_object, Row:int):string =
        var Text : string = ""
        for (Col := 0..PlayfieldWidth - 1):
            set Text = "{Text}{GridCellKindSymbol(Grid, Row, Col)}"
        Text

    LogGridSnapshot():void =
        if (LogGridSnapshots?):
            set GridSnapshotCounter += 1
            if (GridSnapshotCounter >= GridSnapshotFrames):
                set GridSnapshotCounter = 0
                if (GameState := State.GameStates[0]):
                    Print("mrdario grid frame {State.Frame}, mode {GameModeName(GameState.Mode)}")
                    for (Row := 1..PlayfieldHeight):
                        Print("mrdario grid r{Row}: {GridRowText(GameState.Grid, Row)}")
                    if (LogGridKinds?):
                        Print("mrdario grid kind frame {State.Frame}")
                        for (Row := 1..PlayfieldHeight):
                            Print("mrdario kind r{Row}: {GridKindRowText(GameState.Grid, Row)}")

    Render():void =
        if (LogRenderBoundaries?):
            Print("mrdario render begin {State.Frame}")
        for (Board : Boards):
            if (GameState := State.GameStates[Board.BoardIndex]):
                Board.Render(GameState)
        if (LogRenderBoundaries?):
            Print("mrdario render end {State.Frame}")
