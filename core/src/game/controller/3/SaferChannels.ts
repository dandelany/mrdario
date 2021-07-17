import type { SCChannel } from "sc-channel";
import type { SCClientSocket } from "socketcluster-client";
import type { SCServerSocket } from "socketcluster-server";
import { defaults, remove, sortedIndex, times, pullAll } from "lodash";
import { assert } from "../../../utils/assert";

/*
* SaferChannels is a protocol & abstraction layer on top of SocketCluster channels which adds some
* additional reliability/eventual delivery by sending each message with a sequential ID,
* and having channels request repeats of missed messages if they see gaps in the sequence
* of (incoming) message IDs.
*
* SaferChannels expects to be run in a system with N channels, where each channel has
* exactly one sender; each sender may be either a SocketCluster server or client.
* It should also work with a single channel shared by exactly two senders (server and client).
* Each SaferChannels instance manages one outgoing channel and N incoming channels.
*
* You can watch the incoming channels for messages and publish to the outgoing channel just like
* normal. SaferChannels will look for missing messages and request/fulfill requests for repeats
* in the background - this is transparent to the user except for the fact that missed/repeated
* messages may be quite delayed and out of order.
*
* TODO / MAJOR KNOWN ISSUES TO RESOLVE
*  - Need to add support for server SC to publish, only client is supported currently
*  - Doesn't handle what to do when the socket disconnects/reconnects
*  - Currently repeat requests are only sent once. If a repeat is not received, they should
*     retry the request (with backoff/timeout)
*  - Out channels should use the socket.publish error handler to detect when messages weren't
*     sent and retry sending them (with backoff/timeout)
*  - If web client user refreshes the page after sending some messages, they will start sending
*     new messages starting with ID 0 (unless they pass the correct startId (their last message + 1))
*     these will be ignored as duplicates by receivers since these IDs have already been received.
*     How to handle this? save some state in localStorage? Add way for channel to ask for last known msg id?
*  - If a channel fails to send a message, multiple channels will likely send repeat requests, which
*     will cause multiple duplicate repeats to be sent when only one is necessary.
*     Should add a way for out channels to buffer their outgoing repeats and skip sending dupes.
* */

// separator used by Safer messages to separate message ID from content
// the string returned by encodeMsgId MUST NEVER include this string
export const SAFER_SEPARATOR = ":";
// token used to identify repeat request messages
export const REPEAT_TOKEN = "R";

export function isServerSocket(socket: SCServerSocket | SCClientSocket): socket is SCServerSocket {
  return "exchange" in socket;
}
//
// function assertIsString(val: any): asserts val is string {
//   if (typeof val !== "string") {
//     throw new Error("Not a string!");
//   }
// }

// utils - encode/decode an ID (positive integer number) as a string
//  todo - use something more efficient
export function encodeMsgId(id: number): string {
  return id + "";
}
export function decodeMsgId(idStr: string): number {
  return parseInt(idStr);
}

/* SaferMessage - internal representation of messages associated with their ID
*  and utils for parsing/serializing Messages from/to strings */
interface SaferMessage {
  id: number;
  token?: string;
  content: string;
}
function parseMessage(messageStr: string): SaferMessage {
  // get message ID from beginning of message ie. "[42]:R:message"
  const sepIndex = messageStr.indexOf(SAFER_SEPARATOR);
  assert(sepIndex > -1, `No separator (${SAFER_SEPARATOR})`);
  const msgIdStr = messageStr.substring(0, sepIndex);
  const id = decodeMsgId(msgIdStr);
  assert(id >= 0 && isFinite(id), `Invalid numeric ID: ${id} (${msgIdStr})`);

  // get repeat token if it exists ie. "42:[R]:message"
  let msgRemaining = messageStr.substring(sepIndex + 1);
  const sepIndex2 = msgRemaining.indexOf(SAFER_SEPARATOR);
  assert(sepIndex2 >= 0, `Missing 2nd separator (${SAFER_SEPARATOR})`);
  const token = msgRemaining.substring(0, sepIndex2);

  // remainder of message is the content
  const content = msgRemaining.substring(sepIndex2 + 1);

  return { id, token, content };
}
function serializeMessage(message: SaferMessage): string {
  const { id, token, content } = message;
  return `${encodeMsgId(id)}${SAFER_SEPARATOR}${token || ""}${SAFER_SEPARATOR}${content}`;
}

interface SaferRepeatRequest {
  channelName: string;
  msgIds: number[];
}
function parseRepeatRequest(content: string): SaferRepeatRequest {
  // repeat request content looks like "channelName:4,5,6" where 4,5,6 are the messages to repeat
  const sepIndex = content.indexOf(SAFER_SEPARATOR);
  assert(sepIndex > -1, `No separator (${SAFER_SEPARATOR}) in repeat request: ${content}`);
  const channelName = content.substring(0, sepIndex);
  assert(channelName.length > 0, `Missing channel name in repeat request: ${content}`);

  // split msgIds portion "4,5,6" into substrings and map them to numbers
  const msgIdsStr = content.substring(sepIndex + 1);
  const msgIds = msgIdsStr.split(",").map(decodeMsgId);
  msgIds.forEach(id => assert(id >= 0 && isFinite(id), `Invalid numeric ID: ${id} (in ${content})`));

  return { channelName, msgIds };
}
function serializeRepeatRequest(request: SaferRepeatRequest): string {
  const { channelName, msgIds } = request;
  return `${channelName}${SAFER_SEPARATOR}${msgIds.join(",")}`;
}

/* SaferChannelIn */

interface SaferChannelInOptions {
  socket: SCClientSocket | SCServerSocket;
  channelName: string;
  handleMessage?: (messageContent: string) => void | null;
  handleRepeatRequest?: (req: any) => void;
  sendRepeatRequest?: (request: SaferRepeatRequest) => void;
  ignoreDuplicates?: boolean;
  deliverInvalid?: boolean;
  // todo expectedFirstId?
  expectedFirstId?: number | null;
}

export class SaferChannelIn {
  options: Required<SaferChannelInOptions>;
  socket: SCClientSocket | SCServerSocket;
  channel: SCChannel;

  private handlers: ((data: any) => void)[];
  private messageIdLog: number[];
  private pendingRepeatRequestIds: number[];

  constructor(optionsArg: SaferChannelInOptions) {
    this.options = defaults({}, optionsArg, {
      handleMessage: null,
      handleRepeatRequest: () => {},
      sendRepeatRequest: () => {},
      ignoreDuplicates: true,
      deliverInvalid: false,
      expectedFirstId: null
    });
    this.socket = this.options.socket;
    this.handlers = this.options.handleMessage ? [this.options.handleMessage] : [];
    this.messageIdLog = [];
    this.pendingRepeatRequestIds = [];

    // subscribe to the channel & watch it for messages
    // if('exchange' in this.socket) {
    // this.socket.exchange.
    // }
    this.channel = isServerSocket(this.socket)
      ? this.socket.exchange.subscribe(this.options.channelName)
      : this.socket.subscribe(this.options.channelName);

    this.channel.watch(this.handleMessage);
  }

  watch(handler: (data: any) => void) {
    this.handlers.push(handler);
  }

  unwatch(handler: (data: any) => void) {
    remove(this.handlers, h => h === handler);
  }

  cleanup() {
    this.channel.unwatch(this.handleMessage);
    isServerSocket(this.socket)
      ? this.socket.exchange.unsubscribe(this.options.channelName)
      : this.socket.unsubscribe(this.options.channelName);
  }

  private handleMessage = (messageStr: string) => {
    // receive incoming messages
    // unwrap them and pass inner message content to subscribers
    let id: number | null;
    let token: string | undefined;
    let content: string;
    try {
      ({ id, token, content } = parseMessage(messageStr));
    } catch (e) {
      console.warn(`Invalid SaferChannel message format, skipping parse. Msg: ${messageStr}, error: ${e}`);
      if (!this.options.deliverInvalid) return;
      id = null;
      content = messageStr;
    }

    // add message id to the log, bail early if it's a duplicate
    let addedToLog: boolean;
    if (id !== null) {
      addedToLog = this.addToLog(id);
      // message is a dupe if not addedToLog
      if (!addedToLog && this.options.ignoreDuplicates) return;
    }

    // token denotes an internal SaferChannel network message,
    // handled here & not delivered to subscribers
    if (token) {
      if (token === REPEAT_TOKEN) {
        // message is an incoming request for repeat, parse & pass to repeat handler
        try {
          const request = parseRepeatRequest(content);
          this.options.handleRepeatRequest(request);
        } catch (e) {
          console.warn(`Invalid SaferChannel repeat request, skipping: "${messageStr}", ${e}`);
        }
      } else console.warn(`Unexpected token in SaferChannel message: ${token}`);
    } else {
      // no token - normal message - pass to subscriber handlers
      // console.log(this.messageIdLog);
      this.handlers.forEach(handler => handler(content));
    }

    // check for gaps in message log and send repeat requests for any missing messages
    this.checkLogAndRequestRepeats();
  };

  private addToLog(msgId: number): boolean {
    // add an incoming message ID to the message log
    // returns true if added new unique ID, false if ID already exists in log
    const { messageIdLog } = this;
    // sortedIndex finds correct insertion index in O(log n)
    const insertIndex = sortedIndex(messageIdLog, msgId);
    if (messageIdLog[insertIndex] === msgId) {
      console.log(`${msgId} already exists in log`);
      return false;
    }
    // console.log("adding", msgId, "at index", insertIndex);
    this.messageIdLog.splice(insertIndex, 0, msgId);
    return true;
  }

  private checkLogAndRequestRepeats() {
    // check log for missing message IDs
    let missingIds = this.getMissingLogIds();
    // compare to list of pending rpt requests (ie. sent requests but haven't gotten repeat msg response yet)
    // remove any IDs which are already on the pending list so we don't send duplicate requests,
    // only send them for newly missing IDs
    const { pendingRepeatRequestIds } = this;
    pullAll(missingIds, pendingRepeatRequestIds);

    if (missingIds.length) {
      // if we have new missing message IDs, send repeat requests to request them
      this.options.sendRepeatRequest({ channelName: this.options.channelName, msgIds: missingIds });

      // add the new missing message IDs to the pending list
      for (let missingId of missingIds) {
        const insertIndex = sortedIndex(pendingRepeatRequestIds, missingId);
        pendingRepeatRequestIds.splice(insertIndex, 0, missingId);
      }

      // todo: wait for missing messages before sending rpt request ?
      // todo: retry repeat requests N times if we don't get repeats
      // todo: timeout/throw error if we run out of retries?
      // todo: limit number of requests or messages per request?
      // todo: how to handle disconnects/reconnects?
    }
  }

  private getMissingLogIds(): number[] {
    // this.messageLog is a sorted ascending list of IDs all the messages we've received
    // go through the list looking for gaps ie. missing messages, so we can send repeat requests for them
    const { messageIdLog, options } = this;
    if (!messageIdLog.length) return [];
    // if we have expectedFirstId use it, otherwise assume the first message in log was first expected
    const expectedFirstId = options.expectedFirstId === null ? messageIdLog[0] : options.expectedFirstId;
    // console.log(`checking`, messageIdLog, 'for gaps starting with', expectedFirstId);

    let lastId = expectedFirstId - 1;
    let missingIds = [];
    for (let msgId of messageIdLog) {
      // look for places in the list where the difference btwn consecutive IDs is greater than 1 (gaps)
      const diff = msgId - lastId;
      if (diff > 1) {
        const missing = times(diff - 1, i => lastId + i + 1);
        missingIds.push(...missing);
      }
      lastId = msgId;
    }
    return missingIds;
  }
}

/* SaferChannelOut - Socket channel which publishes messages, repeats & repeat requests */

interface SaferChannelOutOptions {
  socket: SCClientSocket;
  channelName: string;
  firstId?: number;
}
export class SaferChannelOut {
  options: Required<SaferChannelOutOptions>;

  private messageLog: { [msgId: string]: string };
  private nextMsgId: number;

  constructor(optionsArg: SaferChannelOutOptions) {
    this.options = defaults({}, optionsArg, {
      firstId: 0
    });
    this.messageLog = {};
    this.nextMsgId = this.options.firstId;
  }

  publish(content: string) {
    this.publishNewMsg(content);
  }

  publishRepeats(msgIds: number[]) {
    // look up past outgoing message ID(s) in the message log and publish the messages again
    for (let msgId of msgIds) {
      const msgIdStr = msgId + "";
      if (!(msgIdStr in this.messageLog)) {
        console.warn(
          `Invalid repeat request for message ${msgId} - latest: ${this.nextMsgId - 1}. Skipping.`
        );
        continue;
      }
      const messageStr = this.messageLog[msgIdStr];
      const { socket, channelName } = this.options;

      // todo queue these or call with setTimeout so that regular publishes are sent out w/ higher priority?
      // todo handle errors from socket.publish, retry on failure!
      isServerSocket(socket) ?
        socket.exchange.publish(channelName, messageStr) :
        socket.publish(channelName, messageStr);
    }
  }
  publishRepeatRequest(request: SaferRepeatRequest) {
    // publish a repeat request message to ask for a repeat message from another channel
    const content = serializeRepeatRequest(request);
    this.publishNewMsg(content, REPEAT_TOKEN);
  }

  private publishNewMsg(content: string, token?: string) {
    const id = this.nextMsgId;
    const messageStr = serializeMessage({ id, content, token });

    this.messageLog[id + ""] = messageStr;
    this.nextMsgId += 1;

    const { socket, channelName } = this.options;
    isServerSocket(socket) ?
      socket.exchange.publish(channelName, messageStr) :
      socket.publish(channelName, messageStr);
    // console.log('published', messageStr, "to", channelName)
    // todo handle errors from socket.publish, retry on failure
  }
}

interface SaferChannelsOptions {
  socket: SCClientSocket;
  channelsIn: (Partial<SaferChannelInOptions> & { channelName: string })[];
  channelOut: Partial<SaferChannelOutOptions> & { channelName: string };
}
export class SaferChannels {
  channelsIn: { [channelName: string]: SaferChannelIn };
  channelOut: SaferChannelOut;

  constructor(options: SaferChannelsOptions) {
    const { socket } = options;
    // create input channels
    this.channelsIn = {};
    for (let channelInConfig of options.channelsIn) {
      const channelIn = new SaferChannelIn({
        ...channelInConfig,
        socket,
        handleRepeatRequest: this.handleRepeatRequest,
        sendRepeatRequest: this.publishRepeatRequest
      });
      this.channelsIn[channelInConfig.channelName] = channelIn;
    }
    // create output channel
    this.channelOut = new SaferChannelOut({
      ...options.channelOut,
      socket
    });
  }
  cleanup() {
    Object.values(this.channelsIn).forEach(channel => channel.cleanup());
    // this.channelOut.cleanup();
  }
  publish(messageContent: string) {
    // todo pass second handler arg?
    this.channelOut.publish(messageContent);
  }
  watch(channelName: string, handler: (msgContent: string) => void) {
    assert(channelName in this.channelsIn, `${channelName} not defined in channelsIn`);
    this.channelsIn[channelName].watch(handler);
  }
  unwatch(channelName: string, handler: (msgContent: string) => void) {
    assert(channelName in this.channelsIn, `${channelName} not defined in channelsIn`);
    this.channelsIn[channelName].unwatch(handler);
  }

  handleRepeatRequest = (request: SaferRepeatRequest) => {
    // handler called by SaferChannelIn when a repeat request message is received
    // publish a repeat if the request was addressed to our channelOut, else ignore it
    const { channelName, msgIds } = request;
    if (channelName === this.channelOut.options.channelName) {
      this.channelOut.publishRepeats(msgIds);
    }
    // console.log('got repeat request', request);
  };
  publishRepeatRequest = (request: SaferRepeatRequest) => {
    // handler called by SaferChannelIn when messages are missing,
    // to ask SaferChannelOut to publish requests for repeat
    // publish the request on our channelOut
    this.channelOut.publishRepeatRequest(request);
  };
}
