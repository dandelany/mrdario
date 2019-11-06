import { GameClient } from "mrdario-core/lib/client/GameClient";
import { AppAuthToken } from "mrdario-core/lib/api/auth";
import { generate } from "band-name";
import { PuppetGameController } from "mrdario-core/lib/game/controller/PuppetGameController";

class GameBot {
  gameClient: GameClient;
  authToken: AppAuthToken | null;

  constructor() {
    this.gameClient = new GameClient({ socketOptions: { port: 8000 } });
    this.authToken = null;
  }
  async connect() {
    return await new Promise(async (resolve, reject) => {
      try {
        await this.gameClient.connect();
        await this.gameClient.login("DanBot");

        const authHandler = () => {
          this.authToken = this.gameClient.socket.authToken as AppAuthToken | null;
          console.log("authToken", this.authToken);
          this.gameClient.socket.off("authenticate", authHandler);
          resolve();
        };
        this.gameClient.socket.on("authenticate", authHandler);
      } catch (err) {
        console.error("err");
        reject(err);
      }
    });
  }
  async joinLobby() {
    return await this.gameClient.joinLobby();
  }
  async sendChat() {
    return await this.gameClient.sendLobbyChat(`My favorite band is ${generate('')}`);
  }

  async startGame() {
    const gameInfo = await this.gameClient.createSingleGame(2, 10);
    console.log('gameInfo', gameInfo);

    this.game = new PuppetGameController()

    setInterval(() => {

    }, 1000);
  }
}

async function makeBot() {
  const bot = new GameBot();
  await bot.connect();
  await bot.joinLobby();

  await bot.startGame();



  // setInterval(() => {
  //   bot.sendChat();
  // }, 6000);
  return bot;
}

(async function main() {
  // let bots = [];
  for(let i = 0; i < 1; i++) {
    await makeBot();
    // bots.push(bot);
  }

})();
