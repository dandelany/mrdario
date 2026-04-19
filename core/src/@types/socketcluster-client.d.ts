declare module "socketcluster-client" {
  export interface ConsumableStream<T = any> extends AsyncIterable<T> {
    once(timeout?: number): Promise<T>;
    createConsumer(timeout?: number): AsyncIterable<T> & { return?(): any };
  }

  export interface AGClientChannel<T = any> extends AsyncIterable<T> {
    createConsumer(timeout?: number): AsyncIterable<T> & { return?(): any };
    listener(eventName: string): ConsumableStream<any>;
    watch?(handler: (data: T) => void): void;
    unwatch?(handler?: (data: T) => void): void;
    close?(): void;
  }

  export interface SCClientSocket {
    authToken?: any;
    signedAuthToken?: string | null;
    state: string;
    authState: string;
    listener(event: string): ConsumableStream<any>;
    receiver(event: string): ConsumableStream<any>;
    invoke(event: string, data?: any): Promise<any>;
    transmit(event: string, data?: any): void;
    connect(): void;
    disconnect(code?: number, data?: any): void;
    subscribe(channelName: string, options?: any): AGClientChannel;
    channel(channelName: string): AGClientChannel;
    unsubscribe(channelName: string): void;
    publish?(channelName: string, data: any, callback?: (err: Error | null, ackData?: any) => void): void;
    transmitPublish(channelName: string, data: any): void;
    invokePublish(channelName: string, data: any): Promise<any>;
  }

  export namespace SCClientSocket {
    type ClientOptions = Record<string, any>;
    type ConnectStatus = any;
    type AuthStateChangeData = any;
    type States = string;
    type AuthStates = string;
  }

  export function create(options?: SCClientSocket.ClientOptions): SCClientSocket;
}
