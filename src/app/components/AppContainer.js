import React from 'react';
import { RouteHandler, State } from 'react-router';

import AztecCalendar from 'app/components/AztecCalendar';

import MayaNumeral from './MayaNumeral';

export default class AppContainer extends React.Component {
  state = {
    value: 0
  };
  
  componentDidMount() {
    this._onResize();
    // setInterval(() => this.setState({value: this.state.value + 1}), 1000);
  }
  _onResize = () => {
    this.setState({width: window.innerWidth, height: window.innerHeight});
  };

  render() {
    const {width, height} = this.state;
    const shouldAnimate = (this.props.location.pathname === '/');

    return <div id="mrdario" style={{width: '100%', height: '100%'}}>


      <AztecCalendar {...{width, height, shouldAnimate}}/>

      <div className="mrdario-page">
        {React.Children.only(this.props.children, child => {
          return React.cloneElement(child, {width, height});
        })}
      </div>
    </div>;
  }
}
