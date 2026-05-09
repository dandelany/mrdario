# grid helpers. keep all failable array access here when possible.

MakeEmpty():grid_object =
    grid_object{Kind := grid_object_kind.Empty}

MakeDestroyed():grid_object =
    grid_object{Kind := grid_object_kind.Destroyed}

MakeVirus(Color:game_color):grid_object =
    grid_object{Kind := grid_object_kind.Virus, Color := option{Color}}

MakePillTop(Color:game_color):grid_object =
    grid_object{Kind := grid_object_kind.PillTop, Color := option{Color}}

MakePillBottom(Color:game_color):grid_object =
    grid_object{Kind := grid_object_kind.PillBottom, Color := option{Color}}

MakePillLeft(Color:game_color):grid_object =
    grid_object{Kind := grid_object_kind.PillLeft, Color := option{Color}}

MakePillRight(Color:game_color):grid_object =
    grid_object{Kind := grid_object_kind.PillRight, Color := option{Color}}

MakePillSegment(Color:game_color):grid_object =
    grid_object{Kind := grid_object_kind.PillSegment, Color := option{Color}}

HasColor(Obj:grid_object):logic =
    if (Obj.Color?):
        true
    else:
        false

IsEmpty(Obj:grid_object):logic =
    if (Obj.Kind = grid_object_kind.Empty):
        true
    else:
        false

IsVirus(Obj:grid_object):logic =
    if (Obj.Kind = grid_object_kind.Virus):
        true
    else:
        false

IsDestroyed(Obj:grid_object):logic =
    if (Obj.Kind = grid_object_kind.Destroyed):
        true
    else:
        false

IsPillTop(Obj:grid_object):logic =
    if (Obj.Kind = grid_object_kind.PillTop):
        true
    else:
        false

IsPillBottom(Obj:grid_object):logic =
    if (Obj.Kind = grid_object_kind.PillBottom):
        true
    else:
        false

IsPillLeft(Obj:grid_object):logic =
    if (Obj.Kind = grid_object_kind.PillLeft):
        true
    else:
        false

IsPillRight(Obj:grid_object):logic =
    if (Obj.Kind = grid_object_kind.PillRight):
        true
    else:
        false

IsPillSegment(Obj:grid_object):logic =
    if (Obj.Kind = grid_object_kind.PillSegment):
        true
    else:
        false

IsPillHalf(Obj:grid_object):logic =
    if (Obj.Kind = grid_object_kind.PillTop):
        true
    else if (Obj.Kind = grid_object_kind.PillBottom):
        true
    else if (Obj.Kind = grid_object_kind.PillLeft):
        true
    else if (Obj.Kind = grid_object_kind.PillRight):
        true
    else:
        false

IsPillPart(Obj:grid_object):logic =
    PillHalf := IsPillHalf(Obj)
    if (PillHalf?):
        true
    else if (Obj.Kind = grid_object_kind.PillSegment):
        true
    else:
        false

RenderStateForObject(Obj:grid_object):cell_render_state =
    Destroyed := IsDestroyed(Obj)
    Virus := IsVirus(Obj)
    PillPart := IsPillPart(Obj)

    if (Destroyed?):
        cell_render_state{Kind := cell_render_kind.Destroyed}
    else if (Virus?):
        cell_render_state{Kind := cell_render_kind.Virus, Color := Obj.Color}
    else if (PillPart?):
        cell_render_state{Kind := cell_render_kind.Pill, Color := Obj.Color}
    else:
        cell_render_state{Kind := cell_render_kind.Empty}

VisualKindForRenderState(RenderState:cell_render_state):cell_visual_kind =
    if (RenderState.Kind = cell_render_kind.Pill):
        MaybeColor := RenderState.Color
        if (Color := MaybeColor?):
            if (Color = game_color.Color1):
                cell_visual_kind.PillColor1
            else if (Color = game_color.Color2):
                cell_visual_kind.PillColor2
            else:
                cell_visual_kind.PillColor3
        else:
            cell_visual_kind.Empty
    else if (RenderState.Kind = cell_render_kind.Virus):
        MaybeColor := RenderState.Color
        if (Color := MaybeColor?):
            if (Color = game_color.Color1):
                cell_visual_kind.VirusColor1
            else if (Color = game_color.Color2):
                cell_visual_kind.VirusColor2
            else:
                cell_visual_kind.VirusColor3
        else:
            cell_visual_kind.Empty
    else if (RenderState.Kind = cell_render_kind.Destroyed):
        cell_visual_kind.Destroyed
    else:
        cell_visual_kind.Empty

VisualKindForObject(Obj:grid_object):cell_visual_kind =
    VisualKindForRenderState(RenderStateForObject(Obj))

IsInBounds(Cell:grid_cell_location):logic =
    if (Cell.Row < 0):
        false
    else if (Cell.Row >= PlayfieldHeight + 1):
        false
    else if (Cell.Col < 0):
        false
    else if (Cell.Col >= PlayfieldWidth):
        false
    else:
        true

DeltaForDirection(Direction:grid_direction):grid_cell_delta =
    case (Direction):
        grid_direction.Up => grid_cell_delta{Row := -1, Col := 0}
        grid_direction.Down => grid_cell_delta{Row := 1, Col := 0}
        grid_direction.Left => grid_cell_delta{Row := 0, Col := -1}
        grid_direction.Right => grid_cell_delta{Row := 0, Col := 1}

MoveCellLocation(Cell:grid_cell_location, Direction:grid_direction):grid_cell_location =
    Delta := DeltaForDirection(Direction)
    grid_cell_location{Row := Cell.Row + Delta.Row, Col := Cell.Col + Delta.Col}

IsSameCell(A:grid_cell_location, B:grid_cell_location):logic =
    if (A.Row = B.Row):
        if (A.Col = B.Col):
            true
        else:
            false
    else:
        false

IsSameColor(A:game_color, B:game_color):logic =
    if (A = game_color.Color1):
        if (B = game_color.Color1):
            true
        else:
            false
    else if (A = game_color.Color2):
        if (B = game_color.Color2):
            true
        else:
            false
    else if (A = game_color.Color3):
        if (B = game_color.Color3):
            true
        else:
            false
    else:
        false

HasSameColor(Obj:grid_object, Color:game_color):logic =
    MaybeColor := Obj.Color
    if (ObjColor := MaybeColor?):
        SameColor := IsSameColor(ObjColor, Color)
        if (SameColor?):
            true
        else:
            false
    else:
        false

HasColorInNeighbor(Grid:[][]grid_object, Cell:grid_cell_location, Color:game_color):logic =
    UpCell := grid_cell_location{Row := Cell.Row - 2, Col := Cell.Col}
    DownCell := grid_cell_location{Row := Cell.Row + 2, Col := Cell.Col}
    LeftCell := grid_cell_location{Row := Cell.Row, Col := Cell.Col - 2}
    RightCell := grid_cell_location{Row := Cell.Row, Col := Cell.Col + 2}

    var Found : logic = false

    MaybeUp := GetInGrid(Grid, UpCell)
    if (Obj := MaybeUp?):
        Same := HasSameColor(Obj, Color)
        if (Same?):
            set Found = true

    MaybeDown := GetInGrid(Grid, DownCell)
    if (Obj := MaybeDown?):
        Same := HasSameColor(Obj, Color)
        if (Same?):
            set Found = true

    MaybeLeft := GetInGrid(Grid, LeftCell)
    if (Obj := MaybeLeft?):
        Same := HasSameColor(Obj, Color)
        if (Same?):
            set Found = true

    MaybeRight := GetInGrid(Grid, RightCell)
    if (Obj := MaybeRight?):
        Same := HasSameColor(Obj, Color)
        if (Same?):
            set Found = true

    Found

IsValidVirusColor(Grid:[][]grid_object, Cell:grid_cell_location, Color:game_color):logic =
    NeighborHasColor := HasColorInNeighbor(Grid, Cell, Color)
    if (NeighborHasColor?):
        false
    else:
        true

IsValidVirusLocation(Grid:[][]grid_object, Cell:grid_cell_location):logic =
    MaybeObj := GetInGrid(Grid, Cell)
    if (Obj := MaybeObj?):
        Empty := IsEmpty(Obj)
        if (Empty?):
            Color1Nearby := HasColorInNeighbor(Grid, Cell, game_color.Color1)
            Color2Nearby := HasColorInNeighbor(Grid, Cell, game_color.Color2)
            Color3Nearby := HasColorInNeighbor(Grid, Cell, game_color.Color3)

            if (Color1Nearby?):
                if (Color2Nearby?):
                    if (Color3Nearby?):
                        false
                    else:
                        true
                else:
                    true
            else:
                true
        else:
            false
    else:
        false

MinVirusRow(Level:int):int =
    # offset by +1 for the hidden true top row.
    if (Level < 14):
        7
    else if (Level < 16):
        6
    else if (Level < 18):
        5
    else:
        4

LevelVirusCount(Level:int):int =
    if (Level <= 0):
        4
    else if (Level = 1):
        8
    else if (Level = 2):
        12
    else if (Level = 3):
        16
    else if (Level = 4):
        20
    else if (Level = 5):
        24
    else if (Level = 6):
        28
    else if (Level = 7):
        32
    else if (Level = 8):
        36
    else if (Level = 9):
        40
    else if (Level = 10):
        44
    else if (Level = 11):
        48
    else if (Level = 12):
        52
    else if (Level = 13):
        56
    else if (Level = 14):
        60
    else if (Level = 15):
        64
    else if (Level = 16):
        68
    else if (Level = 17):
        72
    else if (Level = 18):
        76
    else if (Level = 19):
        80
    else:
        84

NextGridCell(Cell:grid_cell_location):?grid_cell_location =
    var Row : int = Cell.Row
    var Col : int = Cell.Col + 1

    if (Col >= PlayfieldWidth):
        set Col = 0
        set Row += 1

    if (Row > PlayfieldHeight):
        false
    else:
        option{grid_cell_location{Row := Row, Col := Col}}

ColorFromIndex(Index:int):game_color =
    if (Index = 0):
        game_color.Color1
    else if (Index = 1):
        game_color.Color2
    else:
        game_color.Color3

VirusRetryColor(BaseSeed:string, ColorSeed:int):game_color =
    ColorIndex := PositiveMod(ColorSeed, 3) + 1
    if (ColorIndex = 3):
        SeedRandomColor("{BaseSeed}color{ColorSeed}")
    else:
        ColorFromIndex(ColorIndex)

GenerateVirus(Grid:[][]grid_object, Level:int, Remaining:int, Seed:string):generate_virus_output =
    MinRow := MinVirusRow(Level)
    BaseSeed := "genVirus-{Seed}-{Level}-{Remaining}"
    var Cell : grid_cell_location = grid_cell_location{
        Row := SeedRandomInt("{BaseSeed}row", MinRow, PlayfieldHeight),
        Col := SeedRandomInt("{BaseSeed}col", 0, PlayfieldWidth - 1)
    }
    var DidFindCell : logic = false

    loop:
        ValidLocation := IsValidVirusLocation(Grid, Cell)
        if (ValidLocation?):
            set DidFindCell = true
            break
        else:
            MaybeNext := NextGridCell(Cell)
            if (Next := MaybeNext?):
                set Cell = Next
            else:
                break

    if (DidFindCell?):
        var ColorSeed : int = PositiveMod(Remaining, 4)
        var Color : game_color =
            if (ColorSeed = 3):
                SeedRandomColor("{BaseSeed}color")
            else:
                ColorFromIndex(ColorSeed)

        var Tries : int = 0
        var DidFindColor : logic = false
        loop:
            ValidColor := IsValidVirusColor(Grid, Cell, Color)
            if (ValidColor?):
                set DidFindColor = true
                break
            else:
                set ColorSeed += 1
                set Tries += 1
                if (Tries > 256):
                    break
                set Color = VirusRetryColor(BaseSeed, ColorSeed)

        if (DidFindColor?):
            generate_virus_output{Grid := SetInGrid(Grid, Cell, MakeVirus(Color)), DidGenerate := true}
        else:
            generate_virus_output{Grid := Grid, DidGenerate := false}
    else:
        generate_virus_output{Grid := Grid, DidGenerate := false}

GenerateEnemies(Grid:[][]grid_object, Level:int, Seed:string):[][]grid_object =
    var NextGrid : [][]grid_object = Grid
    var Remaining : int = LevelVirusCount(Level)
    var VirusSeed : int = 0

    loop:
        if (Remaining <= 0):
            break
        Generated := GenerateVirus(NextGrid, Level, Remaining, "{Seed}{VirusSeed}")
        set VirusSeed += 1
        if (Generated.DidGenerate?):
            set NextGrid = Generated.Grid
            set Remaining -= 1
        else if (VirusSeed > 4096):
            break

    NextGrid

SeedShuffleColumns(Seed:string):[]int =
    var Columns : []int = array{0, 1, 2, 3, 4, 5, 6, 7}

    for (Index := 0..PlayfieldWidth - 1):
        Rand := SeedRandomInt("{Seed}{Index}", Index, PlayfieldWidth - 1)
        if (IndexValue := Columns[Index]):
            if (RandValue := Columns[Rand]):
                if (set Columns[Index] = RandValue):
                    if (set Columns[Rand] = IndexValue):
                        true

    Columns

MakeEmptyGrid(Width:int, Height:int):[][]grid_object =
    for (Row := 0..Height - 1):
        for (Col := 0..Width - 1):
            MakeEmpty()

GetInGrid(Grid:[][]grid_object, Cell:grid_cell_location):?grid_object =
    if (Row := Grid[Cell.Row], Obj := Row[Cell.Col]):
        option{Obj}
    else:
        false

SetInGrid(Grid:[][]grid_object, Cell:grid_cell_location, Obj:grid_object):[][]grid_object =
    var NextGrid : [][]grid_object = Grid
    if (Row := NextGrid[Cell.Row]):
        var NextRow : []grid_object = Row
        if (set NextRow[Cell.Col] = Obj):
            if (set NextGrid[Cell.Row] = NextRow):
                NextGrid
            else:
                Grid
        else:
            Grid
    else:
        Grid

RemoveCell(Grid:[][]grid_object, Cell:grid_cell_location):[][]grid_object =
    SetInGrid(Grid, Cell, MakeEmpty())

CanMoveCell(Grid:[][]grid_object, Cell:grid_cell_location, Direction:grid_direction):logic =
    NextCell := MoveCellLocation(Cell, Direction)
    InBounds := IsInBounds(NextCell)
    if (InBounds?):
        MaybeObj := GetInGrid(Grid, NextCell)
        if (Obj := MaybeObj?):
            Empty := IsEmpty(Obj)
            if (Empty?):
                true
            else:
                false
        else:
            false
    else:
        false

MoveCell(Grid:[][]grid_object, Cell:grid_cell_location, Direction:grid_direction):move_cell_output =
    NextCell := MoveCellLocation(Cell, Direction)
    CanMove := CanMoveCell(Grid, Cell, Direction)
    if (CanMove?):
        MaybeObj := GetInGrid(Grid, Cell)
        if (Obj := MaybeObj?):
            NextGrid := RemoveCell(SetInGrid(Grid, NextCell, Obj), Cell)
            move_cell_output{Grid := NextGrid, Cell := NextCell, DidMove := true}
        else:
            move_cell_output{Grid := Grid, Cell := Cell, DidMove := false}
    else:
        move_cell_output{Grid := Grid, Cell := Cell, DidMove := false}

CellBlockedForPill(Grid:[][]grid_object, Target:grid_cell_location, OtherHalf:grid_cell_location):logic =
    SameCell := IsSameCell(Target, OtherHalf)
    if (SameCell?):
        false
    else:
        MaybeObj := GetInGrid(Grid, Target)
        if (Obj := MaybeObj?):
            Empty := IsEmpty(Obj)
            if (Empty?):
                false
            else:
                true
        else:
            true

CanMovePill(Grid:[][]grid_object, Pill:pill_location, Direction:grid_direction):logic =
    NextA := MoveCellLocation(Pill.A, Direction)
    NextB := MoveCellLocation(Pill.B, Direction)

    AInBounds := IsInBounds(NextA)
    BInBounds := IsInBounds(NextB)

    if (AInBounds?):
        if (BInBounds?):
            ABlocked := CellBlockedForPill(Grid, NextA, Pill.B)
            if (ABlocked?):
                false
            else:
                BBlocked := CellBlockedForPill(Grid, NextB, Pill.A)
                if (BBlocked?):
                    false
                else:
                    true
        else:
            false
    else:
        false

MovePill(Grid:[][]grid_object, Pill:pill_location, Direction:grid_direction):move_pill_output =
    CanMove := CanMovePill(Grid, Pill, Direction)
    if (CanMove?):
        NextA := MoveCellLocation(Pill.A, Direction)
        NextB := MoveCellLocation(Pill.B, Direction)
        MaybeObjA := GetInGrid(Grid, Pill.A)
        MaybeObjB := GetInGrid(Grid, Pill.B)
        if (ObjA := MaybeObjA?):
            if (ObjB := MaybeObjB?):
                ClearedGrid := RemoveCell(RemoveCell(Grid, Pill.A), Pill.B)
                NextGrid := SetInGrid(SetInGrid(ClearedGrid, NextA, ObjA), NextB, ObjB)
                move_pill_output{
                    Grid := NextGrid,
                    Pill := pill_location{A := NextA, B := NextB},
                    DidMove := true
                }
            else:
                move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}
        else:
            move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}
    else:
        move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}

GivePill(Grid:[][]grid_object, Colors:pill_colors):give_pill_output =
    Pill := pill_location{
        A := grid_cell_location{Row := PillSpawnRow, Col := PillSpawnCol},
        B := grid_cell_location{Row := PillSpawnRow, Col := PillSpawnCol + 1}
    }

    MaybeObjA := GetInGrid(Grid, Pill.A)
    MaybeObjB := GetInGrid(Grid, Pill.B)
    if (ObjA := MaybeObjA?):
        if (ObjB := MaybeObjB?):
            AEmpty := IsEmpty(ObjA)
            BEmpty := IsEmpty(ObjB)
            if (AEmpty?):
                if (BEmpty?):
                    NextGrid := SetInGrid(
                        SetInGrid(Grid, Pill.A, MakePillLeft(Colors.A)),
                        Pill.B,
                        MakePillRight(Colors.B)
                    )
                    give_pill_output{Grid := NextGrid, Pill := Pill, DidGive := true}
                else:
                    give_pill_output{Grid := Grid, Pill := Pill, DidGive := false}
            else:
                give_pill_output{Grid := Grid, Pill := Pill, DidGive := false}
        else:
            give_pill_output{Grid := Grid, Pill := Pill, DidGive := false}
    else:
        give_pill_output{Grid := Grid, Pill := Pill, DidGive := false}

RotatePill(Grid:[][]grid_object, Pill:pill_location, Direction:rotate_direction):move_pill_output =
    MaybeObjA := GetInGrid(Grid, Pill.A)
    MaybeObjB := GetInGrid(Grid, Pill.B)

    if (ObjA := MaybeObjA?):
        if (ObjB := MaybeObjB?):
            MaybeColorA := ObjA.Color
            MaybeColorB := ObjB.Color
            if (ColorA := MaybeColorA?):
                if (ColorB := MaybeColorB?):
                    Horizontal := IsPillLeft(ObjA)
                    Vertical := IsPillTop(ObjA)

                    if (Vertical?):
                        RightCell := grid_cell_location{Row := Pill.B.Row, Col := Pill.B.Col + 1}
                        RightInBounds := IsInBounds(RightCell)
                        var CanUseRight : logic = false
                        if (RightInBounds?):
                            MaybeRight := GetInGrid(Grid, RightCell)
                            if (RightObj := MaybeRight?):
                                RightEmpty := IsEmpty(RightObj)
                                if (RightEmpty?):
                                    set CanUseRight = true

                        if (CanUseRight?):
                            NextA := Pill.B
                            NextB := RightCell
                            var Clockwise : logic = false
                            if (Direction = rotate_direction.Clockwise):
                                set Clockwise = true

                            if (Clockwise?):
                                ClearedGrid := RemoveCell(Grid, Pill.A)
                                NextGrid := SetInGrid(
                                    SetInGrid(ClearedGrid, NextA, MakePillLeft(ColorB)),
                                    NextB,
                                    MakePillRight(ColorA)
                                )
                                move_pill_output{
                                    Grid := NextGrid,
                                    Pill := pill_location{A := NextA, B := NextB},
                                    DidMove := true
                                }
                            else:
                                ClearedGrid := RemoveCell(Grid, Pill.A)
                                NextGrid := SetInGrid(
                                    SetInGrid(ClearedGrid, NextA, MakePillLeft(ColorA)),
                                    NextB,
                                    MakePillRight(ColorB)
                                )
                                move_pill_output{
                                    Grid := NextGrid,
                                    Pill := pill_location{A := NextA, B := NextB},
                                    DidMove := true
                                }
                        else:
                            LeftCell := grid_cell_location{Row := Pill.B.Row, Col := Pill.B.Col - 1}
                            LeftInBounds := IsInBounds(LeftCell)
                            var CanUseLeft : logic = false
                            if (LeftInBounds?):
                                MaybeLeft := GetInGrid(Grid, LeftCell)
                                if (LeftObj := MaybeLeft?):
                                    LeftEmpty := IsEmpty(LeftObj)
                                    if (LeftEmpty?):
                                        set CanUseLeft = true

                            if (CanUseLeft?):
                                NextA := LeftCell
                                NextB := Pill.B
                                var Clockwise : logic = false
                                if (Direction = rotate_direction.Clockwise):
                                    set Clockwise = true

                                if (Clockwise?):
                                    ClearedGrid := RemoveCell(RemoveCell(Grid, Pill.A), Pill.B)
                                    NextGrid := SetInGrid(
                                        SetInGrid(ClearedGrid, NextA, MakePillLeft(ColorB)),
                                        NextB,
                                        MakePillRight(ColorA)
                                    )
                                    move_pill_output{
                                        Grid := NextGrid,
                                        Pill := pill_location{A := NextA, B := NextB},
                                        DidMove := true
                                    }
                                else:
                                    ClearedGrid := RemoveCell(RemoveCell(Grid, Pill.A), Pill.B)
                                    NextGrid := SetInGrid(
                                        SetInGrid(ClearedGrid, NextA, MakePillLeft(ColorA)),
                                        NextB,
                                        MakePillRight(ColorB)
                                    )
                                    move_pill_output{
                                        Grid := NextGrid,
                                        Pill := pill_location{A := NextA, B := NextB},
                                        DidMove := true
                                    }
                            else:
                                move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}
                    else if (Horizontal?):
                        if (Pill.A.Row = 0):
                            move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}
                        else:
                            UpCell := grid_cell_location{Row := Pill.A.Row - 1, Col := Pill.A.Col}
                            MaybeUp := GetInGrid(Grid, UpCell)
                            if (UpObj := MaybeUp?):
                                UpEmpty := IsEmpty(UpObj)
                                if (UpEmpty?):
                                    NextA := UpCell
                                    NextB := Pill.A
                                    var Clockwise : logic = false
                                    if (Direction = rotate_direction.Clockwise):
                                        set Clockwise = true

                                    if (Clockwise?):
                                        ClearedGrid := RemoveCell(Grid, Pill.B)
                                        NextGrid := SetInGrid(
                                            SetInGrid(ClearedGrid, NextA, MakePillTop(ColorA)),
                                            NextB,
                                            MakePillBottom(ColorB)
                                        )
                                        move_pill_output{
                                            Grid := NextGrid,
                                            Pill := pill_location{A := NextA, B := NextB},
                                            DidMove := true
                                        }
                                    else:
                                        ClearedGrid := RemoveCell(Grid, Pill.B)
                                        NextGrid := SetInGrid(
                                            SetInGrid(ClearedGrid, NextA, MakePillTop(ColorB)),
                                            NextB,
                                            MakePillBottom(ColorA)
                                        )
                                        move_pill_output{
                                            Grid := NextGrid,
                                            Pill := pill_location{A := NextA, B := NextB},
                                            DidMove := true
                                        }
                                else:
                                    move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}
                            else:
                                move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}
                    else:
                        move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}
                else:
                    move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}
            else:
                move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}
        else:
            move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}
    else:
        move_pill_output{Grid := Grid, Pill := Pill, DidMove := false}

SetPillSegmentAt(Grid:[][]grid_object, Cell:grid_cell_location):[][]grid_object =
    MaybeObj := GetInGrid(Grid, Cell)
    if (Obj := MaybeObj?):
        PillHalf := IsPillHalf(Obj)
        if (PillHalf?):
            MaybeColor := Obj.Color
            if (Color := MaybeColor?):
                SetInGrid(Grid, Cell, MakePillSegment(Color))
            else:
                Grid
        else:
            Grid
    else:
        Grid

SetWidowedPillSegments(Grid:[][]grid_object):[][]grid_object =
    var NextGrid : [][]grid_object = Grid

    for (Row := 0..PlayfieldHeight):
        for (Col := 0..PlayfieldWidth - 1):
            Cell := grid_cell_location{Row := Row, Col := Col}
            MaybeObj := GetInGrid(NextGrid, Cell)
            if (Obj := MaybeObj?):
                LeftHalf := IsPillLeft(Obj)
                RightHalf := IsPillRight(Obj)
                TopHalf := IsPillTop(Obj)
                BottomHalf := IsPillBottom(Obj)

                if (LeftHalf?):
                    OtherCell := grid_cell_location{Row := Row, Col := Col + 1}
                    MaybeOther := GetInGrid(NextGrid, OtherCell)
                    if (Other := MaybeOther?):
                        OtherRight := IsPillRight(Other)
                        if (OtherRight?):
                            set NextGrid = NextGrid
                        else:
                            set NextGrid = SetPillSegmentAt(NextGrid, Cell)
                    else:
                        set NextGrid = SetPillSegmentAt(NextGrid, Cell)
                else if (RightHalf?):
                    OtherCell := grid_cell_location{Row := Row, Col := Col - 1}
                    MaybeOther := GetInGrid(NextGrid, OtherCell)
                    if (Other := MaybeOther?):
                        OtherLeft := IsPillLeft(Other)
                        if (OtherLeft?):
                            set NextGrid = NextGrid
                        else:
                            set NextGrid = SetPillSegmentAt(NextGrid, Cell)
                    else:
                        set NextGrid = SetPillSegmentAt(NextGrid, Cell)
                else if (TopHalf?):
                    OtherCell := grid_cell_location{Row := Row + 1, Col := Col}
                    MaybeOther := GetInGrid(NextGrid, OtherCell)
                    if (Other := MaybeOther?):
                        OtherBottom := IsPillBottom(Other)
                        if (OtherBottom?):
                            set NextGrid = NextGrid
                        else:
                            set NextGrid = SetPillSegmentAt(NextGrid, Cell)
                    else:
                        set NextGrid = SetPillSegmentAt(NextGrid, Cell)
                else if (BottomHalf?):
                    OtherCell := grid_cell_location{Row := Row - 1, Col := Col}
                    MaybeOther := GetInGrid(NextGrid, OtherCell)
                    if (Other := MaybeOther?):
                        OtherTop := IsPillTop(Other)
                        if (OtherTop?):
                            set NextGrid = NextGrid
                        else:
                            set NextGrid = SetPillSegmentAt(NextGrid, Cell)
                    else:
                        set NextGrid = SetPillSegmentAt(NextGrid, Cell)

    NextGrid

ClearTopRow(Grid:[][]grid_object):[][]grid_object =
    var NextGrid : [][]grid_object = Grid

    for (Col := 0..PlayfieldWidth - 1):
        Cell := grid_cell_location{Row := 0, Col := Col}
        set NextGrid = RemoveCell(NextGrid, Cell)

    SetWidowedPillSegments(NextGrid)

RemoveDestroyed(Grid:[][]grid_object):[][]grid_object =
    var NextGrid : [][]grid_object = Grid

    for (Row := 0..PlayfieldHeight):
        for (Col := 0..PlayfieldWidth - 1):
            Cell := grid_cell_location{Row := Row, Col := Col}
            MaybeObj := GetInGrid(NextGrid, Cell)
            if (Obj := MaybeObj?):
                Destroyed := IsDestroyed(Obj)
                if (Destroyed?):
                    set NextGrid = RemoveCell(NextGrid, Cell)

    NextGrid

HasViruses(Grid:[][]grid_object):logic =
    var Found : logic = false

    for (Row := 0..PlayfieldHeight):
        for (Col := 0..PlayfieldWidth - 1):
            Cell := grid_cell_location{Row := Row, Col := Col}
            MaybeObj := GetInGrid(Grid, Cell)
            if (Obj := MaybeObj?):
                Virus := IsVirus(Obj)
                if (Virus?):
                    set Found = true

    Found

DestroyCellForLine(Grid:[][]grid_object, Cell:grid_cell_location):[][]grid_object =
    MaybeObj := GetInGrid(Grid, Cell)
    if (Obj := MaybeObj?):
        Empty := IsEmpty(Obj)
        if (Empty?):
            Grid
        else:
            SetInGrid(Grid, Cell, MakeDestroyed())
    else:
        Grid

DestroyHorizontalRun(Grid:[][]grid_object, Row:int, StartCol:int, RunLength:int):[][]grid_object =
    var NextGrid : [][]grid_object = Grid

    for (Offset := 0..RunLength - 1):
        Cell := grid_cell_location{Row := Row, Col := StartCol + Offset}
        set NextGrid = DestroyCellForLine(NextGrid, Cell)

    NextGrid

DestroyVerticalRun(Grid:[][]grid_object, Col:int, StartRow:int, RunLength:int):[][]grid_object =
    var NextGrid : [][]grid_object = Grid

    for (Offset := 0..RunLength - 1):
        Cell := grid_cell_location{Row := StartRow + Offset, Col := Col}
        set NextGrid = DestroyCellForLine(NextGrid, Cell)

    NextGrid

RemoveCells(Grid:[][]grid_object, Cells:[]grid_cell_location):[][]grid_object =
    var NextGrid : [][]grid_object = Grid

    for (Cell : Cells):
        set NextGrid = RemoveCell(NextGrid, Cell)

    NextGrid

DestroyLines(Grid:[][]grid_object):destroy_lines_output =
    var NextGrid : [][]grid_object = Grid
    LineCheckGrid := Grid
    var HasLines : logic = false
    var DestroyedCount : int = 0
    var VirusCount : int = 0
    var LineColors : []game_color = array{}

    for (Row := 0..PlayfieldHeight):
        var RunStart : int = 0
        var RunLength : int = 0
        var RunColor : ?game_color = false

        for (Col := 0..PlayfieldWidth - 1):
            Cell := grid_cell_location{Row := Row, Col := Col}
            MaybeObj := GetInGrid(LineCheckGrid, Cell)
            if (Obj := MaybeObj?):
                MaybeColor := Obj.Color
                if (Color := MaybeColor?):
                    var SameRun : logic = false
                    if (PrevColor := RunColor?):
                        ColorMatches := IsSameColor(PrevColor, Color)
                        if (ColorMatches?):
                            set SameRun = true

                    if (SameRun?):
                        set RunLength += 1
                    else:
                        if (RunLength >= LineLength):
                            set NextGrid = DestroyHorizontalRun(NextGrid, Row, RunStart, RunLength)
                            set HasLines = true
                            if (LineColor := RunColor?):
                                set LineColors += array{LineColor}
                        set RunStart = Col
                        set RunLength = 1
                        set RunColor = option{Color}
                else:
                    if (RunLength >= LineLength):
                        set NextGrid = DestroyHorizontalRun(NextGrid, Row, RunStart, RunLength)
                        set HasLines = true
                        if (LineColor := RunColor?):
                            set LineColors += array{LineColor}
                    set RunLength = 0
                    set RunColor = false

        if (RunLength >= LineLength):
            set NextGrid = DestroyHorizontalRun(NextGrid, Row, RunStart, RunLength)
            set HasLines = true
            if (LineColor := RunColor?):
                set LineColors += array{LineColor}

    for (Col := 0..PlayfieldWidth - 1):
        var RunStart : int = 0
        var RunLength : int = 0
        var RunColor : ?game_color = false

        for (Row := 0..PlayfieldHeight):
            Cell := grid_cell_location{Row := Row, Col := Col}
            MaybeObj := GetInGrid(LineCheckGrid, Cell)
            if (Obj := MaybeObj?):
                MaybeColor := Obj.Color
                if (Color := MaybeColor?):
                    var SameRun : logic = false
                    if (PrevColor := RunColor?):
                        ColorMatches := IsSameColor(PrevColor, Color)
                        if (ColorMatches?):
                            set SameRun = true

                    if (SameRun?):
                        set RunLength += 1
                    else:
                        if (RunLength >= LineLength):
                            set NextGrid = DestroyVerticalRun(NextGrid, Col, RunStart, RunLength)
                            set HasLines = true
                            if (LineColor := RunColor?):
                                set LineColors += array{LineColor}
                        set RunStart = Row
                        set RunLength = 1
                        set RunColor = option{Color}
                else:
                    if (RunLength >= LineLength):
                        set NextGrid = DestroyVerticalRun(NextGrid, Col, RunStart, RunLength)
                        set HasLines = true
                        if (LineColor := RunColor?):
                            set LineColors += array{LineColor}
                    set RunLength = 0
                    set RunColor = false

        if (RunLength >= LineLength):
            set NextGrid = DestroyVerticalRun(NextGrid, Col, RunStart, RunLength)
            set HasLines = true
            if (LineColor := RunColor?):
                set LineColors += array{LineColor}

    if (HasLines?):
        for (Row := 0..PlayfieldHeight):
            for (Col := 0..PlayfieldWidth - 1):
                Cell := grid_cell_location{Row := Row, Col := Col}
                MaybeObj := GetInGrid(Grid, Cell)
                MaybeNewObj := GetInGrid(NextGrid, Cell)
                if (Obj := MaybeObj?):
                    if (NewObj := MaybeNewObj?):
                        Destroyed := IsDestroyed(NewObj)
                        if (Destroyed?):
                            Empty := IsEmpty(Obj)
                            if (Empty?):
                                true
                            else:
                                set DestroyedCount += 1
                                Virus := IsVirus(Obj)
                                if (Virus?):
                                    set VirusCount += 1
        set NextGrid = SetWidowedPillSegments(NextGrid)

    destroy_lines_output{
        Grid := NextGrid,
        HasLines := HasLines,
        DestroyedCount := DestroyedCount,
        VirusCount := VirusCount,
        LineColors := LineColors
    }

DropDebris(Grid:[][]grid_object):drop_debris_output =
    var NextGrid : [][]grid_object = Grid
    var FallingCells : []grid_cell_location = array{}

    for (RowOffset := 0..PlayfieldHeight - 1):
        Row := PlayfieldHeight - 1 - RowOffset
        for (Col := 0..PlayfieldWidth - 1):
            Cell := grid_cell_location{Row := Row, Col := Col}
            MaybeObj := GetInGrid(NextGrid, Cell)
            if (Obj := MaybeObj?):
                Segment := IsPillSegment(Obj)
                LeftHalf := IsPillLeft(Obj)
                TopHalf := IsPillTop(Obj)

                if (Segment?):
                    Moved := MoveCell(NextGrid, Cell, grid_direction.Down)
                    if (Moved.DidMove?):
                        set NextGrid = Moved.Grid
                        set FallingCells += array{Cell}
                else if (LeftHalf?):
                    Pill := pill_location{
                        A := Cell,
                        B := grid_cell_location{Row := Row, Col := Col + 1}
                    }
                    Moved := MovePill(NextGrid, Pill, grid_direction.Down)
                    if (Moved.DidMove?):
                        set NextGrid = Moved.Grid
                        set FallingCells += array{Pill.A, Pill.B}
                else if (TopHalf?):
                    Pill := pill_location{
                        A := Cell,
                        B := grid_cell_location{Row := Row + 1, Col := Col}
                    }
                    Moved := MovePill(NextGrid, Pill, grid_direction.Down)
                    if (Moved.DidMove?):
                        set NextGrid = Moved.Grid
                        set FallingCells += array{Pill.A, Pill.B}

    drop_debris_output{Grid := NextGrid, FallingCells := FallingCells}

GiveGarbage(Grid:[][]grid_object, Colors:[]game_color, BaseSeed:string, Frame:int):[][]grid_object =
    var NextGrid : [][]grid_object = Grid
    GarbageSeed := "{Frame}-garbage-{BaseSeed}"
    Columns := SeedShuffleColumns(GarbageSeed)
    var ColorIndex : int = 0

    for (Color : Colors):
        if (ColorIndex < PlayfieldWidth):
            if (Col := Columns[ColorIndex]):
                Cell := grid_cell_location{Row := PillSpawnRow, Col := Col}
                set NextGrid = SetInGrid(NextGrid, Cell, MakePillSegment(Color))
                set ColorIndex += 1

    NextGrid
