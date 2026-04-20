export async function expectToRejectNotAuthenticated(promise: Promise<any>) {
  return await expect(promise).rejects.toThrow(/not authenticated/i);
}
