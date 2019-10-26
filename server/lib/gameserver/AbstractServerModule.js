"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var AbstractServerModule = /** @class */ (function () {
    function AbstractServerModule(options) {
        this.scServer = options.scServer;
        this.rClient = options.rClient;
    }
    AbstractServerModule.prototype.bindListener = function (socket, options) {
        var eventType = options.eventType, codec = options.codec, listener = options.listener;
        socket.on(eventType, utils_1.authAndValidateRequest(socket, codec, listener));
    };
    AbstractServerModule.prototype.bindNoAuthListener = function (socket, options) {
        var eventType = options.eventType, codec = options.codec, listener = options.listener;
        socket.on(eventType, utils_1.validateRequest(codec, listener));
    };
    return AbstractServerModule;
}());
exports.AbstractServerModule = AbstractServerModule;
// the only way i can figure out to infer Datatype from the codec type
function makeChannelConfig(
// codec: t.Type<DataType>,
config) {
    return config;
}
exports.makeChannelConfig = makeChannelConfig;
