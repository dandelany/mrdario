import React from 'react';
import throttle from 'lodash/throttle';
import socketCluster from 'socketcluster-client';

import {MODES} from 'game/constants';
import AztecCalendar from 'app/components/AztecCalendar';

function getWindowSize() {
  return {windowWidth: window.innerWidth, windowHeight: window.innerHeight};
}

function initSocketClient() {
  var socket = socketCluster.connect({port: 3000});
  // var socket = socketCluster.connect({port: 8000});

  socket.on('error', (err) => {
    console.error('Socket error - ' + err);
  });


  socket.on('singleHighScores', (data, res) => {
    console.log('got some high scores', data);
  });

  socket.on('connect', function() {
    console.log('Socket connected - OK');

    socket.emit('getSingleHighScores', 0);
  });



  return socket;
}

export default class AppContainer extends React.Component {
  state = {
    ...getWindowSize(),
    mode: null
  };

  constructor(props) {
    super(props);
    this.socket = initSocketClient();
  }

  componentDidMount() {
    this._throttledResizeHandler = this._onResize;
    window.addEventListener('resize', this._throttledResizeHandler);
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this._throttledResizeHandler);
  }

  _onResize = () => {
    this.setState(getWindowSize());
  };

  _onChangeMode = (mode) => this.setState({mode});

  render() {
    const {windowWidth, windowHeight} = this.state;

    const shouldAnimate = (this.props.location.pathname === '/');
    const child = React.Children.only(this.props.children);
    const gridCols = 8;
    const gridRows = 16;
    const childProps =
      {socket: this.socket, windowWidth, windowHeight, gridCols, gridRows, onChangeMode: this._onChangeMode};

    const calendarMode =
      (this.props.location.pathname == '/') ? 'title' :
      (this.state.mode == MODES.LOST) ? 'lost' :
      (this.state.mode == MODES.WON) ? 'won' :
      undefined;

    return <div id="mrdario" style={{width: '100%', height: '100%'}}>
      <AztecCalendar {...{
        width: windowWidth,
        height: windowHeight,
        shouldAnimate,
        mode: calendarMode
      }}/>

      <div className="mrdario-page">
        {React.cloneElement(child, childProps)}
      </div>
    </div>;
  }
}
