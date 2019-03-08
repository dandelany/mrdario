export function getNodeProcessTimeMs(): number {
  if (!process || !process.hrtime) {
    throw new Error("process not available");
  }
  const now = process.hrtime();
  return now[0] * 1000 + now[1] * 1e-6;
}

export function getGetTime(): () => number {
  return window && window.performance && window.performance.now
    ? window.performance.now.bind(window.performance)
    : process && process.hrtime
    ? getNodeProcessTimeMs
    : () => new Date().getTime();
}
