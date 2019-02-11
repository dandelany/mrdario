import { SingleScoreDataObj } from "./score";

export function logWithTime(...args: any) {
  console.log((new Date()).toISOString(), ...args);
}
export function logHighScore(scoreInfo: SingleScoreDataObj, rank: number): void {
  logWithTime(
    `${scoreInfo.name} won on level ${scoreInfo.level}! Score: ${
      scoreInfo.score
      } (high score #${rank + 1})`,
    // bell character to wake up anyone tailing the logs :)
    "\u0007"
  );
}
