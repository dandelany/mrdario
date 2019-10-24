import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import * as _ from "lodash";

import { GameClient } from "mrdario-core/lib/client";
import {
  LobbyChatMessageOut,
  LobbyJoinResponse,
  LobbyMessageType,
  TLobbyJoinResponse,
  TLobbyLeaveResponse
} from "mrdario-core/lib/api/lobby";
import { ClientAuthenticatedUser } from "mrdario-core/lib/api/auth";
import MatcherUtils = jest.MatcherUtils;

async function expectToRejectNotAuthenticated(promise: Promise<any>) {
  return await expect(promise).rejects.toThrow(/not authenticated/i);
}

export const A_JIFFY = 25;
export const TWO_SHAKES = 100;

expect.extend({
  toDecodeWith<DecodedType>(data: any, codec: t.Type<DecodedType>) {
    const result = codec.decode(data);
    const pass = result.isRight();
    const options = {
      isNot: this.isNot,
      promise: this.promise
    };

    //@ts-ignore
    const that: MatcherUtils = this;

    return {
      pass,
      message: pass
        ? () =>
            //@ts-ignore
            that.utils.matcherHint("toDecodeWith", "data", "codec", options) +
            `\n\n` +
            `Decoded successfully (expected not to)\n` +
            `Data: ${JSON.stringify(data)}\n` +
            `Decoded value: ${JSON.stringify(result.value)}`
        : () =>
            //@ts-ignore
            that.utils.matcherHint("toDecodeWith", "data", "codec", options) +
            `\n\n` +
            `Failed to decode data with codec\n` +
            `${PathReporter.report(result)[0]}\n` +
            `Data: ${JSON.stringify(data)}\n`
    };
  }
});

describe("Lobby", () => {
  describe("Connect and test", () => {
    let gameClient: GameClient;
    beforeEach(async () => {
      gameClient = new GameClient({ socketOptions: { port: 8000 } });
      await expect(gameClient.connect()).resolves.toBeTruthy();
    });
    afterEach(() => gameClient.disconnect());

    test("Must be authenticated to perform lobby actions", async () => {
      await expectToRejectNotAuthenticated(gameClient.joinLobby());
      await expectToRejectNotAuthenticated(gameClient.sendLobbyChat("hello"));
      await expectToRejectNotAuthenticated(gameClient.leaveLobby());
    });
  });

  describe("Login and test", () => {
    let gameClient: GameClient;
    let user: ClientAuthenticatedUser;

    beforeEach(async () => {
      gameClient = new GameClient({ socketOptions: { port: 8000 } });
      await expect(gameClient.connect()).resolves.toBeTruthy();
      const loginPromise = gameClient.login("TestUser");
      await expect(loginPromise).resolves.toBeTruthy();
      user = await loginPromise;
    });
    afterEach(() => gameClient.disconnect());

    test("Can join lobby successfully", async () => {
      const joinLobbyPromise = gameClient.joinLobby();
      await expect(joinLobbyPromise).resolves.toBeTruthy();
      const joinResponse: LobbyJoinResponse = await joinLobbyPromise;

      expect(joinResponse).toDecodeWith(TLobbyJoinResponse);
      expect(joinResponse).toMatchObject([
        {
          name: user.name,
          id: user.id,
          joined: expect.any(Number)
        }
      ]);
    });

    test("Can leave lobby successfully", async () => {
      await expect(gameClient.joinLobby()).resolves.toBeTruthy();
      const leaveLobbyPromise = gameClient.leaveLobby();
      await expect(leaveLobbyPromise).resolves.toDecodeWith(TLobbyLeaveResponse);
    });

    test("Send chat message successfully", async () => {
      await expect(gameClient.joinLobby()).resolves.toBeTruthy();
      await expect(gameClient.sendLobbyChat("hello")).resolves.toBe(undefined);
    });

    test("Fails with invalid message shape", async () => {
      // todo

    });
  });

  describe("Login with 2 different clients and test", () => {
    let gameClientA: GameClient;
    let gameClientB: GameClient;
    let user: ClientAuthenticatedUser;
    let userB: ClientAuthenticatedUser;

    beforeEach(async () => {
      gameClientA = new GameClient({ socketOptions: { port: 8000, multiplex: false } });
      await expect(gameClientA.connect()).resolves.toBeTruthy();
      const loginPromise = gameClientA.login("TestUser");
      await expect(loginPromise).resolves.toBeTruthy();
      user = await loginPromise;

      gameClientB = new GameClient({ socketOptions: { port: 8000, multiplex: false } });
      await expect(gameClientB.connect()).resolves.toBeTruthy();
      const loginPromiseB = gameClientB.login("TestUserB");
      await expect(loginPromiseB).resolves.toBeTruthy();
      userB = await loginPromiseB;
    });
    afterEach(() => {
      gameClientA.disconnect();
      gameClientB.disconnect();
    });

    test("Joining lobby causes other clients in lobby to fire onChangeLobbyUsers callback", async () => {
      const changeSpy = jest.fn();
      const chatSpy = jest.fn();
      await expect(
        gameClientA.joinLobby({
          onChangeLobbyUsers: changeSpy,
          onChatMessage: chatSpy
        })
      ).resolves.toBeTruthy();
      expect(changeSpy).not.toHaveBeenCalled();
      await sleep(A_JIFFY);

      await expect(gameClientB.joinLobby()).resolves.toBeTruthy();
      await sleep(A_JIFFY);
      expect(changeSpy).toHaveBeenCalled();

      expect(_.last(changeSpy.mock.calls)).toMatchObject([
        [
          {
            name: user.name,
            id: user.id,
            joined: expect.any(Number)
          },
          {
            name: userB.name,
            id: userB.id,
            joined: expect.any(Number)
          }
        ]
      ]);
    });

    test("Sending chat message causes other clients in lobby to fire onChatMessage callback", async () => {
      const chatSpy = jest.fn();
      const chatSpyB = jest.fn();
      await expect(gameClientA.joinLobby({ onChatMessage: chatSpy })).resolves.toBeTruthy();
      await expect(gameClientB.joinLobby({ onChatMessage: chatSpyB })).resolves.toBeTruthy();
      await sleep(A_JIFFY);

      expect(chatSpy).not.toHaveBeenCalled();
      expect(chatSpyB).not.toHaveBeenCalled();

      await expect(gameClientA.sendLobbyChat("hello from A"));
      await sleep(A_JIFFY);

      const expectedMsg: LobbyChatMessageOut = {
        type: LobbyMessageType.ChatOut,
        payload: "hello from A",
        userName: user.name
      };
      expect(chatSpy.mock.calls).toEqual([[expectedMsg]]);
      expect(chatSpyB.mock.calls).toEqual(chatSpy.mock.calls);
    });
  });
});

function sleep(time: number): Promise<number> {
  return new Promise(resolve => setTimeout(resolve, time));
}
