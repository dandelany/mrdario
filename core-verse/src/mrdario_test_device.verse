using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }
using { /UnrealEngine.com/Temporary/Diagnostics }

# smoke-test harness until we know whether pleasant verse unit tests exist.
mrdario_test_device := class(creative_device):
    OnBegin<override>()<suspends>:void =
        RunSmokeTests()

    RunSmokeTests():void =
        Initial := MakeInitialMultiGameState(2, 0, 15, "test-seed")
        Output := TickMultiGame(Initial, array{array{}, array{}})

        if (Output.State.Frame = 1):
            Print("mrdario smoke test passed")
        else:
            Print("mrdario smoke test FAILED")
