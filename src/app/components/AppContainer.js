import React from 'react';
import { RouteHandler, State } from 'react-router';

import AztecCalendar from 'app/components/AztecCalendar';

const AppContainer = React.createClass({
  // top level react component
  // mixins: [State],
  componentWillMount() {
    this.onResize();
  },
  onResize() {
    this.setState({width: window.innerWidth, height: window.innerHeight});
  },

  render() {
    const {width, height} = this.state;
    // const shouldAnimate = (this.getPathname() === '/');
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
});

export default AppContainer;