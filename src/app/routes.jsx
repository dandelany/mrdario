import React from 'react';
import Router from 'react-router';
const {Route, DefaultRoute} = Router;

import App from './components/App.jsx';
import TitlePage from './components/pages/TitlePage.jsx';
import GameSettings from './components/pages/GameSettings.jsx';

export default (
    <Route name="app" path="/" handler={App}>
        <Route name="single" handler={GameSettings} />
        <DefaultRoute handler={TitlePage} />
    </Route>
);
