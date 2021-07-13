import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router-dom";
import { connect } from "react-redux";

import { GameClient, GameClientOptions } from "mrdario-core/lib/client/GameClient";
import { GameControllerMode } from "mrdario-core/lib/game/controller";

import AztecCalendar, { AztecCalendarMode } from "./AztecCalendar";

import { AppThunkDispatch, initGameClient } from "@/store/actions/creators";

function getWindowSize() {
  return { windowWidth: window.innerWidth, windowHeight: window.innerHeight };
}

interface AppContainerOwnProps extends RouteComponentProps {}

interface AppContainerDispatchProps {
  initGameClient: (options: Partial<GameClientOptions>) => GameClient;
}

type AppContainerProps = AppContainerOwnProps & AppContainerDispatchProps;

interface AppContainerState {
  windowWidth: number;
  windowHeight: number;
  mode: null | GameControllerMode;
  location?: string;
}

class AppContainer extends React.Component<AppContainerProps, AppContainerState> {
  state = {
    ...getWindowSize(),
    mode: null
  };
  gameClient: GameClient;
  _throttledResizeHandler: () => void;

  constructor(props: AppContainerProps) {
    super(props);

    // todo test throttling this
    this._throttledResizeHandler = this._onResize;

    // todo local ws proxy
    const port = window.location.hostname === "localhost" ? 8000 : 3000;
    this.gameClient = this.props.initGameClient({ socketOptions: { port } });
    this.gameClient.connect();
  }

  componentDidMount() {
    window.addEventListener("resize", this._throttledResizeHandler);
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this._throttledResizeHandler);
  }

  _onResize = () => {
    this.setState(getWindowSize());
  };

  _onChangeMode = (mode: GameControllerMode) => this.setState({ mode });

  render() {
    const { windowWidth, windowHeight } = this.state;

    const shouldAnimate = window.location.pathname === "/";
    const gridCols = 8;
    const gridRows = 16;
    const childProps = {
      gameClient: this.gameClient,
      windowWidth,
      windowHeight,
      gridCols,
      gridRows,
      onChangeMode: this._onChangeMode
    };

    const calendarMode: AztecCalendarMode =
      this.props.location.pathname === "/"
        ? AztecCalendarMode.Title
        : this.state.mode === GameControllerMode.Lost
        ? AztecCalendarMode.Lost
        : this.state.mode === GameControllerMode.Won
        ? AztecCalendarMode.Won
        : AztecCalendarMode.Other;

    return (
      <div id="mrdario" style={{ width: "100%", height: "100%" }}>
        <AztecCalendar
          {...{
            width: windowWidth,
            height: windowHeight,
            shouldAnimate,
            mode: calendarMode
          }}
        />

        <div className="mrdario-page">
          {React.Children.map(this.props.children, child => {
            return React.cloneElement(child as React.ReactElement<any>, childProps);
          })}
        </div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: AppThunkDispatch) => ({
  initGameClient: (options: Partial<GameClientOptions> = {}) => dispatch(initGameClient(options))
});

export default withRouter(
  connect(
    () => ({}),
    mapDispatchToProps
  )(AppContainer)
);
