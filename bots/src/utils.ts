export const A_JIFFY = 25;
export const TWO_SHAKES = 100;

export async function expectToRejectNotAuthenticated(promise: Promise<any>) {
  return await expect(promise).rejects.toThrow(/not authenticated/i);
}

export function sleep(time: number): Promise<number> {
  return new Promise(resolve => setTimeout(resolve, time));
}
