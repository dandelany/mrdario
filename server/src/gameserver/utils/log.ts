export function logWithTime(...args: any) {
  console.log(new Date().toISOString(), ...args);
}
