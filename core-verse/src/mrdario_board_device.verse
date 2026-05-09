using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }
using { /Verse.org/Assets }
using { /UnrealEngine.com/Temporary/Diagnostics }
using { /UnrealEngine.com/Temporary/SpatialMath }

# renders one vertical mr. dario board.
# v1 uses scaled creative_prop_asset placeholders; later, swap this backend for scene graph mesh entities.
mrdario_board_device := class(creative_device):
    @editable
    BoardIndex : int = 0

    @editable
    BoardOrigin : vector3 = vector3{X := 0.0, Y := 0.0, Z := 600.0}

    @editable
    CellSize : float = 100.0

    @editable
    CellScale : float = 0.25

    @editable
    UsePillMeshes : logic = true

    @editable
    PillMeshCarrierAsset : creative_prop_asset = DefaultCreativePropAsset

    @editable
    PillColor1Asset : creative_prop_asset = DefaultCreativePropAsset

    @editable
    PillColor1Scale : float = 1.0

    @editable
    PillColor1Mesh : ?mesh = false

    @editable
    PillColor2Asset : creative_prop_asset = DefaultCreativePropAsset

    @editable
    PillColor2Scale : float = 1.0

    @editable
    PillColor2Mesh : ?mesh = false

    @editable
    PillColor3Asset : creative_prop_asset = DefaultCreativePropAsset

    @editable
    PillColor3Scale : float = 1.0

    @editable
    PillColor3Mesh : ?mesh = false

    @editable
    PillMeshBaseYaw : float = 0.0

    @editable
    PillMeshBasePitch : float = 0.0

    @editable
    PillMeshBaseRoll : float = 0.0

    @editable
    PillMeshTopPitch : float = 180.0

    @editable
    PillMeshBottomPitch : float = 0.0

    @editable
    PillMeshLeftPitch : float = -90.0

    @editable
    PillMeshRightPitch : float = 90.0

    @editable
    PillMeshSoloRoll : float = 90.0

    @editable
    VirusColor1Asset : creative_prop_asset = DefaultCreativePropAsset

    @editable
    VirusColor1Scale : float = 1.0

    @editable
    VirusColor2Asset : creative_prop_asset = DefaultCreativePropAsset

    @editable
    VirusColor2Scale : float = 1.0

    @editable
    VirusColor3Asset : creative_prop_asset = DefaultCreativePropAsset

    @editable
    VirusColor3Scale : float = 1.0

    @editable
    DestroyedAsset : creative_prop_asset = DefaultCreativePropAsset

    @editable
    DestroyedScale : float = 1.0

    @editable
    LogRenderDiffs : logic = false

    @editable
    LogSpawnFailures : logic = true

    var LastVisuals : []cell_visual_kind = array{}
    var SpawnedVisuals : []?creative_prop = array{}
    var SpawnedVisualKinds : []cell_visual_kind = array{}
    var PillMeshVisuals : []?creative_prop = array{}

    VisibleCellIndex(Row:int, Col:int):int =
        ((Row - 1) * PlayfieldWidth) + Col

    OffsetBySteps(Base:float, Steps:int, Delta:float):float =
        var Result : float = Base
        var Count : int = 0

        loop:
            if (Count >= Steps):
                break
            set Result += Delta
            set Count += 1

        Result

    CellPosition(Row:int, Col:int):vector3 =
        RowOffset := Row - 1
        vector3{
            X := OffsetBySteps(BoardOrigin.X, Col, CellSize),
            Y := BoardOrigin.Y,
            Z := OffsetBySteps(BoardOrigin.Z, RowOffset, -CellSize)
        }

    Midpoint(A:vector3, B:vector3):vector3 =
        vector3{
            X := (A.X + B.X) * 0.5,
            Y := (A.Y + B.Y) * 0.5,
            Z := (A.Z + B.Z) * 0.5
        }

    VisualScale(Visual:cell_visual_kind):float =
        case (Visual):
            cell_visual_kind.PillColor1 => PillColor1Scale
            cell_visual_kind.PillColor2 => PillColor2Scale
            cell_visual_kind.PillColor3 => PillColor3Scale
            cell_visual_kind.VirusColor1 => VirusColor1Scale
            cell_visual_kind.VirusColor2 => VirusColor2Scale
            cell_visual_kind.VirusColor3 => VirusColor3Scale
            cell_visual_kind.Destroyed => DestroyedScale
            _ => 1.0

    CombinedScale(Visual:cell_visual_kind):float =
        CellScale * VisualScale(Visual)

    CellTransform(Row:int, Col:int, Visual:cell_visual_kind):transform =
        Scale := CombinedScale(Visual)
        transform{
            Translation := CellPosition(Row, Col),
            Rotation := MakeRotationFromYawPitchRollDegrees(0.0, 0.0, 0.0),
            Scale := vector3{X := Scale, Y := Scale, Z := Scale}
        }

    PillMeshRotation(Kind:grid_object_kind):rotation =
        case (Kind):
            grid_object_kind.PillTop =>
                MakeRotationFromYawPitchRollDegrees(PillMeshBaseYaw, PillMeshBasePitch + PillMeshTopPitch, PillMeshBaseRoll)
            grid_object_kind.PillBottom =>
                MakeRotationFromYawPitchRollDegrees(PillMeshBaseYaw, PillMeshBasePitch + PillMeshBottomPitch, PillMeshBaseRoll)
            grid_object_kind.PillLeft =>
                MakeRotationFromYawPitchRollDegrees(PillMeshBaseYaw, PillMeshBasePitch + PillMeshLeftPitch, PillMeshBaseRoll)
            grid_object_kind.PillRight =>
                MakeRotationFromYawPitchRollDegrees(PillMeshBaseYaw, PillMeshBasePitch + PillMeshRightPitch, PillMeshBaseRoll)
            _ =>
                MakeRotationFromYawPitchRollDegrees(PillMeshBaseYaw, PillMeshBasePitch, PillMeshBaseRoll + PillMeshSoloRoll)

    PillMeshPosition(Row:int, Col:int, Kind:grid_object_kind):vector3 =
        Cell := CellPosition(Row, Col)
        case (Kind):
            grid_object_kind.PillTop =>
                Midpoint(Cell, CellPosition(Row + 1, Col))
            grid_object_kind.PillBottom =>
                Midpoint(Cell, CellPosition(Row - 1, Col))
            grid_object_kind.PillLeft =>
                Midpoint(Cell, CellPosition(Row, Col + 1))
            grid_object_kind.PillRight =>
                Midpoint(Cell, CellPosition(Row, Col - 1))
            _ =>
                Cell

    PillMeshTransform(Row:int, Col:int, Visual:cell_visual_kind, Kind:grid_object_kind):transform =
        Scale := CombinedScale(Visual)
        transform{
            Translation := PillMeshPosition(Row, Col, Kind),
            Rotation := PillMeshRotation(Kind),
            Scale := vector3{X := Scale, Y := Scale, Z := Scale}
        }

    MakeEmptyVisualCache():[]cell_visual_kind =
        for (Index := 0..(PlayfieldWidth * PlayfieldHeight) - 1):
            cell_visual_kind.Empty

    MakeEmptyPropCache():[]?creative_prop =
        for (Index := 0..(PlayfieldWidth * PlayfieldHeight) - 1):
            false

    EnsureCaches():void =
        if (LastVisuals.Length <> PlayfieldWidth * PlayfieldHeight):
            set LastVisuals = MakeEmptyVisualCache()
        if (SpawnedVisuals.Length <> PlayfieldWidth * PlayfieldHeight):
            set SpawnedVisuals = MakeEmptyPropCache()
        if (SpawnedVisualKinds.Length <> PlayfieldWidth * PlayfieldHeight):
            set SpawnedVisualKinds = MakeEmptyVisualCache()
        if (PillMeshVisuals.Length <> PlayfieldWidth * PlayfieldHeight):
            set PillMeshVisuals = MakeEmptyPropCache()

    SetCachedVisual(Index:int, Visual:cell_visual_kind):void =
        if (set LastVisuals[Index] = Visual):
            true

    SetSpawnedVisual(Index:int, Prop:?creative_prop):void =
        if (set SpawnedVisuals[Index] = Prop):
            true

    SetSpawnedVisualKind(Index:int, Visual:cell_visual_kind):void =
        if (set SpawnedVisualKinds[Index] = Visual):
            true

    SetPillMeshVisual(Index:int, Prop:?creative_prop):void =
        if (set PillMeshVisuals[Index] = Prop):
            true

    VisualKindName(Visual:cell_visual_kind):string =
        case (Visual):
            cell_visual_kind.Empty => "empty"
            cell_visual_kind.PillColor1 => "pill1"
            cell_visual_kind.PillColor2 => "pill2"
            cell_visual_kind.PillColor3 => "pill3"
            cell_visual_kind.VirusColor1 => "virus1"
            cell_visual_kind.VirusColor2 => "virus2"
            cell_visual_kind.VirusColor3 => "virus3"
            cell_visual_kind.Destroyed => "destroyed"

    SpawnResultName(Result:spawn_prop_result):string =
        case (Result):
            spawn_prop_result.Ok => "ok"
            spawn_prop_result.UnknownError => "unknown error"
            spawn_prop_result.InvalidSpawnPoint => "invalid spawn point"
            spawn_prop_result.SpawnPointOutOfBounds => "spawn point out of bounds"
            spawn_prop_result.InvalidAsset => "invalid asset"
            spawn_prop_result.TooManyProps => "too many props"

    AssetForVisual(Visual:cell_visual_kind):creative_prop_asset =
        case (Visual):
            cell_visual_kind.PillColor1 => PillColor1Asset
            cell_visual_kind.PillColor2 => PillColor2Asset
            cell_visual_kind.PillColor3 => PillColor3Asset
            cell_visual_kind.VirusColor1 => VirusColor1Asset
            cell_visual_kind.VirusColor2 => VirusColor2Asset
            cell_visual_kind.VirusColor3 => VirusColor3Asset
            cell_visual_kind.Destroyed => DestroyedAsset
            _ => PillColor1Asset

    MeshForPillVisual(Visual:cell_visual_kind):?mesh =
        case (Visual):
            cell_visual_kind.PillColor1 => PillColor1Mesh
            cell_visual_kind.PillColor2 => PillColor2Mesh
            cell_visual_kind.PillColor3 => PillColor3Mesh
            _ => false

    VisualForCell(State:game_state, Row:int, Col:int):cell_visual_kind =
        Cell := grid_cell_location{Row := Row, Col := Col}
        MaybeObj := GetInGrid(State.Grid, Cell)
        if (Obj := MaybeObj?):
            VisualKindForObject(Obj)
        else:
            cell_visual_kind.Empty

    ObjectForCell(State:game_state, Row:int, Col:int):?grid_object =
        Cell := grid_cell_location{Row := Row, Col := Col}
        GetInGrid(State.Grid, Cell)

    IsPillVisual(Visual:cell_visual_kind):logic =
        if (Visual = cell_visual_kind.PillColor1):
            true
        else if (Visual = cell_visual_kind.PillColor2):
            true
        else if (Visual = cell_visual_kind.PillColor3):
            true
        else:
            false

    HasPillMesh(Visual:cell_visual_kind):logic =
        MaybeMesh := MeshForPillVisual(Visual)
        if (MaybeMesh?):
            true
        else:
            false

    VisualForCellProp(State:game_state, Row:int, Col:int):cell_visual_kind =
        Visual := VisualForCell(State, Row, Col)
        PillVisual := IsPillVisual(Visual)
        PillMesh := HasPillMesh(Visual)
        if (UsePillMeshes?):
            if (PillVisual?):
                if (PillMesh?):
                    cell_visual_kind.Empty
                else:
                    Visual
            else:
                Visual
        else:
            Visual

    GetSpawnedVisual(Index:int):?creative_prop =
        if (MaybeProp := SpawnedVisuals[Index]):
            MaybeProp
        else:
            false

    GetPillMeshVisual(Index:int):?creative_prop =
        if (MaybeProp := PillMeshVisuals[Index]):
            MaybeProp
        else:
            false

    GetSpawnedVisualKind(Index:int):cell_visual_kind =
        if (Visual := SpawnedVisualKinds[Index]):
            Visual
        else:
            cell_visual_kind.Empty

    DisposeMaybeVisual(MaybeProp:?creative_prop):void =
        if (Prop := MaybeProp?):
            Prop.Dispose()

    DisposeVisual(Index:int):void =
        MaybeProp := GetSpawnedVisual(Index)
        DisposeMaybeVisual(MaybeProp)
        SetSpawnedVisual(Index, false)
        SetSpawnedVisualKind(Index, cell_visual_kind.Empty)

    HideVisual(Index:int):void =
        MaybeProp := GetSpawnedVisual(Index)
        if (Prop := MaybeProp?):
            Prop.Hide()

    HidePillMeshVisual(Index:int):void =
        MaybeProp := GetPillMeshVisual(Index)
        if (Prop := MaybeProp?):
            Prop.Hide()

    SpawnVisual(Index:int, Row:int, Col:int, Visual:cell_visual_kind):logic =
        case (Visual):
            cell_visual_kind.Empty =>
                true
            _ =>
                Asset := AssetForVisual(Visual)
                Result := SpawnProp(Asset, CellTransform(Row, Col, Visual))
                SpawnResult := Result(1)
                MaybeProp := Result(0)
                if (Prop := MaybeProp?):
                    SetSpawnedVisual(Index, option{Prop})
                    SetSpawnedVisualKind(Index, Visual)
                    true
                else:
                    if (LogSpawnFailures?):
                        Print("board {BoardIndex} spawn failed at {Row},{Col} for {VisualKindName(Visual)}: {SpawnResultName(SpawnResult)}")
                    false

    ShowOrSpawnVisual(Index:int, Row:int, Col:int, Visual:cell_visual_kind):logic =
        PropVisual := GetSpawnedVisualKind(Index)
        MaybeProp := GetSpawnedVisual(Index)

        if (PropVisual = Visual):
            if (Prop := MaybeProp?):
                Prop.Show()
                true
            else:
                SpawnVisual(Index, Row, Col, Visual)
        else:
            DisposeVisual(Index)
            SpawnVisual(Index, Row, Col, Visual)

    ShowOrSpawnPillMeshVisual(Index:int, Row:int, Col:int, Visual:cell_visual_kind, Kind:grid_object_kind):logic =
        MaybeMesh := MeshForPillVisual(Visual)
        if (PillMesh := MaybeMesh?):
            VisualTransform := PillMeshTransform(Row, Col, Visual, Kind)
            MaybeProp := GetPillMeshVisual(Index)
            if (Prop := MaybeProp?):
                Prop.SetMesh(PillMesh)
                if (Prop.TeleportTo[VisualTransform]):
                    Prop.Show()
                    true
                else:
                    Prop.Hide()
                    false
            else:
                Result := SpawnProp(PillMeshCarrierAsset, VisualTransform)
                SpawnResult := Result(1)
                MaybeSpawnedProp := Result(0)
                if (SpawnedProp := MaybeSpawnedProp?):
                    SpawnedProp.SetMesh(PillMesh)
                    SetPillMeshVisual(Index, option{SpawnedProp})
                    true
                else:
                    if (LogSpawnFailures?):
                        Print("board {BoardIndex} pill mesh spawn failed at {Row},{Col} for {VisualKindName(Visual)}: {SpawnResultName(SpawnResult)}")
                    false
        else:
            false

    RenderPillMeshCell(Index:int, State:game_state, Row:int, Col:int):void =
        MaybeObj := ObjectForCell(State, Row, Col)
        if (Obj := MaybeObj?):
            Visual := VisualKindForObject(Obj)
            PillVisual := IsPillVisual(Visual)
            if (PillVisual?):
                Spawned := ShowOrSpawnPillMeshVisual(Index, Row, Col, Visual, Obj.Kind)
                if (Spawned?):
                    true
                else:
                    HidePillMeshVisual(Index)
            else:
                HidePillMeshVisual(Index)
        else:
            HidePillMeshVisual(Index)

    RenderPillMeshes(State:game_state):void =
        if (UsePillMeshes?):
            for (Row := 1..PlayfieldHeight):
                for (Col := 0..PlayfieldWidth - 1):
                    Index := VisibleCellIndex(Row, Col)
                    RenderPillMeshCell(Index, State, Row, Col)
        else:
            var Index : int = 0
            loop:
                if (Index >= PillMeshVisuals.Length):
                    break
                HidePillMeshVisual(Index)
                set Index += 1

    RenderCell(State:game_state, Row:int, Col:int):void =
        Index := VisibleCellIndex(Row, Col)
        Visual := VisualForCellProp(State, Row, Col)
        CachedVisual : cell_visual_kind =
            if (LastVisual := LastVisuals[Index]):
                LastVisual
            else:
                cell_visual_kind.Empty

        if (Visual = CachedVisual):
            true
        else:
            if (LogRenderDiffs?):
                Print("board {BoardIndex} cell {Row},{Col}: {VisualKindName(CachedVisual)} -> {VisualKindName(Visual)}")
            if (Visual = cell_visual_kind.Empty):
                HideVisual(Index)
                SetCachedVisual(Index, cell_visual_kind.Empty)
            else:
                Spawned := ShowOrSpawnVisual(Index, Row, Col, Visual)
                if (Spawned?):
                    SetCachedVisual(Index, Visual)
                else:
                    SetCachedVisual(Index, cell_visual_kind.Empty)

    Render(State:game_state):void =
        EnsureCaches()

        for (Row := 1..PlayfieldHeight):
            for (Col := 0..PlayfieldWidth - 1):
                RenderCell(State, Row, Col)

        RenderPillMeshes(State)
