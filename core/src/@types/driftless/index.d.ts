declare module "driftless" {
  export function setDriftlessTimeout(
    callback: (...args: any[]) => void,
    delayMs: number,
    ...params: any[]
  ): number;

  export function setDriftlessInterval(
    callback: (...args: any[]) => void,
    delayMs: number,
    ...params: any[]
  ): number;

  export function clearDriftless(
    id: number,
    options?: {
      customClearTimeout?: (...args: any[]) => void
    }
  ): void;
}
