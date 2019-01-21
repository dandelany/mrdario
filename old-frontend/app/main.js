require("babel-polyfill");
require('app/styles/main.less');

import React from 'react';
import {render} from 'react-dom';
import {HashRouter as Router} from 'react-router-dom';

import routes from './routes';
import AppContainer from './components/AppContainer';

window.React = React;

render(
  <Router>
    <AppContainer>
      {routes}
    </AppContainer>
  </Router>,
  document.getElementById('container')
);
