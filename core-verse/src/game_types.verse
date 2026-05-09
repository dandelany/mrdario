# core simulation types for mr. dario.
# note: this is a first-pass verse sketch; expect uefn compiler feedback.

game_color := enum{Color1, Color2, Color3}

game_mode := enum{Ready, Playing, Reconcile, Destruction, Cascade, Ended}

game_input := enum{Left, Right, Up, Down, RotateCcw, RotateCw}

input_event_type := enum{KeyDown, KeyUp}

grid_direction := enum{Up, Down, Left, Right}

rotate_direction := enum{Clockwise, CounterClockwise}

grid_object_kind := enum{Empty, Destroyed, PillTop, PillBottom, PillLeft, PillRight, PillSegment, Virus}

game_action_kind := enum{Move, Garbage, Defeat, ForfeitWin}

game_tick_result_kind := enum{Win, Lose, Combo}

multi_game_result_kind := enum{Win, Lose, Draw}

cell_render_kind := enum{Empty, Virus, Pill, Destroyed}

cell_visual_kind := enum{Empty, PillColor1, PillColor2, PillColor3, VirusColor1, VirusColor2, VirusColor3, Destroyed}

grid_cell_location := struct:
    Row : int = 0
    Col : int = 0

grid_cell_delta := struct:
    Row : int = 0
    Col : int = 0

pill_location := struct:
    A : grid_cell_location = grid_cell_location{}
    B : grid_cell_location = grid_cell_location{}

pill_colors := struct:
    A : game_color = game_color.Color1
    B : game_color = game_color.Color1

grid_object := struct:
    Kind : grid_object_kind = grid_object_kind.Empty
    Color : ?game_color = false

moving_counters := struct:
    Left : ?int = false
    Right : ?int = false
    Up : ?int = false
    Down : ?int = false
    RotateCcw : ?int = false
    RotateCw : ?int = false

game_action := struct:
    Kind : game_action_kind = game_action_kind.Move
    Input : ?game_input = false
    EventType : ?input_event_type = false
    Colors : []game_color = array{}

game_tick_result := struct:
    Kind : game_tick_result_kind = game_tick_result_kind.Win
    Colors : []game_color = array{}

game_state := struct:
    Mode : game_mode = game_mode.Ready
    Grid : [][]grid_object = array{}
    Pill : ?pill_location = false
    NextPill : pill_colors = pill_colors{}
    MovingCounters : moving_counters = moving_counters{}
    Seed : string = "mrdario"
    Level : int = 0
    BaseSpeed : int = 15
    Frame : int = 0
    GameTicks : int = 0
    ModeTicks : int = 0
    PillCount : int = 0
    Score : int = 0
    TimeBonus : int = 0
    LineColors : []game_color = array{}
    Garbage : []game_color = array{}

multi_game_result := struct:
    Kind : multi_game_result_kind = multi_game_result_kind.Draw
    Player : ?int = false
    Players : []int = array{}

multi_game_state := struct:
    Frame : int = 0
    GameStates : []game_state = array{}
    QueuedActions : [][]game_action = array{}
    Result : ?multi_game_result = false

game_tick_output := struct:
    State : game_state = game_state{}
    Result : ?game_tick_result = false

multi_game_tick_output := struct:
    State : multi_game_state = multi_game_state{}
    GameResults : []?game_tick_result = array{}
    Result : ?multi_game_result = false

give_pill_output := struct:
    Grid : [][]grid_object = array{}
    Pill : pill_location = pill_location{}
    DidGive : logic = false

move_cell_output := struct:
    Grid : [][]grid_object = array{}
    Cell : grid_cell_location = grid_cell_location{}
    DidMove : logic = false

move_pill_output := struct:
    Grid : [][]grid_object = array{}
    Pill : pill_location = pill_location{}
    DidMove : logic = false

destroy_lines_output := struct:
    Grid : [][]grid_object = array{}
    HasLines : logic = false
    DestroyedCount : int = 0
    VirusCount : int = 0
    LineColors : []game_color = array{}

drop_debris_output := struct:
    Grid : [][]grid_object = array{}
    FallingCells : []grid_cell_location = array{}

generate_virus_output := struct:
    Grid : [][]grid_object = array{}
    DidGenerate : logic = false

input_repeat_output := struct:
    MovingCounters : moving_counters = moving_counters{}
    Inputs : []game_input = array{}
    DownHeld : logic = false

cell_render_state := struct:
    Kind : cell_render_kind = cell_render_kind.Empty
    Color : ?game_color = false

PlayfieldWidth : int = 8
PlayfieldHeight : int = 16
PillSpawnRow : int = 1
PillSpawnCol : int = 3
LineLength : int = 4
DestroyTickCount : int = 20
CascadeTickCount : int = 20
AccelerateInterval : int = 10
SimHz : float = 60.0
SimStepSeconds : float = 1.0 / SimHz
MaxCatchupTicks : int = 6
