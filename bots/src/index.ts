import { GameClient } from "mrdario-core/lib/client/GameClient";
import { AppAuthToken } from "mrdario-core/lib/api/types/auth";
import { generate } from "band-name";

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
}

async function makeBot() {
  const bot = new GameBot();
  await bot.connect();
  await bot.joinLobby();

  setInterval(() => {
    bot.sendChat();
  }, 6000);
  return bot;
}

(async function main() {
  // let bots = [];
  for(let i = 0; i < 10; i++) {
    await makeBot();
    // bots.push(bot);
  }

})();
