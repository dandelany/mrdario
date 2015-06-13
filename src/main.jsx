var React = require('react/addons');
var _ = require('lodash');
//require("babel/polyfill");

//const SinglePlayerGameController = require('./app');

const Game = require('game/SinglePlayerGameController');
const App = require('app/App.jsx');


var app = new App(document.getElementById('container'));

//window.game = new Game({render: app.render.bind(app)});
