require("babel-polyfill");

var _ = require('lodash');
var React = require('react');
// var ReactDOM = require('react-dom');
import {render} from 'react-dom';
import {Router, hashHistory} from 'react-router';


require('app/styles/main.less');

const App = require('./app/App.jsx');
import routes from './app/routes';

render(
  <Router history={hashHistory}>
    {routes}
  </Router>,
  document.getElementById('container')
);

// var app = new App(document.getElementById('container'));


