import React from 'react';
import throttle from 'lodash/throttle';

import AztecCalendar from 'app/components/AztecCalendar';

import MayaNumeral from './MayaNumeral';

function getWindowSize() {
  return {windowWidth: window.innerWidth, windowHeight: window.innerHeight};
}

export default class AppContainer extends React.Component {
  state = {
    ...getWindowSize()
  };

  componentDidMount() {
    // this._throttledResizeHandler = throttle(this._onResize, 40);
    this._throttledResizeHandler = this._onResize;
    window.addEventListener('resize', this._throttledResizeHandler);
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this._throttledResizeHandler);
  }

  _onResize = () => {
    this.setState(getWindowSize());
  };

  render() {
    const {windowWidth, windowHeight} = this.state;

    const shouldAnimate = (this.props.location.pathname === '/');
    const child = React.Children.only(this.props.children);
    const gridCols = 8;
    const gridRows = 16;

    return <div id="mrdario" style={{width: '100%', height: '100%'}}>
      <AztecCalendar {...{width: windowWidth, height: windowHeight, shouldAnimate}}/>

      <div className="mrdario-page">
        {React.cloneElement(child, {windowWidth, windowHeight, gridCols, gridRows})}
      </div>
    </div>;
  }
}
