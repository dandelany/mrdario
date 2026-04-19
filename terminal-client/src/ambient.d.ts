declare module "socketcluster-client" {
  export interface SCClientSocket {
    on(event: string, listener: (...args: any[]) => void): any;
  }

  export function create(options?: Record<string, any>): SCClientSocket;
}
