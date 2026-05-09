# multigame wrapper around N single-board game states.

MakeInitialMultiGameState(PlayerCount:int, Level:int, BaseSpeed:int, Seed:string):multi_game_state =
    InitialGameStates :=
        for (Player := 0..PlayerCount - 1):
            MakeInitialGameState(Level, BaseSpeed, Seed)
    InitialQueuedActions :=
        for (Player := 0..PlayerCount - 1):
            array{}

    multi_game_state{
        Frame := 0,
        GameStates := InitialGameStates,
        QueuedActions := InitialQueuedActions
    }

EmptyActionQueues(PlayerCount:int):[][]game_action =
    for (Player := 0..PlayerCount - 1):
        array{}

MergeActions(QueuedActions:[]game_action, ExternalActions:[]game_action):[]game_action =
    var Result : []game_action = array{}

    for (Action : QueuedActions):
        set Result += array{Action}

    for (Action : ExternalActions):
        set Result += array{Action}

    Result

QueueComboGarbage(Results:[]?game_tick_result, PlayerCount:int):[][]game_action =
    var QueuedActions : [][]game_action = EmptyActionQueues(PlayerCount)

    for (ComboPlayer := 0..Results.Length - 1):
        if (Result := Results[ComboPlayer]?):
            if (Result.Kind = game_tick_result_kind.Combo):
                for (TargetPlayer := 0..PlayerCount - 1):
                    if (TargetPlayer = ComboPlayer):
                        true
                    else:
                        if (TargetActions := QueuedActions[TargetPlayer]):
                            var NextActions : []game_action = TargetActions
                            set NextActions += array{game_action{
                                Kind := game_action_kind.Garbage,
                                Colors := Result.Colors
                            }}
                            if (set QueuedActions[TargetPlayer] = NextActions):
                                true

    QueuedActions

TickMultiGame(State:multi_game_state, ActionsByPlayer:[][]game_action):multi_game_tick_output =
    if (State.Result?):
        multi_game_tick_output{State := State, Result := State.Result}
    else:
        var NextGames : []game_state = array{}
        var Results : []?game_tick_result = array{}
        var Winner : ?int = false
        var Losers : []int = array{}

        for (Player := 0..State.GameStates.Length - 1):
            if (GameState := State.GameStates[Player]):
                ExternalActions : []game_action =
                    if (Actions := ActionsByPlayer[Player]):
                        Actions
                    else:
                        array{}
                QueuedActions : []game_action =
                    if (Actions := State.QueuedActions[Player]):
                        Actions
                    else:
                        array{}
                PlayerActions := MergeActions(QueuedActions, ExternalActions)
                Output := TickGame(GameState, PlayerActions)
                set NextGames += array{Output.State}
                set Results += array{Output.Result}

                if (Result := Output.Result?):
                    if (Result.Kind = game_tick_result_kind.Win):
                        set Winner = option{Player}
                    else if (Result.Kind = game_tick_result_kind.Lose):
                        set Losers += array{Player}

        var MatchResult : ?multi_game_result = false
        if (WinningPlayer := Winner?):
            set MatchResult = option{multi_game_result{
                Kind := multi_game_result_kind.Win,
                Player := option{WinningPlayer},
                Players := array{WinningPlayer}
            }}
        else if (Losers.Length = 1):
            if (LosingPlayer := Losers[0]):
                set MatchResult = option{multi_game_result{
                    Kind := multi_game_result_kind.Lose,
                    Player := option{LosingPlayer},
                    Players := array{LosingPlayer}
                }}
        else if (Losers.Length > 1):
            set MatchResult = option{multi_game_result{
                Kind := multi_game_result_kind.Draw,
                Players := Losers
            }}

        NextQueuedActions : [][]game_action =
            if (MatchResult?):
                EmptyActionQueues(NextGames.Length)
            else:
                QueueComboGarbage(Results, NextGames.Length)

        NextState := multi_game_state{
            Frame := State.Frame + 1,
            GameStates := NextGames,
            QueuedActions := NextQueuedActions,
            Result := MatchResult
        }
        multi_game_tick_output{State := NextState, GameResults := Results, Result := MatchResult}
