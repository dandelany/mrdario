using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }
using { /UnrealEngine.com/Temporary/Diagnostics }

# bridges uefn input_trigger_devices into deterministic per-player game actions.
mrdario_input_device := class(creative_device):
    @editable
    Match : mrdario_match_device = mrdario_match_device{}

    @editable
    PlayerIndex : int = 0

    @editable
    LeftInput : input_trigger_device = input_trigger_device{}

    @editable
    RightInput : input_trigger_device = input_trigger_device{}

    @editable
    DownInput : input_trigger_device = input_trigger_device{}

    @editable
    SlamInput : input_trigger_device = input_trigger_device{}

    @editable
    RotateCcwInput : input_trigger_device = input_trigger_device{}

    @editable
    RotateCwInput : input_trigger_device = input_trigger_device{}

    OnBegin<override>()<suspends>:void =
        LeftInput.PressedEvent.Subscribe(OnLeftPressed)
        LeftInput.ReleasedEvent.Subscribe(OnLeftReleased)
        RightInput.PressedEvent.Subscribe(OnRightPressed)
        RightInput.ReleasedEvent.Subscribe(OnRightReleased)
        DownInput.PressedEvent.Subscribe(OnDownPressed)
        DownInput.ReleasedEvent.Subscribe(OnDownReleased)
        SlamInput.PressedEvent.Subscribe(OnSlamPressed)
        RotateCcwInput.PressedEvent.Subscribe(OnRotateCcwPressed)
        RotateCwInput.PressedEvent.Subscribe(OnRotateCwPressed)

    OnLeftPressed(Agent:agent):void =
        Match.QueueInput(PlayerIndex, game_input.Left, input_event_type.KeyDown)

    OnLeftReleased(Agent:agent, Duration:float):void =
        Match.QueueInput(PlayerIndex, game_input.Left, input_event_type.KeyUp)

    OnRightPressed(Agent:agent):void =
        Match.QueueInput(PlayerIndex, game_input.Right, input_event_type.KeyDown)

    OnRightReleased(Agent:agent, Duration:float):void =
        Match.QueueInput(PlayerIndex, game_input.Right, input_event_type.KeyUp)

    OnDownPressed(Agent:agent):void =
        Match.QueueInput(PlayerIndex, game_input.Down, input_event_type.KeyDown)

    OnDownReleased(Agent:agent, Duration:float):void =
        Match.QueueInput(PlayerIndex, game_input.Down, input_event_type.KeyUp)

    OnSlamPressed(Agent:agent):void =
        Match.QueueTap(PlayerIndex, game_input.Up)

    OnRotateCcwPressed(Agent:agent):void =
        Match.QueueTap(PlayerIndex, game_input.RotateCcw)

    OnRotateCwPressed(Agent:agent):void =
        Match.QueueTap(PlayerIndex, game_input.RotateCw)
