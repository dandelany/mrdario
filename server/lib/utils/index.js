"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const random_word_by_length_1 = __importDefault(require("random-word-by-length"));
// export * from "./socket";
// todo use or delete these?
function makeGameToken() {
    return Math.round(Math.random() * 1000000).toString(36);
}
exports.makeGameToken = makeGameToken;
function initSingleGame() {
    // const id = uuid.v4();
    const id = lodash_1.default.times(3, () => lodash_1.default.capitalize(random_word_by_length_1.default(8))).join("");
    const token = makeGameToken();
    return { id, token };
}
exports.initSingleGame = initSingleGame;
function getClientIpAddress(socket) {
    return lodash_1.default.get(socket, "request.headers.x-forwarded-for", socket.remoteAddress);
}
function socketInfoStr(socket) {
    return JSON.stringify(getSocketInfo(socket));
}
exports.socketInfoStr = socketInfoStr;
function getSocketInfo(socket) {
    return {
        state: socket.state,
        ip: getClientIpAddress(socket),
        id: socket.id,
        ua: lodash_1.default.get(socket, "request.headers.user-agent", ""),
        time: Number(new Date())
    };
}
exports.getSocketInfo = getSocketInfo;
//# sourceMappingURL=index.js.map