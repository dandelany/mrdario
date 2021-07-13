import { decodeMsgId, encodeMsgId, SaferChannelIn } from "./SaferChannels";
import { SCClientSocket } from "socketcluster-client";


// import { assert } from "../../utils/assert";

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
}

interface MockSocketInterface extends SCClientSocket {
  mockPublish: (channelName: string, message: string) => void;
}

function getMockSocket() {
  return (new MockSocket() as any) as MockSocketInterface;
}

const CHANNEL_NAME = "test-channel";

describe("encodeMsgId/decodeMsgId", () => {
  test("Encodes & decodes positive integers to/from a string", () => {
    function testEncodeDecode(id: number) {
      const encoded = encodeMsgId(id);
      expect(typeof encoded).toBe('string');
      const decoded = decodeMsgId(encoded);
      expect(typeof decoded).toBe('number');
      expect(decoded).toEqual(id);
    }
    testEncodeDecode(1);
    testEncodeDecode(42);
    testEncodeDecode(97265);
    testEncodeDecode(182903812);
  })
});

describe("SaferChannelIn", () => {
  let socket: MockSocketInterface;
  let channelIn: SaferChannelIn;

  beforeEach(() => {
    // create a new SaferChannelIn for each test
    socket = getMockSocket();
    channelIn = new SaferChannelIn({
      socket,
      channelName: CHANNEL_NAME,
      sendRepeatRequest: jest.fn(),
      handleRepeatRequest: jest.fn()
    });
  });
  afterEach(() => {
    if (channelIn) channelIn.cleanup();
  });

  test("Starts watching a (mock) socket channel after being constructed", () => {
    expect(channelIn.channel).toBeInstanceOf(MockChannel);
    expect(channelIn.channel).toStrictEqual(socket.channels[CHANNEL_NAME]);

    expect(socket.subscribe).toHaveBeenCalledWith(CHANNEL_NAME);
    expect(channelIn.channel.watch).toHaveBeenCalledTimes(1);
  });

  test("Parses, unwraps and delivers messages published on the channel to handlers", () => {
    const handler1 = jest.fn();
    channelIn.watch(handler1);
    expect(handler1).not.toHaveBeenCalled();

    socket.mockPublish(CHANNEL_NAME, "0::zero");
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler1).toHaveBeenCalledWith("zero");

    // attach a second handler
    const handler2 = jest.fn();
    channelIn.watch(handler2);

    socket.mockPublish(CHANNEL_NAME, "1::one");
    expect(handler1).toHaveBeenCalledTimes(2);
    expect(handler1).toHaveBeenCalledWith("one");
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledWith("one");
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

  test("Passes incoming repeat request messages to `handleRepeatRequest` instead of normal message handlers", () => {
    const handler = jest.fn();
    channelIn.watch(handler);

    const {handleRepeatRequest} = channelIn.options;
    expect(jest.isMockFunction(handleRepeatRequest)).toBe(true);
    expect(handleRepeatRequest).not.toHaveBeenCalled();

    const repeatRequestMsg = "12:R:8";
    socket.mockPublish(CHANNEL_NAME, repeatRequestMsg);
    expect(handleRepeatRequest).toHaveBeenCalledTimes(1);
    expect(handleRepeatRequest).toHaveBeenCalledWith("8");
    expect(handler).not.toHaveBeenCalled();

    socket.mockPublish(CHANNEL_NAME, "13::thirteen");
    socket.mockPublish(CHANNEL_NAME, "14:R:11");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("thirteen");
    expect(handleRepeatRequest).toHaveBeenCalledTimes(2);
    expect(handleRepeatRequest).toHaveBeenCalledWith("11");

  });
  test.todo("When missing messages are detected, repeat requests are created and passed to `sendRepeatRequest` ");
  test.todo("expectedFirstId");

});
