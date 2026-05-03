import { PillBot, planPill } from "./PillBot.js";
import { GameActionType } from "../types/gameAction.js";
import { GameInput, GameMode, GameState, InputEventType } from "../types/index.js";
import { MultiGameRunner, MultiGameRunnerMode } from "../runner/MultiGameRunner.js";

describe("PillBot", () => {
  test("plans a finite set of taps for an active pill", () => {
    const runner = new MultiGameRunner({
      players: 2,
      seed: "pill-bot-plan",
      gameOptions: [{ level: 0, baseSpeed: 15 }, { level: 0, baseSpeed: 15 }],
    });
    runner.start();
    runner.tick();
    runner.tick();

    const bot = new PillBot({ actionDelayFrames: 0 });
    const state = runner.getState();
    const batch = bot.getNextBatch(state, 1);

    expect(state.mode).toBe(MultiGameRunnerMode.Playing);
    expect(state.multiGame?.gameStates[1].mode).toBe(GameMode.Playing);
    expect(state.multiGame?.gameStates[1].pill).toBeDefined();
    expect(batch).toMatchObject({
      frame: state.frame + 1,
      actions: [
        { type: GameActionType.Move, eventType: InputEventType.KeyDown },
        { type: GameActionType.Move, eventType: InputEventType.KeyUp },
      ],
    });
  });

  test("eventually hard-drops the active pill", () => {
    const runner = new MultiGameRunner({
      players: 2,
      seed: "pill-bot-drop",
      gameOptions: [{ level: 0, baseSpeed: 15 }, { level: 0, baseSpeed: 15 }],
    });
    runner.start();
    runner.tick();
    runner.tick();

    const gameState = runner.getState().multiGame?.gameStates[1];
    expect(gameState?.pill).toBeDefined();

    const plan = planPill(gameState as GameState);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[plan.length - 1]).toBe(GameInput.Up);
  });

  test("can drive a runner for a while without queuing invalid frames", () => {
    const runner = new MultiGameRunner({
      players: 2,
      seed: "pill-bot-smoke",
      gameOptions: [{ level: 0, baseSpeed: 15 }, { level: 0, baseSpeed: 15 }],
    });
    const bot = new PillBot({ actionDelayFrames: 2 });
    runner.start();

    for (let frame = 0; frame < 360 && runner.getState().mode === MultiGameRunnerMode.Playing; frame++) {
      const batch = bot.getNextBatch(runner.getState(), 1);
      if (batch) {
        runner.addPlayerActions(1, batch);
      }
      runner.tick();
    }

    const botState = runner.getState().multiGame?.gameStates[1];
    expect(botState?.frame).toBeGreaterThan(100);
  });
});
