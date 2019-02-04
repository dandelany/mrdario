import { RouteComponentProps } from "react-router";
import { GameRouteParams } from "@/types";
import { GameClient } from "mrdario-core/lib/api/client";

export interface LobbyProps extends RouteComponentProps<GameRouteParams> {
  gameClient: GameClient;

}


