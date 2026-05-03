import * as React from "react";
import { Route } from "react-router-dom";

// import AppContainer from 'app/components/AppContainer';
import TitlePage from "@/components/pages/TitlePage";
import GameSettings from "@/components/pages/GameSettings";
import SinglePlayerGame from "@/components/pages/SinglePlayerGame";
// import SinglePlayerGame from "@/components/pages/SinglePlayerGame2";
import HighScores from "@/components/pages/HighScores";
import LoginPage from "@/components/pages/LoginPage";
import { LobbyPage } from "@/components/pages/LobbyPage";
import MirrorGame from "@/components/pages/MirrorGame";
import SingleRemoteGame from "@/components/pages/SingleRemoteGame";
import DevPage from "@/components/pages/DevPage";
import LocalMultiGame from "@/components/pages/LocalMultiGame";

type ComponentClassOrFunction = React.ComponentClass<any> | React.FunctionComponent<any>;

// utils for passing props through to Route components
// allows AppContainer to pass props to routes
const renderMergedProps = (component: ComponentClassOrFunction, ...rest: any[]) => {
  const finalProps = Object.assign({}, ...rest);
  return React.createElement(component, finalProps);
};

const PropsRoute = (props: any) => {
  const { component, ...rest }: { component: ComponentClassOrFunction } = props;
  return (
    <Route
      {...rest}
      render={(routeProps) => {
        return renderMergedProps(component, routeProps, rest);
      }}
    />
  );
};

export default [
  <PropsRoute exact path="/" name="title" key="title" component={TitlePage} />,
  <PropsRoute path="/highscores" key="highscores" component={HighScores} />,
  <PropsRoute
    path="/game/level/:level/speed/:speed/:mode?"
    key="single-player-game"
    component={SinglePlayerGame}
  />,
  <PropsRoute path="/mirror/level/:level/speed/:speed/:mode?" key="mirror-game" component={MirrorGame} />,
  <PropsRoute exact path="/dev" key="dev" component={DevPage} />,
  <PropsRoute
    path="/dev/local-multi/level/:level/speed/:speed"
    key="dev-local-multi"
    component={LocalMultiGame}
  />,
  <PropsRoute
    path="/dev/local-bot/level/:level/speed/:speed"
    key="dev-local-bot"
    component={LocalMultiGame}
    botPlayer={1}
  />,
  <PropsRoute path="/watch/:gameId" key="single-remote" component={SingleRemoteGame} />,
  <PropsRoute path="/settings" key="settings" component={GameSettings} />,
  <PropsRoute path="/login" key="login" component={LoginPage} />,
  <PropsRoute path="/lobby" key="lobby" component={LobbyPage} />,
];
