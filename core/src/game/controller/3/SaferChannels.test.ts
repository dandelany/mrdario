import { decodeMsgId, encodeMsgId, SaferChannelIn, SaferChannelOut, SaferChannels } from "./SaferChannels";
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

describe("encodeMsgId/decodeMsgId", () => {
  test("Encodes & decodes positive integers to/from a string", () => {
    function testEncodeDecode(id: number) {
      const encoded = encodeMsgId(id);
      expect(typeof encoded).toBe("string");
      const decoded = decodeMsgId(encoded);
      expect(typeof decoded).toBe("number");
      expect(decoded).toEqual(id);
    }
    testEncodeDecode(1);
    testEncodeDecode(42);
    testEncodeDecode(97265);
    testEncodeDecode(182903812);
  });
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

  test("Passes incoming repeat request messages to `handleRepeatRequest` instead of normal message handlers", () => {
    const handler = jest.fn();
    channelIn.watch(handler);
    const { handleRepeatRequest } = channelIn.options;
    expect(jest.isMockFunction(handleRepeatRequest)).toBe(true);
    expect(handleRepeatRequest).not.toHaveBeenCalled();

    // publish a repeat request message for channel "alice", message 8
    socket.mockPublish(CHANNEL_NAME, "12:R:alice:8");
    expect(handleRepeatRequest).toHaveBeenCalledTimes(1);
    expect(handleRepeatRequest).toHaveBeenCalledWith({
      channelName: "alice",
      msgIds: [8]
    });
    expect(handler).not.toHaveBeenCalled();

    socket.mockPublish(CHANNEL_NAME, "13::thirteen");
    socket.mockPublish(CHANNEL_NAME, "14:R:bob:11,13,14");
    expect(handleRepeatRequest).toHaveBeenCalledTimes(2);
    expect(handleRepeatRequest).toHaveBeenLastCalledWith({
      channelName: "bob",
      msgIds: [11, 13, 14]
    });
  });
  test("Ignores badly formatted repeat requests", () => {
    const handler = jest.fn();
    channelIn.watch(handler);
    const { handleRepeatRequest } = channelIn.options;
    // publish a bad repeat request
    socket.mockPublish(CHANNEL_NAME, "18:R:Invalid");
    expect(handleRepeatRequest).not.toHaveBeenCalled();
    socket.mockPublish(CHANNEL_NAME, "19:R:ok:7");
    expect(handleRepeatRequest).toHaveBeenCalledTimes(1);
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

describe("SaferChannelOut", () => {
  let socket: MockSocketInterface;
  let channelOut: SaferChannelOut;

  beforeEach(() => {
    // create a new SaferChannelIn for each test
    socket = getMockSocket();
    channelOut = new SaferChannelOut({
      socket,
      channelName: CHANNEL_NAME
    });
  });
  test("Publishes messages on the channel with correct message format and ID", () => {
    expect(socket.publish).not.toHaveBeenCalled();
    channelOut.publish("alpha");
    expect(socket.publish).toHaveBeenCalledTimes(1);
    expect(socket.publish).toHaveBeenCalledWith(CHANNEL_NAME, "0::alpha");
    channelOut.publish("bravo");
    expect(socket.publish).toHaveBeenCalledTimes(2);
    expect(socket.publish).toHaveBeenLastCalledWith(CHANNEL_NAME, "1::bravo");
  });
  test("Publishes repeats of past messages by ID", () => {
    channelOut.publish("alpha");
    channelOut.publish("bravo");
    channelOut.publish("charlie");
    expect(socket.publish).toHaveBeenCalledTimes(3);
    expect(socket.publish).toHaveBeenLastCalledWith(CHANNEL_NAME, "2::charlie");

    channelOut.publishRepeats([0]);
    expect(socket.publish).toHaveBeenCalledTimes(4);
    expect(socket.publish).toHaveBeenLastCalledWith(CHANNEL_NAME, "0::alpha");
    channelOut.publishRepeats([1, 2]);
    expect(socket.publish).toHaveBeenCalledTimes(6);
    expect(socket.publish).toHaveBeenLastCalledWith(CHANNEL_NAME, "2::charlie");
  });
  test("Publishes repeat requests to ask for repeat messages from other channels", () => {
    channelOut.publish("alpha");
    channelOut.publishRepeatRequest({ channelName: "otherChannel", msgIds: [3, 4] });
    expect(socket.publish).toHaveBeenCalledTimes(2);
    expect(socket.publish).toHaveBeenLastCalledWith(CHANNEL_NAME, "1:R:otherChannel:3,4");
  });
  test.todo("Starts with startId if provided")
});

describe("SaferChannels", () => {
  let socket: MockSocketInterface;
  let saferChannels: SaferChannels;

  beforeEach(() => {
    // create a new SaferChannels for each test
    socket = getMockSocket();
    saferChannels = new SaferChannels({
      socket,
      channelsIn: [
        { channelName: "in1", handleMessage: jest.fn() },
        { channelName: "in2", handleMessage: jest.fn() }
      ],
      channelOut: { channelName: "out" }
    });
  });
  afterEach(() => {
    saferChannels.cleanup();
  });

  test("Creates input and output channels when constructed", () => {
    expect(saferChannels).toBeInstanceOf(SaferChannels);

    const { channelOut, channelsIn } = saferChannels;
    expect(channelOut).toBeInstanceOf(SaferChannelOut);
    expect(channelOut.options.channelName).toBe("out");

    expect(channelsIn["in1"]).toBeInstanceOf(SaferChannelIn);
    expect(channelsIn["in1"].options.channelName).toBe("in1");
    expect(channelsIn["in2"]).toBeInstanceOf(SaferChannelIn);
    expect(channelsIn["in2"].options.channelName).toBe("in2");
  });

  test("Publishes messages on the Out channel", () => {
    expect(socket.publish).not.toHaveBeenCalled();
    saferChannels.publish("hello mr dario");
    expect(socket.publish).toHaveBeenCalledTimes(1);
    expect(socket.publish).toHaveBeenLastCalledWith("out", "0::hello mr dario");
  });

  test("Listens for messags on the In channels", () => {
    socket.mockPublish("in1", "0::one");
    socket.mockPublish("in2", "0::two");
    // can attach handleMessage handler when constructing SaferChannels
    expect(saferChannels.channelsIn["in1"].options.handleMessage).toHaveBeenCalledTimes(1);
    expect(saferChannels.channelsIn["in1"].options.handleMessage).toHaveBeenCalledWith("one");
    expect(saferChannels.channelsIn["in2"].options.handleMessage).toHaveBeenCalledTimes(1);
    expect(saferChannels.channelsIn["in2"].options.handleMessage).toHaveBeenCalledWith("two");

    // and/or add additional handlers
    const in1Handler = jest.fn();
    saferChannels.watch("in1", in1Handler);
    const in2Handler = jest.fn();
    saferChannels.watch("in2", in2Handler);

    expect(in1Handler).not.toHaveBeenCalled();
    socket.mockPublish("in1", "1::red");
    expect(in1Handler).toHaveBeenCalledTimes(1);
    expect(in1Handler).toHaveBeenLastCalledWith("red");
    expect(in2Handler).not.toHaveBeenCalled();
    socket.mockPublish("in2", "1::blue");
    expect(in2Handler).toHaveBeenCalledTimes(1);
    expect(in2Handler).toHaveBeenLastCalledWith("blue");
    expect(in1Handler).toHaveBeenCalledTimes(1);

    // original handlers got called too
    expect(saferChannels.channelsIn["in1"].options.handleMessage).toHaveBeenCalledTimes(2);
    expect(saferChannels.channelsIn["in1"].options.handleMessage).toHaveBeenLastCalledWith("red");
    expect(saferChannels.channelsIn["in2"].options.handleMessage).toHaveBeenCalledTimes(2);
    expect(saferChannels.channelsIn["in2"].options.handleMessage).toHaveBeenLastCalledWith("blue");
  });

  test.todo("Sends repeat requests on Out channel if messages are missing on In channels");
  
  test("Sends repeat messages on Out if repeat requests are received on In channels", () => {
    saferChannels.publish("make sure");
    saferChannels.publish("you get");
    saferChannels.publish("all of");
    saferChannels.publish("the messages");
    expect(socket.publish).toHaveBeenCalledTimes(4);
    expect(socket.publish).toHaveBeenLastCalledWith("out", "3::the messages");
    // request repeat of message 2 from in2 channel
    socket.mockPublish('in2', "0:R:out:2");
    socket.mockPublish('in2', "1::other things");
    expect(socket.publish).toHaveBeenCalledTimes(5);
    expect(socket.publish).toHaveBeenLastCalledWith("out", "2::all of");
    // request repeat of messages 0 & 1 from in1 channel
    socket.mockPublish('in1', "0::hello there");
    socket.mockPublish('in1', "1:R:out:0,1");
    expect(socket.publish).toHaveBeenCalledTimes(7);
    expect(socket.publish).toHaveBeenLastCalledWith("out", "1::you get");

  });
});
