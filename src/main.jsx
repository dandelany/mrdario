var React = require('react/addons');
var _ = require('lodash');
require("babel/polyfill");

require('app/styles/main.less');

React.initializeTouchEvents(true);

const App = require('app/App.jsx');

var app = new App(document.getElementById('container'));
