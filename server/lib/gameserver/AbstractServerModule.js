"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const middleware_1 = require("./utils/middleware");
class AbstractServerModule {
    constructor(options) {
        this.scServer = options.scServer;
        this.rClient = options.rClient;
    }
    bindListener(socket, options) {
        const { eventType, codec, listener } = options;
        socket.on(eventType, utils_1.authAndValidateRequest(socket, codec, listener));
    }
    bindNoAuthListener(socket, options) {
        const { eventType, codec, listener } = options;
        socket.on(eventType, utils_1.validateRequest(codec, listener));
    }
    addMiddleware(channels) {
        channels.forEach(channelConfig => {
            const { messageCodec, publishInMiddleware } = channelConfig;
            this.scServer.addMiddleware(this.scServer.MIDDLEWARE_PUBLISH_IN, (req, next) => {
                // todo match regex
                if (req.channel === channelConfig.name) {
                    middleware_1.requireAuthMiddleware(req, (e) => {
                        if (e)
                            next(e);
                        else {
                            middleware_1.validateChannelRequest(req, messageCodec, validReq => {
                                if (publishInMiddleware)
                                    publishInMiddleware(validReq, next);
                                else
                                    next();
                            }, (e) => next(e));
                        }
                    });
                }
                else {
                    next();
                }
            });
            if (channelConfig.publishOutMiddleware) {
                const { publishOutMiddleware } = channelConfig;
                this.scServer.addMiddleware(this.scServer.MIDDLEWARE_PUBLISH_OUT, (req, next) => {
                    if (req.channel === channelConfig.name) {
                        publishOutMiddleware(req, next);
                    }
                    else
                        next();
                });
            }
        });
    }
}
exports.AbstractServerModule = AbstractServerModule;
// the only way i can figure out to infer Datatype from the codec type
function makeChannelConfig(
// codec: t.Type<DataType>,
config) {
    return config;
}
exports.makeChannelConfig = makeChannelConfig;
//# sourceMappingURL=AbstractServerModule.js.map