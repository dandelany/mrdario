import React from 'react';
import { RouteHandler } from 'react-router';

const AppContainer = React.createClass({
    // top level react component
    render() {
        return <div>
            <h3>Mr. Dario</h3>
            <RouteHandler />
        </div>;
    }
});

export default AppContainer;