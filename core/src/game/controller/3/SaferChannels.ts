import { SCChannel } from "sc-channel";
import { SCClientSocket } from "socketcluster-client";
import { defaults, remove, sortedIndex } from "lodash";
import { assert } from "../../../utils/assert";

// separator used by Safer messages to separate message ID from content
// the string returned by encodeMsgId MUST NEVER include this string
export const SAFER_SEPARATOR = ":";
// token used to identify repeat request messages
export const REPEAT_TOKEN = "R";

// encode/decode a (positive integer) number as a string
export function encodeMsgId(id: number): string {
  return id + "";
}
export function decodeMsgId(idStr: string): number {
  return parseInt(idStr);
}

// function isRepeatRequest(message: string) {
//   return;
// }
//
// type RepeatRequest = {
//   channelName: string;
// };
// function decodeRepeatRequest(message: string) {
//   // repeat message format:
//   if (!message.startsWith("_RPT_")) {
//     return "";
//   }
// }

function parseMessage(message: string): { id: number; token: string; content: string } {
  // get message ID from beginning of message ie. "[42]:R:message"
  const sepIndex = message.indexOf(SAFER_SEPARATOR);
  assert(sepIndex > -1, `No separator (${SAFER_SEPARATOR})`);
  const msgIdStr = message.substring(0, sepIndex);
  const id = decodeMsgId(msgIdStr);
  assert(id >= 0 && isFinite(id), `Invalid numeric ID: ${id} (${msgIdStr})`);

  // get repeat token if it exists ie. "42:[R]:message"
  let msgRemaining = message.substring(sepIndex + 1);
  const sepIndex2 = msgRemaining.indexOf(SAFER_SEPARATOR);
  assert(sepIndex2 >= 0, `Missing 2nd separator (${SAFER_SEPARATOR})`);
  const token = msgRemaining.substring(0, sepIndex2);

  // remainder of message is the content
  const content = msgRemaining.substring(sepIndex2 + 1);

  return { id, token, content };
}
function serializeMessage(message: { id: number; token: string; content: string }): string {
  const {id, token, content} = message;
  return `${encodeMsgId(id)}${SAFER_SEPARATOR}${token || ""}${SAFER_SEPARATOR}${content}`;
}

interface SaferChannelInOptions {
  socket: SCClientSocket;
  channelName: string;
  handleRepeatRequest?: (req: any) => void;
  sendRepeatRequest?: (req: any) => void;
  ignoreDuplicates?: boolean;
  deliverInvalid?: boolean;
  // todo expectedFirstId?
  expectedFirstId?: number | null;
}

export class SaferChannelIn {
  options: Required<SaferChannelInOptions>;
  channelName: string;
  socket: SCClientSocket;
  channel: SCChannel;

  private messageLog: number[];
  private handlers: ((data: any) => void)[];

  constructor(optionsArg: SaferChannelInOptions) {
    const options = defaults({}, optionsArg, {
      handleRepeatRequest: () => {},
      sendRepeatRequest: () => {},
      ignoreDuplicates: true,
      deliverInvalid: false,
      expectedFirstId: null
    });
    this.options = options;
    this.socket = options.socket;
    this.channelName = options.channelName;
    this.messageLog = [];
    this.handlers = [];

    // subscribe to the channel & watch it for messages
    this.channel = this.socket.subscribe(this.channelName);
    this.channel.watch(this.handleMessage);
  }

  cleanup() {
    this.channel.unwatch(this.handleMessage);
    this.socket.unsubscribe(this.channelName);
  }

  handleMessage = (message: string) => {
    // receive incoming messages
    // unwrap them and pass inner message content to subscribers
    let id: number | null;
    let token: string | undefined;
    let content: string;
    try {
      ({ id, token, content } = parseMessage(message));
    } catch (e) {
      console.warn(`Invalid SaferChannel message format, skipping parse. Msg: ${message}, error: ${e}`);
      if (!this.options.deliverInvalid) return;
      id = null;
      content = message;
    }

    // add message to the log, bail early if it's a duplicate
    let addedToLog: boolean;
    if (id !== null) {
      addedToLog = this.addToLog(id, content);
      // message is a dupe if !addedToLog
      if (!addedToLog && this.options.ignoreDuplicates) return;
    }

    // todo: if the message is an incoming REPEAT message,
    //  parse & pass it to the repeat request handler

    // token denotes an internal SaferChannel network message,
    // handled here & not delivered to subscribers
    if (token) {
      if(token === REPEAT_TOKEN) {
        // message is an incoming request for repeat
        // todo parse to numbers first?
        this.options.handleRepeatRequest(content);
      } else console.warn(`Unexpected token in SaferChannel message: ${token}`);
      // return early, don't deliver internal messages to subscribers
      return;
    }

    // todo: check for missing messages
    //  if message(s) are missing from log,
    //  send REPEAT messages to request them
    // todo: keep track of outgoing rpt requests, don't duplicate
    // todo: wait for missing messages before sending rpt request ?


    console.log(this.messageLog);
    this.handlers.forEach(handler => handler(content));
  };

  watch(handler: (data: any) => void) {
    this.handlers.push(handler);
  }
  unwatch(handler: (data: any) => void) {
    remove(this.handlers, h => h === handler);
  }

  private addToLog(msgId: number, _msgContent: string): boolean {
    // add an incoming message ID to the message log
    // returns true if added new unique ID, false if ID already exists in log
    const { messageLog } = this;
    const insertIndex = sortedIndex(messageLog, msgId);
    if (messageLog[insertIndex] === msgId) {
      console.log(`${msgId} already exists in log`);
      return false;
    }
    console.log("adding", msgId, "at index", insertIndex);
    this.messageLog.splice(insertIndex, 0, msgId);
    return true;
  }
}

export class SaferChannelOut {
  constructor() {}
  publish(msgContent: string) {
    serializeMessage({id: 0, token: "", content: msgContent});
  }
  publishRepeat() {}
  publishRepeatRequest() {}
}

export class SaferChannels {
  constructor() {}
}
