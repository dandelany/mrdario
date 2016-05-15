import React from 'react';
import {Route, IndexRoute} from 'react-router';

import AppContainer from './components/AppContainer';
import TitlePage from './components/pages/TitlePage';
import GameSettings from './components/pages/GameSettings';
import SinglePlayerGame from './components/pages/SinglePlayerGame';

export default (
    <Route name="app" path="/" component={AppContainer}>
        <Route path="settings" component={GameSettings} />
        <Route name="single" path="game/level/:level/speed/:speed" component={SinglePlayerGame} />
        <IndexRoute name="title" component={TitlePage} />
    </Route>
);
