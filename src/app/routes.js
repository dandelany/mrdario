import React from 'react';
import {Route, IndexRoute} from 'react-router';

import AppContainer from 'app/components/AppContainer';
import TitlePage from 'app/components/pages/TitlePage';
import GameSettings from 'app/components/pages/GameSettings';
import SinglePlayerGame from 'app/components/pages/SinglePlayerGame';
import MirrorGame from 'app/components/pages/MirrorGame';

export default (
  <Route name="app" path="/" component={AppContainer}>
    <Route path="settings" component={GameSettings} />
    <Route name="single" path="game/level/:level/speed/:speed(/:mode)" component={SinglePlayerGame} />
    <Route name="mirror" path="mirror/level/:level/speed/:speed(/:mode)" component={MirrorGame} />
    <IndexRoute name="title" component={TitlePage} />
  </Route>
);
