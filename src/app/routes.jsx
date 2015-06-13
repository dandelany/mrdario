import React from 'react';
import Router from 'react-router';
const {Route, DefaultRoute} = Router;

import AppContainer from './components/AppContainer.jsx';
import TitlePage from './components/pages/TitlePage.jsx';
import GameSettings from './components/pages/GameSettings.jsx';
import SinglePlayerGame from './components/pages/SinglePlayerGame.jsx';

export default (
    <Route name="app" path="/" handler={AppContainer}>
        <Route name="settings" handler={GameSettings} />
        <Route name="single" path="single/:level/:speed" handler={SinglePlayerGame} />
        <DefaultRoute handler={TitlePage} />
    </Route>
);
