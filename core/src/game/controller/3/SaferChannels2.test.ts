import { SaferClientChannelIn } from "./SaferChannels2";
import { SCClientSocket } from "socketcluster-client";
import { SaferChannelIn } from "./SaferChannels";


export function sleep(time: number): Promise<number> {
  return new Promise(resolve => setTimeout(resolve, time));
}

class MockChannel {
  handlers: ((data: string) => void)[] = [];
  mockPublish(message: string) {
    this.handlers.forEach(handler => handler(message));
  }
  watch = jest.fn((handler: (data: string) => void) => {
    this.handlers.push(handler);
  });
  unwatch = jest.fn((handlerToUnwatch: (data: string) => void) => {
    this.handlers = this.handlers.filter(h => h !== handlerToUnwatch);
  });
}
class MockSocket {
  channels: { [key: string]: MockChannel } = {};

  mockPublish(channelName: string, message: string) {
    console.log(`socket mock publish on channel ${channelName}: "${message}"`);
    const channel = this.channels[channelName];
    if (channel) channel.mockPublish(message);
  }
  subscribe = jest.fn((channelName: string, _options: any) => {
    if (!this.channels[channelName]) {
      this.channels[channelName] = new MockChannel();
    }
    return this.channels[channelName];
  });
  unsubscribe = jest.fn();
  publish = jest.fn((channelName: string, message: string) => {
    console.log(`socket publish on channel ${channelName}: "${message}"`);
  });
}

interface MockSocketInterface extends SCClientSocket {
  mockPublish: (channelName: string, message: string) => void;
}

function getMockSocket() {
  return (new MockSocket() as any) as MockSocketInterface;
}

const CHANNEL_NAME = "test-channel";

describe("SaferClientChannelIn", () => {
  let socket: MockSocketInterface;
  let channelIn: SaferClientChannelIn;

  beforeEach(() => {
    // create a new SaferChannelIn for each test
    socket = getMockSocket();
    channelIn = new SaferClientChannelIn({
      socket,
      channelName: CHANNEL_NAME,
      sendRepeatRequest: jest.fn(),
      onMessage: jest.fn()
    });
  });
  afterEach(() => {
    if (channelIn) channelIn.cleanup();
  });

  test("Subscribes & starts watching a (mock) socket channel after being constructed", () => {
    expect(channelIn.channel).toBeInstanceOf(MockChannel);
    expect(channelIn.channel).toStrictEqual(socket.channels[CHANNEL_NAME]);

    expect(socket.subscribe).toHaveBeenCalledWith(CHANNEL_NAME);
    expect(channelIn.channel.watch).toHaveBeenCalledTimes(1);
  });

  test("Listens for messages published on channel; parses and delivers them to handlers", () => {
    const handler1 = jest.fn();
    channelIn.watch(handler1);
    expect(handler1).not.toHaveBeenCalled();

    socket.mockPublish(CHANNEL_NAME, "0::zero");
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler1).toHaveBeenCalledWith("zero");
    // doesn't break if message includes separator
    socket.mockPublish(CHANNEL_NAME, "1::::one::");
    expect(handler1).toHaveBeenCalledTimes(2);
    expect(handler1).toHaveBeenCalledWith("::one::");

    // attach a second handler
    const handler2 = jest.fn();
    channelIn.watch(handler2);

    socket.mockPublish(CHANNEL_NAME, "2::two");
    expect(handler1).toHaveBeenCalledTimes(3);
    expect(handler1).toHaveBeenCalledWith("two");
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledWith("two");
  });

  test("Does not deliver badly formatted messages unless `deliverInvalid` option is true", () => {
    const handler = jest.fn();
    channelIn.watch(handler);
    const badMsg = "MUAHAHahaha";
    socket.mockPublish(CHANNEL_NAME, badMsg);
    expect(handler).not.toHaveBeenCalled();

    const laxChannel = new SaferChannelIn({
      socket,
      channelName: CHANNEL_NAME,
      deliverInvalid: true
    });
    const laxHandler = jest.fn();
    laxChannel.watch(laxHandler);
    socket.mockPublish(CHANNEL_NAME, badMsg);
    expect(handler).not.toHaveBeenCalled();
    expect(laxHandler).toHaveBeenCalledTimes(1);
    expect(laxHandler).toHaveBeenCalledWith(badMsg);
  });

  test("Ignores duplicate messages", () => {
    // todo: unless ignoreDuplicates option is false
    const handler = jest.fn();
    channelIn.watch(handler);

    const dupeMsg = "2::two";
    socket.mockPublish(CHANNEL_NAME, dupeMsg);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("two");
    // send two more of the same exact message
    socket.mockPublish(CHANNEL_NAME, dupeMsg);
    socket.mockPublish(CHANNEL_NAME, dupeMsg);
    // handler should have only been called the first time
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("Ignores incoming repeat/republish requests", () => {
    const handler = jest.fn();
    channelIn.watch(handler);

    socket.mockPublish(CHANNEL_NAME, "12:R:alice:8");
    socket.mockPublish(CHANNEL_NAME, "13:R:bob:11,13,14");
    socket.mockPublish(CHANNEL_NAME, "14:P:bob:12");
    socket.mockPublish(CHANNEL_NAME, "14:P:alice:99,100");
    expect(handler).not.toHaveBeenCalled();
  });

  test("When missing messages are detected, creates outgoing repeat requests and passes to `sendRepeatRequest` ", () => {
    const handler = jest.fn();
    channelIn.watch(handler);

    const { sendRepeatRequest } = channelIn.options;
    expect(sendRepeatRequest).not.toHaveBeenCalled();
    socket.mockPublish(CHANNEL_NAME, "2::two");
    socket.mockPublish(CHANNEL_NAME, "5::five");
    expect(sendRepeatRequest).toHaveBeenCalledTimes(1);
    expect(sendRepeatRequest).toHaveBeenLastCalledWith({ channelName: CHANNEL_NAME, msgIds: [3, 4] });
    socket.mockPublish(CHANNEL_NAME, "6::six");
    socket.mockPublish(CHANNEL_NAME, "7::seven");
    expect(sendRepeatRequest).toHaveBeenCalledTimes(1);
    socket.mockPublish(CHANNEL_NAME, "9::nine");
    expect(sendRepeatRequest).toHaveBeenCalledTimes(2);
    expect(sendRepeatRequest).toHaveBeenLastCalledWith({ channelName: CHANNEL_NAME, msgIds: [8] });
  });

  test.todo("expectedFirstId");
});
