import { GameClient, promisifySocketRequest as emit } from "mrdario-core/lib/client";
import { AuthEventType } from "mrdario-core/lib/api/auth";
import { TClientAuthenticatedUser } from "mrdario-core/lib/api/auth";
import { connectGameClient } from "../utils";

describe("Auth", () => {
  describe("Connect and test", () => {
    let gameClient: GameClient;
    beforeEach(async () => {
      gameClient = await connectGameClient();
    });
    afterEach(() => {
      gameClient.disconnect();
    }, 100);

    test('Login succeeds', async () => {
      await expect(gameClient.login('TestUser')).resolves.toMatchObject({
        name: 'TestUser',
        id: expect.stringMatching(/[\w_\-]+/),
        token: expect.stringMatching(/[\w_\-]+/)
      });
    });

    test('Login fails with badly formed request', async () => {
      await expect(emit(
        gameClient.socket,
        AuthEventType.Login,
        {},
        TClientAuthenticatedUser
      )).rejects.toBeTruthy();

    });

    test.todo('Can reconnect with valid authToken and not need to login again');
    test.todo('Creates new user if called with bad id/token');
  });
});
