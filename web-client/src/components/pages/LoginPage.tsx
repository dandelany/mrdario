import * as React from "react";
import { connect } from "react-redux";
import { Redirect, RouteComponentProps, withRouter } from "react-router-dom";

import { GameClient } from "mrdario-core/lib/api/client";

import { AppThunkDispatch, login } from "@/store/actions/creators";
import { AppAuthToken } from "mrdario-core/lib/api/types/auth";
import { AppState } from "@/store/state";

const styles = require("./LoginPage.module.scss");

export interface LoginPageStateProps {
  authToken: AppAuthToken | null;
}
export interface LoginPageProps extends LoginPageStateProps, RouteComponentProps {
  gameClient: GameClient;
  login: (gameClient: GameClient, name: string, id?: string, token?: string) => any;
}

export interface LoginPageState {
  name: string;
  didSubmit: boolean;
}
export class LoginPage extends React.Component<LoginPageProps, LoginPageState> {
  state: LoginPageState = {
    name: window.localStorage ? window.localStorage.getItem("mrdario-name") || "" : "",
    didSubmit: false
  };
  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.currentTarget.value;
    this.setState({ name, didSubmit: false });
    if (window.localStorage) {
      window.localStorage.setItem("mrdario-name", name);
    }
  };
  handleSubmit = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();

    let userId;
    let token;
    if (window.localStorage) {
      userId = window.localStorage.getItem("mrdario-userId") || undefined;
      token = window.localStorage.getItem("mrdario-token") || undefined;
    }
    // logging in should set auth token, which we detect below in render
    this.props.login(this.props.gameClient, this.state.name, userId, token);

    this.setState({ didSubmit: true });
  };
  render() {
    if (this.state.didSubmit && this.props.authToken && this.props.authToken.id) {
      return <Redirect push to="/lobby" />;
    }
    // todo handle enter/form submit
    return (
      <div className={styles.loginPage}>
        <h2>Enter your name:</h2>
        <form onSubmit={this.handleSubmit}>
          <div>
            <input type="text" placeholder="Anonymous" value={this.state.name} onChange={this.handleChange} />
          </div>
          <div>
            <span className="btn-white" onClick={this.handleSubmit}>
              Continue
            </span>
          </div>
        </form>
      </div>
    );
  }
}

const mapStateToProps = (state: AppState): LoginPageStateProps => ({
  authToken: state.gameClient.authToken
});

const mapDispatchToProps = (dispatch: AppThunkDispatch) => ({
  login: (gameClient: GameClient, name: string, id?: string, token?: string) =>
    dispatch(login(gameClient, name, id, token))
});

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(LoginPage)
);
