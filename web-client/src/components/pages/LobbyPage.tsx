import { GameClient } from "mrdario-core/lib/api/client";
import * as React from "react";
import { LobbyResponse, LobbyUser } from "mrdario-core/lib/api/types";

const styles = require("./LoginPage.module.scss");

export interface LobbyProps {
  gameClient: GameClient;
  joinLobby: (gameClient: GameClient) => any;
}
export interface LobbyState {
  lobbyUsers: LobbyResponse;
}

export class LobbyPage extends React.Component<LobbyProps, LobbyState> {
  state: LobbyState = {
    lobbyUsers: []
  };

  componentDidMount() {
    this.props.gameClient
      .joinLobby({
        onChangeLobbyUsers: (lobbyUsers: LobbyResponse) => this.setState({ lobbyUsers })
      })
      .then((lobbyUsers: LobbyResponse) => this.setState({ lobbyUsers }));
  }
  render() {
    // if (!hasValidAuthToken(this.props.gameClient.socket)) {
    //   return <Redirect to="/login" />;
    // }
    return (
      <div className={styles.loginPage}>
        <h2>Lobby</h2>
        {this.state.lobbyUsers.length ? (
          <div>
            {this.state.lobbyUsers.map((lobbyUser: LobbyUser) => {
              return <div>{lobbyUser.name}</div>;
            })}
          </div>
        ) : null}
      </div>
    );
  }
}
