import { GameClient } from "mrdario-core/lib/client";
// import { MatchEventType } from "mrdario-core/lib/api/match";
//
// // async function expectToRejectNotAuthenticated(promise: Promise<any>) {
// //   return await expect(promise).rejects.toThrow(/not authenticated/i);
// // }
//
describe("Match", () => {
  describe("", () => {
    test("Must be authenticated to perform match actions", async () => {
      const gameClient = new GameClient({ socketOptions: { port: 8000 } });
      await gameClient.connect();
      //
      // await gameClient.login("dan");
      //
      // await gameClient.socket.emit(MatchEventType.CreateMatch, {baseSpeed: "A"});

      // await gameClient.createMatch();

      // await expectToRejectNotAuthenticated(gameClient.joinLobby());
      // await expectToRejectNotAuthenticated(gameClient.sendLobbyChat('hello'));
      // await expectToRejectNotAuthenticated(gameClient.leaveLobby());
    });
  });
});
