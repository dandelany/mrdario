var React = require('react/addons');
var _ = require('lodash');

//const MrDario = require('./app');

const Game = require('./game/MrDario');
const App = require('./app/App.jsx');

var app = new App(document.getElementById('container'));

window.Game = Game;
window.game = new Game({});
