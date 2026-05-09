using { /Verse.org/Verse }

# deterministic pseudo-random helpers for simulation code.
# mirrors core/src/utils/random.ts, which uses seedrandom.alea(seed) and reads the first value.

mash_output := struct:
    N : float = 0.0
    Value : float = 0.0

CharCode(Char:char):int =
    if (Char = ' '):
        32
    else if (Char = '0'):
        48
    else if (Char = '1'):
        49
    else if (Char = '2'):
        50
    else if (Char = '3'):
        51
    else if (Char = '4'):
        52
    else if (Char = '5'):
        53
    else if (Char = '6'):
        54
    else if (Char = '7'):
        55
    else if (Char = '8'):
        56
    else if (Char = '9'):
        57
    else if (Char = 'a'):
        97
    else if (Char = 'b'):
        98
    else if (Char = 'c'):
        99
    else if (Char = 'd'):
        100
    else if (Char = 'e'):
        101
    else if (Char = 'f'):
        102
    else if (Char = 'g'):
        103
    else if (Char = 'h'):
        104
    else if (Char = 'i'):
        105
    else if (Char = 'j'):
        106
    else if (Char = 'k'):
        107
    else if (Char = 'l'):
        108
    else if (Char = 'm'):
        109
    else if (Char = 'n'):
        110
    else if (Char = 'o'):
        111
    else if (Char = 'p'):
        112
    else if (Char = 'q'):
        113
    else if (Char = 'r'):
        114
    else if (Char = 's'):
        115
    else if (Char = 't'):
        116
    else if (Char = 'u'):
        117
    else if (Char = 'v'):
        118
    else if (Char = 'w'):
        119
    else if (Char = 'x'):
        120
    else if (Char = 'y'):
        121
    else if (Char = 'z'):
        122
    else if (Char = 'A'):
        65
    else if (Char = 'B'):
        66
    else if (Char = 'C'):
        67
    else if (Char = 'D'):
        68
    else if (Char = 'E'):
        69
    else if (Char = 'F'):
        70
    else if (Char = 'G'):
        71
    else if (Char = 'H'):
        72
    else if (Char = 'I'):
        73
    else if (Char = 'J'):
        74
    else if (Char = 'K'):
        75
    else if (Char = 'L'):
        76
    else if (Char = 'M'):
        77
    else if (Char = 'N'):
        78
    else if (Char = 'O'):
        79
    else if (Char = 'P'):
        80
    else if (Char = 'Q'):
        81
    else if (Char = 'R'):
        82
    else if (Char = 'S'):
        83
    else if (Char = 'T'):
        84
    else if (Char = 'U'):
        85
    else if (Char = 'V'):
        86
    else if (Char = 'W'):
        87
    else if (Char = 'X'):
        88
    else if (Char = 'Y'):
        89
    else if (Char = 'Z'):
        90
    else if (Char = '-'):
        45
    else if (Char = '_'):
        95
    else if (Char = '"'):
        34
    else:
        63

FloorOrZero(Value:float):int =
    Floor[Value] or 0

MashString(InitialN:float, Data:string):mash_output =
    var N : float = InitialN

    if (Data.Length > 0):
        for (Index := 0..Data.Length - 1):
            if (Char := Data[Index]):
                set N += CharCode(Char) * 1.0
                var H : float = 0.02519603282416938 * N
                set N = FloorOrZero(H) * 1.0
                set H -= N
                set H *= N
                set N = FloorOrZero(H) * 1.0
                set H -= N
                set N += H * 4294967296.0

    mash_output{
        N := N,
        Value := FloorOrZero(N) * 2.3283064365386963e-10
    }

SeedRandom(Seed:string):float =
    var MashN : float = 4022871197.0

    MashSpace0 := MashString(MashN, " ")
    set MashN = MashSpace0.N
    var S0 : float = MashSpace0.Value

    MashSpace1 := MashString(MashN, " ")
    set MashN = MashSpace1.N
    var S1 : float = MashSpace1.Value

    MashSpace2 := MashString(MashN, " ")
    set MashN = MashSpace2.N
    var S2 : float = MashSpace2.Value

    MashSeed0 := MashString(MashN, Seed)
    set MashN = MashSeed0.N
    set S0 -= MashSeed0.Value
    if (S0 < 0.0):
        set S0 += 1.0

    MashSeed1 := MashString(MashN, Seed)
    set MashN = MashSeed1.N
    set S1 -= MashSeed1.Value
    if (S1 < 0.0):
        set S1 += 1.0

    MashSeed2 := MashString(MashN, Seed)
    set S2 -= MashSeed2.Value
    if (S2 < 0.0):
        set S2 += 1.0

    T := (2091639.0 * S0) + 2.3283064365386963e-10
    T - (FloorOrZero(T) * 1.0)

PositiveMod(Value:int, Modulus:int):int =
    if (Modulus <= 0):
        0
    else:
        DivCount := Quotient[Value, Modulus] or 0
        var Result : int = Value - (DivCount * Modulus)
        if (Result < 0):
            set Result += Modulus
        Result

HashSeed(Seed:string):int =
    var Hash : int = 17

    if (Seed.Length > 0):
        for (Index := 0..Seed.Length - 1):
            if (Char := Seed[Index]):
                Code := CharCode(Char)
                set Hash = PositiveMod((Hash * 37) + Code + Index, 251)

    Hash

SeedRandomInt(Seed:string, Low:int, High:int):int =
    LowBound : int =
        if (Low <= High):
            Low
        else:
            High
    HighBound : int =
        if (Low <= High):
            High
        else:
            Low

    Span := HighBound - LowBound + 1
    RandomScaled := SeedRandom(Seed) * (Span * 1.0)
    LowBound + FloorOrZero(RandomScaled)

SeedRandomColor(Seed:string):game_color =
    case (SeedRandomInt(Seed, 0, 2)):
        0 => game_color.Color1
        1 => game_color.Color2
        _ => game_color.Color3
