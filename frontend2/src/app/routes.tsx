import * as React from 'react';
import {Route} from 'react-router-dom';

// import AppContainer from 'app/components/AppContainer';
import TitlePage from './components/pages/TitlePage';
// import GameSettings from 'app/components/pages/GameSettings';
// import SinglePlayerGame from 'app/components/pages/SinglePlayerGame';
// import MirrorGame from 'app/components/pages/MirrorGame';
import HighScores from './components/pages/HighScores';

type ComponentClassOrFunction = React.ComponentClass<any> | React.FunctionComponent<any>;

// utils for passing props through to Route components
const renderMergedProps = (component: ComponentClassOrFunction, ...rest: any[]) => {
  const finalProps = Object.assign({}, ...rest);
  return React.createElement(component, finalProps);
};

const PropsRoute = (props: any) => {
  const {component, ...rest} : {component: ComponentClassOrFunction} = props;
  return (
    <Route {...rest} render={routeProps => {
      return renderMergedProps(component, routeProps, rest);
    }} />
  )
};

export default [
  <PropsRoute
    exact path="/"
    name="title"
    key="title"
    component={TitlePage}
  />,
  <PropsRoute
    path="/highscores"
    key="highscores"
    component={HighScores}
  />,
  /*
  <PropsRoute
    path="/settings"
    key="settings"
    component={GameSettings}
  />,
  <PropsRoute
    path="/game/level/:level/speed/:speed/:mode?"
    key="single-player-game"
    component={SinglePlayerGame}
  />,
  <PropsRoute
    name="mirror"
    path="/mirror/level/:level/speed/:speed/:mode?"
    key="mirror-game"
    component={MirrorGame}
  />,

  */
];
