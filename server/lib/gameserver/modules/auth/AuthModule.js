"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tweetnacl_util_1 = __importDefault(require("tweetnacl-util"));
var tweetnacl_1 = require("tweetnacl");
var v4_1 = __importDefault(require("uuid/v4"));
var utils_1 = require("../../utils");
var AuthModule = /** @class */ (function () {
    function AuthModule(scServer) {
        this.scServer = scServer;
        this.state = {
            users: {}
        };
    }
    AuthModule.prototype.handleConnect = function (socket) {
        var _this = this;
        if (utils_1.hasAuthToken(socket)) {
            // revoke auth token if badly formatted, or if user is not in users collection
            if (!utils_1.isAuthToken(socket.authToken) || !(socket.authToken.id in this.state.users)) {
                socket.deauthenticate();
            }
            else {
                utils_1.logWithTime("Welcome back, " + socket.authToken.name);
            }
        }
        socket.on("disconnect", function () {
            utils_1.logWithTime("Disconnected: ", utils_1.getClientIpAddress(socket));
            if (utils_1.hasValidAuthToken(socket) && socket.authToken.id in _this.state.users) {
                utils_1.logWithTime("Goodbye, ", socket.authToken.name);
                delete _this.state.users[socket.authToken.id].socketId;
            }
        });
        socket.on(
        // @ts-ignore
        "login", function (request, respond) {
            var id = request.id, token = request.token, name = request.name;
            var clientUser;
            if (id && token && authenticateUser(id, token, _this.state.users)) {
                // user is authenticated
                // allow setting name at login
                var serverUser = _this.state.users[id];
                if (name != serverUser.name) {
                    _this.state.users[id].name = name;
                    _this.state.users[id].socketId = socket.id;
                }
                clientUser = { id: id, token: token, name: name };
            }
            else {
                // authentication failed,
                // or no id/token provided, create a new user
                var created = createUser(name);
                clientUser = created.clientUser;
                var serverUser = created.serverUser;
                _this.state.users[serverUser.id] = serverUser;
                _this.state.users[serverUser.id].socketId = socket.id;
            }
            respond(null, clientUser);
            var authToken = { id: clientUser.id, name: clientUser.name };
            socket.setAuthToken(authToken);
            utils_1.logWithTime(clientUser.name + " logged in. (" + clientUser.id + ")");
            console.table(Object.values(_this.state.users));
        });
    };
    return AuthModule;
}());
exports.AuthModule = AuthModule;
function createUser(name) {
    var id = v4_1.default();
    var user = { name: name, id: id };
    var token = v4_1.default().slice(-10);
    var tokenBytes = tweetnacl_util_1.default.decodeUTF8(token);
    var tokenHashBytes = tweetnacl_1.hash(tokenBytes);
    var tokenHash = tweetnacl_util_1.default.encodeBase64(tokenHashBytes);
    return {
        clientUser: __assign(__assign({}, user), { token: token }),
        serverUser: __assign(__assign({}, user), { tokenHash: tokenHash })
    };
}
function authenticateUser(id, token, users) {
    if (!(id in users))
        return false;
    var serverUser = users[id];
    var tokenHash = tweetnacl_util_1.default.encodeBase64(tweetnacl_1.hash(tweetnacl_util_1.default.decodeUTF8(token)));
    return tokenHash === serverUser.tokenHash;
}
