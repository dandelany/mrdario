var React = require('react/addons');
var _ = require('lodash');

const MrDario = require('./app');

window.__ = require('highland');

React.render(<MrDario />, document.getElementById('container'));
