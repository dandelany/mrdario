import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router-dom";

import { GameControllerMode } from "mrdario-core/src/types";
import AztecCalendar, { AztecCalendarMode } from "./AztecCalendar";
import { create as createSocket, SCClientSocket } from "socketcluster-client";

function getWindowSize() {
  return { windowWidth: window.innerWidth, windowHeight: window.innerHeight };
}

function initSocketClient() {
  let socket: SCClientSocket = createSocket({ port: 8000 });

  socket.on("error", err => {
    console.error("Socket error - " + err);
  });

  socket.on("connect", function() {
    console.log("Socket connected - OK");

    // socket.emit('sampleClientEvent', 0);
  });

  return socket;
}

interface AppContainerProps extends RouteComponentProps {}

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
  socket: SCClientSocket;
  _throttledResizeHandler: () => void;

  constructor(props: AppContainerProps) {
    super(props);
    this.socket = initSocketClient();
    // todo test throttling this
    this._throttledResizeHandler = this._onResize;
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

    console.log(this.props, this.state);

    const shouldAnimate = window.location.pathname === "/";
    const gridCols = 8;
    const gridRows = 16;
    const childProps = {
      socket: this.socket,
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
            : AztecCalendarMode.Title;

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

export default withRouter(AppContainer);
