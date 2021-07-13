"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const v4_1 = __importDefault(require("uuid/v4"));
// import randomWord from "random-word-by-length";
const AbstractServerModule_1 = require("../../AbstractServerModule");
const api_1 = require("mrdario-core/src/api");
const game_1 = require("mrdario-core/src/api/game");
const ServerSingleGameController_1 = require("./ServerSingleGameController");
class GameModule extends AbstractServerModule_1.AbstractServerModule {
    constructor(options) {
        super(options);
        this.state = {
            games: {}
        };
    }
    handleConnect(socket) {
        this.bindListener(socket, {
            eventType: api_1.GameEventType.CreateSingle,
            codec: api_1.TCreateSingleGameRequest,
            listener: (options, authToken, respond) => {
                const userId = authToken.id;
                const { level, baseSpeed } = options;
                const initialSeed = v4_1.default().slice(-10);
                const gameOptions = { level, baseSpeed, initialSeed };
                const gameId = v4_1.default().slice(-10);
                const response = {
                    id: gameId,
                    creator: userId,
                    gameOptions
                };
                const gameController = new ServerSingleGameController_1.ServerSingleGameController({
                    gameOptions,
                    hasHistory: true
                });
                console.log(response);
                console.log(gameController.getState());
                console.log(game_1.encodeGameState(gameController.getState().gameState));
                const serverGame = {
                    ...response,
                    gameController
                };
                this.state.serverGame = serverGame;
                this.state.games[gameId] = serverGame;
                respond(null, response);
            }
        });
        this.bindListener(socket, {
            eventType: api_1.GameEventType.SingleModeChange,
            codec: api_1.tSingleGameModeChangeMessage,
            listener: (nextMode) => {
                console.log("mode change", nextMode);
                if (this.state.serverGame) {
                    const { serverGame } = this.state;
                    const { gameController } = serverGame;
                    const gameControllerState = gameController.getState();
                    gameController.setState({
                        ...gameControllerState,
                        mode: nextMode
                    });
                    // console.log(gameController.getState());
                    const encodedState = api_1.encodeGameControllerState(gameController.getState());
                    console.log("emitting singleGameState", encodedState);
                    socket.emit("singleGameState", encodedState);
                }
            }
        });
        this.bindListener(socket, {
            eventType: api_1.GameEventType.SingleMove,
            codec: api_1.tSingleGameMoveMessage,
            listener: (encodedMoves) => {
                // console.log('move', encodedMoves);
                if (this.state.serverGame) {
                    const { serverGame } = this.state;
                    const { gameController, id } = serverGame;
                    const timedMoveActions = api_1.decodeTimedActions(encodedMoves);
                    // console.log(timedMoveActions);
                    console.log(timedMoveActions);
                    gameController.addFrameActions(timedMoveActions);
                    const actionFrame = timedMoveActions[0];
                    gameController.tickToFrame(actionFrame);
                    const encodedState = api_1.encodeGameControllerState(gameController.getState());
                    // console.log('emitting singleGameState', encodedState);
                    console.log("emitting singleGameState", api_1.encodeGrid(gameController.getState().gameState.grid, true));
                    socket.emit("singleGameState", encodedState);
                    this.scServer.exchange.publish(`game-${id}`, encodedState);
                }
            }
        });
        socket.on("GetSingleGameInfo", (gameId, respond) => {
            const serverGame = this.state.games[gameId];
            if (serverGame) {
                const { id, creator, gameOptions } = serverGame;
                respond(null, { id, creator, gameOptions });
            }
            else {
                respond("Could not find game " + gameId, null);
            }
        });
    }
}
exports.GameModule = GameModule;
//# sourceMappingURL=GameModule.js.map