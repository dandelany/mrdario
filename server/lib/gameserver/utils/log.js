"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function logWithTime() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    console.log.apply(console, [new Date().toISOString()].concat(args));
}
exports.logWithTime = logWithTime;
