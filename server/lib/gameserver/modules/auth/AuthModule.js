"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tweetnacl_util_1 = __importDefault(require("tweetnacl-util"));
const tweetnacl_1 = require("tweetnacl");
const v4_1 = __importDefault(require("uuid/v4"));
const auth_1 = require("mrdario-core/src/api/auth");
const utils_1 = require("../../utils");
const AbstractServerModule_1 = require("../../AbstractServerModule");
class AuthModule extends AbstractServerModule_1.AbstractServerModule {
    constructor(options) {
        super(options);
        this.state = {
            users: {}
        };
    }
    handleConnect(socket) {
        if (utils_1.hasAuthToken(socket)) {
            // revoke auth token if badly formatted, or if user is not in users collection
            if (!utils_1.isAuthToken(socket.authToken) || !(socket.authToken.id in this.state.users)) {
                socket.deauthenticate();
            }
            else {
                utils_1.logWithTime(`Welcome back, ${socket.authToken.name}`);
            }
        }
        socket.on("disconnect", () => {
            utils_1.logWithTime("Disconnected: ", utils_1.getClientIpAddress(socket));
            if (utils_1.hasValidAuthToken(socket) && socket.authToken.id in this.state.users) {
                utils_1.logWithTime("Goodbye, ", socket.authToken.name);
                delete this.state.users[socket.authToken.id].socketId;
            }
        });
        socket.on(
        // @ts-ignore
        auth_1.AuthEventType.Login, (request, respond) => {
            // todo properly validate requests here
            if (!request.name || !request.name.length) {
                respond("Login requires a name", null);
                return;
            }
            const { id, token, name } = request;
            let clientUser;
            if (id && token && authenticateUser(id, token, this.state.users)) {
                // user is authenticated
                // allow setting name at login
                const serverUser = this.state.users[id];
                if (name != serverUser.name) {
                    this.state.users[id].name = name;
                    this.state.users[id].socketId = socket.id;
                }
                clientUser = { id, token, name };
            }
            else {
                // authentication failed,
                // or no id/token provided, create a new user
                const created = createUser(name);
                clientUser = created.clientUser;
                const serverUser = created.serverUser;
                this.state.users[serverUser.id] = serverUser;
                this.state.users[serverUser.id].socketId = socket.id;
            }
            respond(null, clientUser);
            const authToken = { id: clientUser.id, name: clientUser.name };
            socket.setAuthToken(authToken);
            utils_1.logWithTime(`${clientUser.name} logged in. (${clientUser.id})`);
            console.table(Object.values(this.state.users));
        });
    }
}
exports.AuthModule = AuthModule;
function createUser(name) {
    const id = v4_1.default();
    const user = { name, id };
    const token = v4_1.default().slice(-10);
    const tokenBytes = tweetnacl_util_1.default.decodeUTF8(token);
    const tokenHashBytes = tweetnacl_1.hash(tokenBytes);
    const tokenHash = tweetnacl_util_1.default.encodeBase64(tokenHashBytes);
    return {
        clientUser: { ...user, token },
        serverUser: { ...user, tokenHash }
    };
}
function authenticateUser(id, token, users) {
    if (!(id in users))
        return false;
    const serverUser = users[id];
    const tokenHash = tweetnacl_util_1.default.encodeBase64(tweetnacl_1.hash(tweetnacl_util_1.default.decodeUTF8(token)));
    return tokenHash === serverUser.tokenHash;
}
//# sourceMappingURL=AuthModule.js.map