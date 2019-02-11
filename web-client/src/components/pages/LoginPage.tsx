import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router-dom";

import { GameClient } from "mrdario-core/lib/api/client";

import { AppThunkDispatch, login } from "@/store/actions/creators";

const styles = require("./LoginPage.module.scss");

export interface LoginPageProps extends RouteComponentProps {
  gameClient: GameClient,
  login: (gameClient: GameClient, name: string, id?: string, token?: string) => any
}
export interface LoginPageState {
  name: string
}
export class LoginPage extends React.Component<LoginPageProps, LoginPageState> {
  state: LoginPageState = {
    name: ""
  };
  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({name: e.currentTarget.value});
  };
  handleSubmit = (e?: React.SyntheticEvent) => {
    if(e) e.preventDefault();
    this.props.login(this.props.gameClient, this.state.name)
      .then(() => {
        console.log('ok logged in');
        this.props.history.push('/lobby');
      });
  };
  render() {
    // todo handle enter/form submit
    return (
      <div className={styles.loginPage}>
        <h2>Enter your name:</h2>
        <form onSubmit={this.handleSubmit}>
          <div>
            <input type="text" placeholder="Anonymous" value={this.state.name} onChange={this.handleChange} />
          </div>
          <div>
            <span className="btn-white" onClick={this.handleSubmit}>Continue</span>
          </div>
        </form>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: AppThunkDispatch) => ({
  login: (gameClient: GameClient, name: string, id?: string, token?: string) => dispatch(login(gameClient, name, id, token))
});

export default withRouter(connect(
  () => ({}),
  mapDispatchToProps
)(LoginPage));
