import * as React from "react";
import { Route } from "react-router-dom";

// import AppContainer from 'app/components/AppContainer';
import TitlePage from "@/components/pages/TitlePage";
import GameSettings from "@/components/pages/GameSettings";
import SinglePlayerGame from "@/components/pages/SinglePlayerGame";
// import MirrorGame from 'app/components/pages/MirrorGame';
import HighScores from "@/components/pages/HighScores";
import LoginPage from "@/components/pages/LoginPage";
import { LobbyPage } from "@/components/pages/LobbyPage";

type ComponentClassOrFunction = React.ComponentClass<any> | React.FunctionComponent<any>;

// utils for passing props through to Route components
// todo do we still need this???
const renderMergedProps = (component: ComponentClassOrFunction, ...rest: any[]) => {
  const finalProps = Object.assign({}, ...rest);
  return React.createElement(component, finalProps);
};

const PropsRoute = (props: any) => {
  const { component, ...rest }: { component: ComponentClassOrFunction } = props;
  return (
    <Route
      {...rest}
      render={routeProps => {
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
  <PropsRoute path="/settings" key="settings" component={GameSettings} />,
  <PropsRoute path="/login" key="login" component={LoginPage} />,
  <PropsRoute path="/lobby" key="lobby" component={LobbyPage} />
];
