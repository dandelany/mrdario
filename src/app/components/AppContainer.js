import React from 'react';
import throttle from 'lodash/throttle';

import {MODES} from 'constants';
import AztecCalendar from 'app/components/AztecCalendar';

function getWindowSize() {
  return {windowWidth: window.innerWidth, windowHeight: window.innerHeight};
}

export default class AppContainer extends React.Component {
  state = {
    ...getWindowSize(),
    mode: null
  };

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
    const childProps = {windowWidth, windowHeight, gridCols, gridRows, onChangeMode: this._onChangeMode};

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
