var React = require('react/addons');
var _ = require('lodash');
//require("babel/polyfill");

//const MrDario = require('./app');

const Game = require('./game/MrDario');
const App = require('./app/App.jsx');

var app = new App(document.getElementById('container'));

window.game = new Game({render: app.render.bind(app)});
