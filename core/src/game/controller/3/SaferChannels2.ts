import type { SCChannel } from "sc-channel";
import type { SCExchange } from "sc-broker-cluster";
import type { SCClientSocket } from "socketcluster-client";
import type { SCServerSocket } from "socketcluster-server";
import { defaults, remove, sortedIndex, times, pullAll, sortedIndexOf } from "lodash";
import { assert } from "../../../utils/assert";
import { SaferChannelIn, SaferChannelOut } from "./SaferChannels";

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
// unique token for Repeat request messages (sent by clients)
export const REPEAT_TOKEN = "R";
// unique token for rePublish request messages (sent by server)
export const REPUBLISH_TOKEN = "P";
// unique token for reConnect notice (sent by client when client reconnects)
export const RECONNECT_TOKEN = "C";

export function isServerSocket(socket: SCServerSocket | SCClientSocket): socket is SCServerSocket {
  return "exchange" in socket;
}

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
  msgIds.forEach((id) => assert(id >= 0 && isFinite(id), `Invalid numeric ID: ${id} (in ${content})`));

  return { channelName, msgIds };
}
function serializeRepeatRequest(request: SaferRepeatRequest): string {
  const { channelName, msgIds } = request;
  return `${channelName}${SAFER_SEPARATOR}${msgIds.join(",")}`;
}

// given a list of numbers which is expected to be consecutive/sequential,
// returns a list of numbers which are missing from the sequence
// eg. [1,3,4,5,8] returns [2,6,7]
// optional second argument defines the expected first number in sequence
// eg. if called with ([2,3], 0) returns [0,1]
function findGapsInSequence(sequence: number[], expectedFirst?: number | null): number[] {
  if (!sequence.length) return sequence;
  // if we have first use it, otherwise start with first number in sequence
  const first = typeof expectedFirst === "number" && isFinite(expectedFirst) ? expectedFirst : sequence[0];
  // console.log(`checking`, sequence, "for gaps starting with", first);

  let lastNum = first - 1;
  let missing: number[] = [];
  for (let num of sequence) {
    // find places where the difference btwn consecutive numbers is greater than 1 (gaps)
    const diff = num - lastNum;
    if (diff > 1) {
      missing.push(...times(diff - 1, (i) => lastNum + i + 1));
    }
    lastNum = num;
  }
  return missing;
}

// base channel - shared channel things(?)

export interface CommonSaferChannelOptions {}

// clients pass socket, server passes exchange
export interface BaseSaferClientChannelOptions extends CommonSaferChannelOptions {
  socket: SCClientSocket;
}
export interface BaseSaferServerChannelOptions extends CommonSaferChannelOptions {
  exchange: SCExchange;
}
export type BaseSaferChannelOptions = BaseSaferClientChannelOptions | BaseSaferServerChannelOptions;
export class BaseSaferChannel {
  options: Required<BaseSaferChannelOptions>;
  constructor(optionsArg: BaseSaferClientChannelOptions) {
    this.options = defaults({}, optionsArg, {   });
    
  }
}

/* --- CLIENT --- */

/*
 * SaferClientChannelIn
 *  client channel listening for messages from another client or the server
 *  subscribes to the channel
 *  watches for messages & parses them
 *    for normal messages, calls user listener callbacks with parsed message
 *  keeps a log of IDs of all received messages
 *    since msg IDs are sequential, nonsequential IDs in log = missing messages
 *    checks log for gaps, request repeats of missing messages via callback
 *
 * issue: only sends one repeat request for a given ID
 * todo: retry repeat requests N times if we don't get repeats
 * todo: timeout/throw error if we run out of retries?
 * todo: wait X milliseconds for missing messages before sending rpt request?
 * todo: limit number of requests or messages per request?
 * todo: do anything on disconnect/reconnect?
 */

export interface SaferClientChannelInOptions {
  // socketcluster client socket object - maintains websocket connection
  socket: SCClientSocket;
  // unique name of the socketcluster channel we're listening to
  channelName: string;
  // initial message listener callback, called when we get a message (optional)
  onMessage?: (messageContent: string) => void | null;
  // callback function to call when we notice a missing message on the channel
  // passes a repeat request which will be sent to the server on an OutChannel
  sendRepeatRequest?: (request: SaferRepeatRequest) => void;
  // callback function to call when we get a republish message from the server
  handleRepublishRequest?: (request: SaferRepeatRequest) => void;
  // if true, calls message listeners even if the message is not a valid format
  deliverInvalid?: boolean;
  // the first message ID we expect to receive on the channel
  // if null/undefined, the 1st message we receive will be considered the 1st expected
  // if eg. expectedFirstId is 4 and the 1st message we get is 6,
  // repeats will be requested for message IDs 4 and 5
  expectedFirstId?: number | null;
}
export class SaferClientChannelIn {
  options: Required<SaferClientChannelInOptions>;
  socket: SCClientSocket;
  channel: SCChannel;

  private listeners: ((data: any) => void)[];
  private messageIdLog: number[];
  private pendingRepeatRequestIds: number[];

  constructor(optionsArg: SaferClientChannelInOptions) {
    // combine user options with defaults to create complete options object
    this.options = defaults({}, optionsArg, {
      onMessage: null,
      sendRepeatRequest: () => {},
      deliverInvalid: false,
      expectedFirstId: null,
    });
    this.socket = this.options.socket;

    this.listeners = this.options.onMessage ? [this.options.onMessage] : [];
    this.messageIdLog = [];
    this.pendingRepeatRequestIds = [];

    // subscribe to the channel & watch it for messages
    this.channel = this.socket.subscribe(this.options.channelName);
    this.channel.watch(this.handleMessage);
  }

  watch(listener: (data: any) => void) {
    this.listeners.push(listener);
  }
  unwatch(listener: (data: any) => void) {
    remove(this.listeners, (h) => h === listener);
  }
  cleanup() {
    this.channel.unwatch(this.handleMessage);
    this.socket.unsubscribe(this.options.channelName);
  }

  private handleMessage = (messageStr: string) => {
    // received incoming message on the channel - parse it into a SaferMessage object
    let message: SaferMessage;
    try {
      message = parseMessage(messageStr);
    } catch (e) {
      console.warn(`Invalid SaferChannel message format, skipping parse. Msg: ${messageStr}, error: ${e}`);
      if (this.options.deliverInvalid) this.deliverMessage(messageStr);
      return;
    }
    let { id, token, content } = message;

    // add message id to the log. if not added to log,
    // it's a duplicate (already received) message, return early
    let addedToLog: boolean;
    if (id !== null) {
      addedToLog = this.addToLog(id);
      if (!addedToLog) return;
    }

    // if message has no token, deliver it to listeners
    if (!token) this.deliverMessage(content);
    else if (token === REPUBLISH_TOKEN) {
      // server is asking to republish a message it missed on a given channel
      // pass to callback so it can be published on our OutChannel if necessary
      let request: SaferRepeatRequest;
      try {
        request = parseRepeatRequest(content);
        // todo queue this?
        this.options.handleRepublishRequest(request);
      } catch (e) {
        console.warn(`Invalid SaferChannel republish request, skipping: "${messageStr}", ${e}`);
        // return;
      }
    }
    // ignore other tokens
    //  - repeat requests are handled by the server

    // check if the message is a repeat we previously requested
    const pendingRepeatRequestIndex = sortedIndexOf(this.pendingRepeatRequestIds, id);
    if (pendingRepeatRequestIndex > -1) {
      // message is a repeat we requested, remove it from the list of pending requests
      this.pendingRepeatRequestIds.splice(pendingRepeatRequestIndex, 1);
    } else {
      // message is new, maybe the correct (expected) next message or there might be gaps
      // check for gaps in message ID log & send repeat requests for any missing messages
      this.checkLogAndRequestRepeats();
    }
  };

  deliverMessage(messageContent: string) {
    // deliver message to all listeners (watch functions)
    this.listeners.forEach((listener) => listener(messageContent));
  }

  private addToLog(msgId: number): boolean {
    // add an incoming message ID to the message log
    // returns true if added new unique ID, false if ID already exists in log
    const { messageIdLog } = this;
    // sortedIndex finds correct insertion index in O(log n) time
    const insertIndex = sortedIndex(messageIdLog, msgId);
    if (messageIdLog[insertIndex] === msgId) {
      // console.log(`${msgId} already exists in log`);
      return false;
    }
    // console.log("adding", msgId, "at index", insertIndex);
    this.messageIdLog.splice(insertIndex, 0, msgId);

    return true;
  }

  private checkLogAndRequestRepeats() {
    const { messageIdLog, options, pendingRepeatRequestIds } = this;

    // this.messageIdLog is a sorted ascending list of IDs all the messages we've received
    // search the list looking for gaps ie. missing messages, so we can send repeat requests for them
    const missingIds = findGapsInSequence(messageIdLog, options.expectedFirstId);

    // compare to list of pending rpt requests (ie. sent requests but haven't gotten repeat msg response yet)
    // remove any IDs which are already on the pending list so we don't send duplicate requests,
    // only send them for newly missing IDs
    pullAll(missingIds, pendingRepeatRequestIds);

    if (missingIds.length) {
      // if we have new missing message IDs, send repeat requests to request them
      this.options.sendRepeatRequest({ channelName: this.options.channelName, msgIds: missingIds });

      // add the new missing message IDs to the pending list
      for (let missingId of missingIds) {
        const insertIndex = sortedIndex(pendingRepeatRequestIds, missingId);
        pendingRepeatRequestIds.splice(insertIndex, 0, missingId);
      }
    }
  }
}

/*
 *
 * SaferClientChannelOut
 *  channel on which a client sends messages to other clients & server
 *  publish method, wrap message & send with ID
 *    check if socket is connected/subscribed, queue message if not
 *    catch publish failure with error handler (ie. server didn't receive message)
 *    retry (with backoff/timeout) on publish failure
 *  listen for republish requests from server
 *    look up given message in sent message log and publish it again
 *    ignore all other incoming messages on channel
 *  when socket disconnects, put outgoing messages in a queue rather than sending
 *  when socket reconnects, send messages in queue
 *
 *

 *
 * */

export interface SaferClientChannelOutOptions {
  socket: SCClientSocket;
  channelName: string;
  firstId?: number;
}

export class SaferClientChannelOut {
  options: Required<SaferClientChannelOutOptions>;
  socket: SCClientSocket;
  channel: SCChannel;
  // log of outgoing messages we've sent, by ID
  private messageLog: { [msgId: string]: string };
  // ID for the next message to send
  private nextMsgId: number;

  constructor(optionsArg: SaferClientChannelOutOptions) {
    this.options = defaults({}, optionsArg, {
      firstId: 0,
    });
    this.socket = this.options.socket;
    this.messageLog = {};
    this.nextMsgId = this.options.firstId;

    // subscribe to the channel & watch it for messages
    // other clients can't send on this channel, but the server sends republish requests
    this.channel = this.socket.subscribe(this.options.channelName);
  }
  cleanup() {
    this.socket.unsubscribe(this.options.channelName);
  }

  publish(content: string) {
    this.publishNewMsg(content);
  }
  publishRepeatRequest(request: SaferRepeatRequest) {
    // publish a repeat request message to ask for a repeat message from another channel
    const content = serializeRepeatRequest(request);
    this.publishNewMsg(content, REPEAT_TOKEN);
  }
  republish(msgIds: number[]) {
    // look up past outgoing message ID(s) in the message log and publish the messages again
    for (let msgId of msgIds) {
      const msgIdStr = msgId + "";
      if (!(msgIdStr in this.messageLog)) {
        console.warn(`Bad republish request for msg ${msgId} - latest: ${this.nextMsgId - 1}. Skipping.`);
        continue;
      }
      const messageStr = this.messageLog[msgIdStr];
      // todo queue these or call with setTimeout so that regular publishes are sent out w/ higher priority?
      // todo handle errors from socket.publish, retry on failure!
      this._publish(messageStr);
    }
  }

  private _publish(messageStr: string) {
    // this.socket.publish(this.options.channelName, messageStr, (err: Error, _ackData: any) => {
    //   if(err) console.error(err);
    //   // todo handle this error?
    //   // retry on failure?
    // });
    this.socket.publish(this.options.channelName, messageStr);
  }
  private publishNewMsg(content: string, token?: string) {
    // create message object with next ID
    const id = this.nextMsgId;
    const messageStr = serializeMessage({ id, content, token });

    // add message to the log and increment next message ID
    this.messageLog[id + ""] = messageStr;
    this.nextMsgId += 1;

    this._publish(messageStr);
    // console.log('published', messageStr, "to", channelName)
  }
}

/**
 * SaferChannelsClient manages a set of client In and Out channels
 */

export interface SaferChannelsClientOptions {
  socket: SCClientSocket;
  channelsIn: (Partial<SaferClientChannelInOptions> & { channelName: string })[];
  channelOut: Partial<SaferClientChannelOutOptions> & { channelName: string };
}
export class SaferChannelsClient {
  channelsIn: { [channelName: string]: SaferClientChannelIn };
  channelOut: SaferClientChannelOut;

  constructor(options: SaferChannelsClientOptions) {
    const { socket } = options;
    this.channelsIn = {};
    for (let channelInConfig of options.channelsIn) {
      this.channelsIn[channelInConfig.channelName] = new SaferClientChannelIn({
        ...channelInConfig,
        socket,
        handleRepublishRequest: this.handleRepublishRequest,
        sendRepeatRequest: this.publishRepeatRequest,
      });
    }
    // create output channel
    this.channelOut = new SaferClientChannelOut({
      ...options.channelOut,
      socket,
    });
  }
  cleanup() {
    Object.values(this.channelsIn).forEach((channel) => channel.cleanup());
    this.channelOut.cleanup();
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

  handleRepublishRequest = (request: SaferRepeatRequest) => {
    // handler called by SaferChannelIn when a repeat request message is received
    // publish a repeat if the request was addressed to our channelOut, else ignore it
    console.log("got request", request);
    const { channelName, msgIds } = request;
    if (channelName === this.channelOut.options.channelName) {
      this.channelOut.republish(msgIds);
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

/* --- SERVER --- */

/**
 * SaferServerChannelIn
 *  channel on which server receives messages sent
 *  also keeps track of sending repeats
 **/

export interface SaferServerChannelInOptions {
  socket: SCServerSocket;
  exchange: SCExchange;
  channelName: string;
  onMessage?: ((messageContent: string) => void) | null;
}
export class SaferServerChannelIn {
  options: Required<SaferServerChannelInOptions>;
  socket: SCServerSocket;
  private listeners: ((data: any) => void)[];
  private channel: SCChannel;
  // log of outgoing messages we've received, by ID
  private messageLog: { [msgId: string]: string };

  constructor(optionsArg: SaferServerChannelInOptions) {
    this.options = defaults({}, optionsArg, {
      onMessage: null,
      deliverInvalid: false,
      expectedFirstId: null,
    });
    this.socket = this.options.socket;
    this.messageLog = {};

    this.listeners = this.options.onMessage ? [this.options.onMessage] : [];

    // subscribe to the channel & watch it for messages
    this.channel = this.options.exchange.subscribe(this.options.channelName);
    this.channel.watch(this.handleMessage);
  }
  watch(listener: (data: any) => void) {
    this.listeners.push(listener);
  }
  unwatch(listener: (data: any) => void) {
    remove(this.listeners, (h) => h === listener);
  }
  cleanup() {
    this.channel.unwatch(this.handleMessage);
    this.options.exchange.unsubscribe(this.options.channelName);
  }
  deliverMessage(messageContent: string) {
    // deliver message to all listeners (watch functions)
    this.listeners.forEach((listener) => listener(messageContent));
  }

  private handleMessage = (messageStr: string) => {
    // received incoming message on the channel - parse it into a SaferMessage object
    let message: SaferMessage;
    try {
      message = parseMessage(messageStr);
    } catch (e) {
      console.warn(`Invalid SaferChannel message format, skipping parse. Msg: ${messageStr}, error: ${e}`);
      // if (this.options.deliverInvalid) this.deliverMessage(messageStr);
      return;
    }
    let { id, token, content } = message;

    // add message to log, return early if duplicate message
    const addedToLog = this.addMessageToLog(message);
    if (!addedToLog) return;

    // if message has no token, deliver it to listeners
    if (!token) this.deliverMessage(content);
    // todo...
    // check for gaps
    // send repeats
  };

  private addMessageToLog(message: SaferMessage): boolean {
    // todo
    console.log(message);
    return true;
  }
}

/**
 *
 * SaferServerChannelOut
 *
 * SaferChannelsServer
 *
 */