require("babel-polyfill");
require('app/styles/main.less');

import React from 'react';
import {render} from 'react-dom';
import {HashRouter as Router} from 'react-router-dom';

import routes from './routes';
import AppContainer from './components/AppContainer';

render(
  <Router>
    <AppContainer>
      {routes}
    </AppContainer>
  </Router>,
  document.getElementById('container')
);
