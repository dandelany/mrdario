import AbstractGameController from "mrdario-core/lib/AbstractGameController";

// todo debug this
export default class TerminalGameController extends AbstractGameController {
  private interval?: NodeJS.Timer;
  run() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = setInterval(() => {
      this.tick();
    }, Math.ceil(1000 / 60));
  }
  tick() {
    this.game.tick(this.moveInputQueue);
    this.options.render(this.getState());
  }
}

