import { connect } from "react-redux";


import { LobbyResponse, LobbyUser } from "mrdario-core/lib/api/types";
import { AppAuthToken } from "mrdario-core/lib/api/types/auth";
import { GameClient } from "mrdario-core/lib/api/client";

import * as React from "react";

import { AppState } from "@/store/state";
import { SCClientSocket } from "socketcluster-client";
import { Redirect } from "react-router";

const styles = require("./LoginPage.module.scss");

export interface LobbyPageStateProps {
  authToken: AppAuthToken | null;
  authState: SCClientSocket.AuthStates;
  socketState: SCClientSocket.States;
}
export interface LobbyPageProps extends LobbyPageStateProps {
  gameClient: GameClient;
  joinLobby: (gameClient: GameClient) => any;
}

export interface LobbyPageState {
  lobbyUsers: LobbyResponse;
}

export class UnconnectedLobbyPage extends React.Component<LobbyPageProps, LobbyPageState> {
  state: LobbyPageState = {
    lobbyUsers: []
  };
  componentDidMount() {
    this.props.gameClient
      .joinLobby({
        onChangeLobbyUsers: (lobbyUsers: LobbyResponse) => this.setState({ lobbyUsers })
      })
      .then((lobbyUsers: LobbyResponse) => this.setState({ lobbyUsers }));
  }
  componentWillUnmount() {
    this.props.gameClient.leaveLobby();
  }
  render() {
    // todo do this in a wrapper component?
    if(this.props.socketState !== "open") {
      return <div className={styles.loginPage}>
        <h2>Connecting...</h2>
      </div>
    }
    if (this.props.authState !== "authenticated" || !this.props.authToken || !this.props.authToken.id) {
      return <Redirect to="/login" />;
    }

    return (
      <div className={styles.loginPage}>
        <h2>Lobby</h2>
        {this.state.lobbyUsers.length ? (
          <div>
            {this.state.lobbyUsers.map((lobbyUser: LobbyUser) => {
              return <div key={lobbyUser.id}>{lobbyUser.name}</div>;
            })}
          </div>
        ) : null}
      </div>
    );
  }
}

const mapStateToProps = (state: AppState): LobbyPageStateProps => ({
  authToken: state.gameClient.authToken,
  authState: state.gameClient.authState,
  socketState: state.gameClient.socketState
});

export const LobbyPage = connect(
  mapStateToProps
)(UnconnectedLobbyPage);

