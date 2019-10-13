export function getNodeProcessTimeMs(): number {
  if (!process || !process.hrtime) {
    throw new Error("process not available");
  }
  const now = process.hrtime();
  return now[0] * 1000 + now[1] * 1e-6;
}

export function getGetTime(): () => number {
  if (typeof process !== 'undefined' &&  process.release && process.release.name === 'node') {
    return process && process.hrtime
      ? getNodeProcessTimeMs
      : () => new Date().getTime();
  }
  return window && window.performance && window.performance.now
    ? window.performance.now.bind(window.performance)
    : () => new Date().getTime();
  //
  // if (typeof window !== 'undefined') {
  //   return window && window.performance && window.performance.now
  //     ? window.performance.now.bind(window.performance)
  //     : () => new Date().getTime();
  // }
  // return process && process.hrtime
  //   ? getNodeProcessTimeMs
  //   : () => new Date().getTime();
}
