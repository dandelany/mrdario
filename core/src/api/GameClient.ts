import { create as createSocket, SCClientSocket } from "socketcluster-client";

export interface GameClientOptions {}

export class GameClient {
  public socket: SCClientSocket;

  constructor() {
    const socket = createSocket({ port: 8000 });

    socket.on("error", err => {
      console.error("Socket error - " + err);
      // todo call callback passed in options
    });

    socket.on("connect", function() {
      console.log("Socket connected - OK");
      // todo call callback passed in options
    });

    this.socket = socket;
  }

  sendInfoStartGame(name: string, level: number, speed: number) {
    this.socket.emit("infoStartGame", [name, level, speed]);
  }

  sendSingleGameHighScore() {}
}
