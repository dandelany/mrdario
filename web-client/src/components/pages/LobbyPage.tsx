import { connect } from "react-redux";

import { LobbyChatMessageOut, LobbyJoinResponse, LobbyUser } from "mrdario-core/lib/api/lobby";
import { AppAuthToken } from "mrdario-core/lib/api/auth";
import { GameClient } from "mrdario-core/lib/client";

import * as React from "react";

import { AppState } from "@/store/state";
import { SCClientSocket } from "socketcluster-client";
import { Redirect } from "react-router";

const styles = require("./LobbyPage.module.scss");

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
  lobbyUsers: LobbyJoinResponse;
  pendingMessage: string;
  chatMessages: LobbyChatMessageOut[];
}

export class UnconnectedLobbyPage extends React.Component<LobbyPageProps, LobbyPageState> {
  state: LobbyPageState = {
    lobbyUsers: [],
    pendingMessage: "",
    chatMessages: []
  };
  messagesEndRef: React.RefObject<HTMLDivElement>;

  constructor(props: LobbyPageProps) {
    super(props);
    this.messagesEndRef = React.createRef();
  }

  componentDidMount() {
    this.props.gameClient
      .joinLobby({
        onChangeLobbyUsers: (lobbyUsers: LobbyJoinResponse) => this.setState({ lobbyUsers }),
        onChatMessage: (chatMessage: LobbyChatMessageOut) => {
          this.setState({ chatMessages: this.state.chatMessages.concat(chatMessage) });
          if (this.messagesEndRef && this.messagesEndRef.current) {
            this.messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            // const node = this.messagesRef.current;
            // node.scroll
          }
        }
      })
      .then((lobbyUsers: LobbyJoinResponse) => this.setState({ lobbyUsers }));
  }
  componentWillUnmount() {
    this.props.gameClient.leaveLobby();
  }
  handleChangeMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pendingMessage = e.currentTarget.value;
    this.setState({ pendingMessage });
  };
  handleSubmit = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    this.props.gameClient.sendLobbyChat(this.state.pendingMessage);
    this.setState({ pendingMessage: "" });
  };
  render() {
    // todo do this in a wrapper component?
    if (this.props.socketState !== "open") {
      return (
        <div className={styles.loginPage}>
          <h2>Connecting...</h2>
        </div>
      );
    }
    if (this.props.authState !== "authenticated" || !this.props.authToken || !this.props.authToken.id) {
      return <Redirect to="/login" />;
    }

    return (
      <div className={styles.lobbyPage}>
        <h2>Game Lobby</h2>

        <div className={styles.lobbyContainer}>
          <div className={styles.lobbyUsers}>
            <h4>Users</h4>
            {this.state.lobbyUsers.length ? (
              <div>
                {this.state.lobbyUsers.map((lobbyUser: LobbyUser) => {
                  return <div key={lobbyUser.id}>{lobbyUser.name}</div>;
                })}
              </div>
            ) : null}
          </div>
          <div className={styles.lobbyChat}>
            <div className={styles.chatMessages}>
              {this.state.chatMessages.map(
                (message: LobbyChatMessageOut, index: number): React.ReactNode => {
                  return (
                    <div key={index + ""}>
                      <span className={styles.userName}>{message.userName}:</span>
                      <span>{message.payload}</span>
                    </div>
                  );
                }
              )}
              <div ref={this.messagesEndRef} />
            </div>
            <form onSubmit={this.handleSubmit}>
              <div>
                <input type="text" value={this.state.pendingMessage} onChange={this.handleChangeMessage} />
                <span className="btn-white" onClick={this.handleSubmit}>
                  Send
                </span>
              </div>
              <div />
            </form>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: AppState): LobbyPageStateProps => ({
  authToken: state.gameClient.authToken,
  authState: state.gameClient.authState,
  socketState: state.gameClient.socketState
});

export const LobbyPage = connect(mapStateToProps)(UnconnectedLobbyPage);
