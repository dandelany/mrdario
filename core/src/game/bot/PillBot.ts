import {
  GameColor,
  GameGrid,
  GameInput,
  GameInputMove,
  GameMode,
  GameState,
  GridCellLocation,
  GridDirection,
  GridObject,
  GridObjectType,
  InputEventType,
  PillLocation,
  RotateDirection,
} from "../types/index.js";
import { GameAction, GameActionType } from "../types/gameAction.js";
import { destroyLines, movePill, rotatePill, slamPill } from "../utils/moves.js";
import { getInGrid, isPillVertical } from "../utils/grid.js";
import { hasColor, isEmpty, isVirus } from "../utils/guards.js";
import { MultiGameRunnerMode, MultiGameRunnerState } from "../runner/MultiGameRunner.js";
import { TimedActionBatch } from "../runner/types.js";

interface PillBotOptions {
  actionDelayFrames?: number;
}

interface PlacementCandidate {
  grid: GameGrid;
  pill: PillLocation;
  inputs: GameInputMove[];
  score: number;
}

interface ReachablePill {
  grid: GameGrid;
  pill: PillLocation;
  inputs: GameInputMove[];
}

const DEFAULT_ACTION_DELAY_FRAMES = 4;

// small deterministic dr. mario bot: plan one pill, then tap out the plan over time.
export class PillBot {
  // frames to wait between taps so the browser view stays legible and key-repeat stays irrelevant
  protected readonly actionDelayFrames: number;
  // remaining input taps for the current pill
  protected plan: GameInputMove[] = [];
  // pill identity used to avoid re-planning every frame
  protected planKey?: string;
  // last runner frame where the bot queued an action
  protected lastActionFrame = -Infinity;

  constructor(options: PillBotOptions = {}) {
    // make a bot with conservative tap timing
    this.actionDelayFrames = options.actionDelayFrames || DEFAULT_ACTION_DELAY_FRAMES;
  }

  public getNextBatch(runnerState: MultiGameRunnerState, player: number): TimedActionBatch | undefined {
    // return at most one tap batch for player on the next frame
    if (runnerState.mode !== MultiGameRunnerMode.Playing) {
      this.clearPlan();
      return undefined;
    }

    const gameState = runnerState.multiGame?.gameStates[player];
    if (!gameState || gameState.mode !== GameMode.Playing || !gameState.pill) {
      this.clearPlan();
      return undefined;
    }

    const nextPlanKey = getPillKey(gameState);
    if (this.planKey !== nextPlanKey || !this.plan.length) {
      this.plan = planPill(gameState);
      this.planKey = nextPlanKey;
    }
    if (!this.plan.length) return undefined;
    if (runnerState.frame - this.lastActionFrame < this.actionDelayFrames) return undefined;

    const input = this.plan.shift() as GameInputMove;
    this.lastActionFrame = runnerState.frame;
    return {
      frame: runnerState.frame + 1,
      actions: makeTapActions(input),
    };
  }

  protected clearPlan(): void {
    // drop stale intent whenever no controllable pill exists
    this.plan = [];
    this.planKey = undefined;
  }
}

export function planPill(state: GameState): GameInputMove[] {
  // choose the best simulated placement and return its input taps
  if (!state.pill) return [];

  const candidates = getPlacementCandidates(state);
  let best: PlacementCandidate | undefined;
  for (let i = 0; i < candidates.length; i++) {
    if (!best || candidates[i].score > best.score) {
      best = candidates[i];
    }
  }

  return best ? best.inputs.concat(GameInput.Up) : [GameInput.Up];
}

function getPlacementCandidates(state: GameState): PlacementCandidate[] {
  // enumerate rotate-then-slide placements reachable from the current pill position
  const candidates: PlacementCandidate[] = [];
  let rotated: ReachablePill = {
    grid: state.grid,
    pill: state.pill as PillLocation,
    inputs: [],
  };

  for (let rotation = 0; rotation < 4; rotation++) {
    collectSlideCandidates(rotated, candidates);

    const nextRotated = rotatePill(rotated.grid, rotated.pill, RotateDirection.Clockwise);
    if (!nextRotated.didMove) break;
    rotated = {
      grid: nextRotated.grid,
      pill: nextRotated.pill,
      inputs: rotated.inputs.concat(GameInput.RotateCW),
    };
  }

  return candidates;
}

function collectSlideCandidates(start: ReachablePill, candidates: PlacementCandidate[]): void {
  // score the current column and every direct left/right slide from it
  addCandidate(start, candidates);
  walkDirection(start, GridDirection.Left, GameInput.Left, candidates);
  walkDirection(start, GridDirection.Right, GameInput.Right, candidates);
}

function walkDirection(
  start: ReachablePill,
  direction: GridDirection.Left | GridDirection.Right,
  input: GameInputMove,
  candidates: PlacementCandidate[]
): void {
  // generate candidates while a pill can keep moving in one horizontal direction
  let current = start;
  while (true) {
    const moved = movePill(current.grid, current.pill, direction);
    if (!moved.didMove) return;
    current = {
      grid: moved.grid,
      pill: moved.pill,
      inputs: current.inputs.concat(input),
    };
    addCandidate(current, candidates);
  }
}

function addCandidate(candidate: ReachablePill, candidates: PlacementCandidate[]): void {
  // hard-drop a reachable pill and score the resulting board
  const dropped = slamPill(candidate.grid, candidate.pill);
  candidates.push({
    grid: dropped.grid,
    pill: dropped.pill,
    inputs: candidate.inputs,
    score: scorePlacement(dropped.grid, dropped.pill),
  });
}

function scorePlacement(grid: GameGrid, pill: PillLocation): number {
  // heuristic: kill viruses, keep the stack low, prefer color contact and combos
  const destroyed = destroyLines(grid);
  const stats = getBoardStats(grid);
  let score = 0;

  score += destroyed.virusCount * 12000;
  score += destroyed.destroyedCount * 900;
  score += destroyed.lineColors.length * 1200;
  if (destroyed.lineColors.length >= 2) score += 5000;

  score += scorePillContacts(grid, pill);
  score += scoreLinePotential(grid, pill);
  score -= stats.aggregateHeight * 35;
  score -= stats.maxHeight * 120;
  score -= stats.bumpiness * 20;
  score -= stats.holes * 220;
  score -= stats.topDanger * 900;
  score += getLandingDepth(pill) * 10;

  return score;
}

function getBoardStats(grid: GameGrid) {
  // coarse tetris-ish board features; cheap and good enough for a dev bot
  let aggregateHeight = 0;
  let maxHeight = 0;
  let holes = 0;
  let topDanger = 0;
  let bumpiness = 0;
  let previousHeight: number | undefined;

  for (let col = 0; col < grid[0].length; col++) {
    let seenBlock = false;
    let height = 0;
    for (let row = 1; row < grid.length; row++) {
      const obj = grid[row][col];
      if (isOccupied(obj)) {
        if (!seenBlock) {
          height = grid.length - row;
          seenBlock = true;
        }
        if (row <= 4) topDanger++;
      } else if (seenBlock && isEmpty(obj)) {
        holes++;
      }
    }

    aggregateHeight += height;
    maxHeight = Math.max(maxHeight, height);
    if (previousHeight !== undefined) bumpiness += Math.abs(height - previousHeight);
    previousHeight = height;
  }

  return { aggregateHeight, maxHeight, holes, topDanger, bumpiness };
}

function scorePillContacts(grid: GameGrid, pill: PillLocation): number {
  // reward landing next to same-color material, especially viruses
  let score = 0;
  for (let i = 0; i < pill.length; i++) {
    const cell = pill[i];
    const obj = getInGrid(grid, cell);
    if (!obj || !hasColor(obj)) continue;

    const neighbors: GridCellLocation[] = [
      [cell[0] - 1, cell[1]],
      [cell[0] + 1, cell[1]],
      [cell[0], cell[1] - 1],
      [cell[0], cell[1] + 1],
    ];
    for (let j = 0; j < neighbors.length; j++) {
      const neighbor = getInGrid(grid, neighbors[j]);
      if (!neighbor || !hasColor(neighbor) || neighbor.color !== obj.color) continue;
      score += isVirus(neighbor) ? 550 : 150;
    }
  }

  if (isPillVertical(grid, pill)) score += 60;
  return score;
}

function scoreLinePotential(grid: GameGrid, pill: PillLocation): number {
  // reward placements that extend same-color runs, even before they clear
  let score = 0;
  for (let i = 0; i < pill.length; i++) {
    const cell = pill[i];
    const obj = getInGrid(grid, cell);
    if (!obj || !hasColor(obj)) continue;

    score += scoreAxisPotential(grid, cell, obj.color, [1, 0]);
    score += scoreAxisPotential(grid, cell, obj.color, [0, 1]);
    score += scoreNearestVirus(grid, cell, obj.color);
  }
  return score;
}

function scoreAxisPotential(
  grid: GameGrid,
  cell: GridCellLocation,
  color: GameColor,
  delta: GridCellLocation
): number {
  // count contiguous same-color material through this cell on one axis
  const backward = countRun(grid, cell, color, [-delta[0], -delta[1]]);
  const forward = countRun(grid, cell, color, delta);
  const count = 1 + backward.count + forward.count;
  const viruses = backward.viruses + forward.viruses;
  const openEnds = backward.openEnd + forward.openEnd;

  let score = count * count * 220 + viruses * 900;
  if (count === 3 && openEnds > 0) score += 1800;
  if (count >= 4) score += 2500;
  return score;
}

function countRun(grid: GameGrid, cell: GridCellLocation, color: GameColor, delta: GridCellLocation) {
  // walk until the color run ends; remember if it has room to grow
  let count = 0;
  let viruses = 0;
  let row = cell[0] + delta[0];
  let col = cell[1] + delta[1];

  while (true) {
    const obj = getInGrid(grid, [row, col]);
    if (!obj) return { count, viruses, openEnd: 0 };
    if (isEmpty(obj)) return { count, viruses, openEnd: 1 };
    if (!hasColor(obj) || obj.color !== color) return { count, viruses, openEnd: 0 };
    count++;
    if (isVirus(obj)) viruses++;
    row += delta[0];
    col += delta[1];
  }
}

function scoreNearestVirus(grid: GameGrid, cell: GridCellLocation, color: GameColor): number {
  // nudge the bot toward same-color viruses when no immediate line is available
  let bestDistance = Infinity;
  for (let row = 1; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const obj = grid[row][col];
      if (!isVirus(obj) || obj.color !== color) continue;
      const distance = Math.abs(cell[0] - row) + Math.abs(cell[1] - col);
      if (distance < bestDistance) bestDistance = distance;
    }
  }
  return bestDistance === Infinity ? 0 : Math.max(0, 450 - bestDistance * 45);
}

function getLandingDepth(pill: PillLocation): number {
  // lower landings are usually safer than building near the mouth
  return Math.max(pill[0][0], pill[1][0]);
}

function getPillKey(state: GameState): string {
  // pillCount advances when a pill is spawned; keep one plan while that pill moves
  return `${state.pillCount}`;
}

function makeTapActions(input: GameInputMove): GameAction[] {
  // same-frame keydown+keyup gives exactly one move through InputRepeater
  return [
    { type: GameActionType.Move, input, eventType: InputEventType.KeyDown },
    { type: GameActionType.Move, input, eventType: InputEventType.KeyUp },
  ];
}

function isOccupied(obj: GridObject): boolean {
  // destroyed cells are transitional, so treat them as occupied for stack safety
  return obj.type !== GridObjectType.Empty;
}

export function getBotDebugScore(state: GameState): number {
  // test/debug hook for quick heuristic inspection
  return state.pill ? scorePlacement(state.grid, state.pill) : scorePlacement(state.grid, [[0, 0], [0, 0]]);
}
