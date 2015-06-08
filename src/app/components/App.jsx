import React from 'react';
import { RouteHandler } from 'react-router';

const App = React.createClass({
    // top level react component
    render() {
        return <div>
            <RouteHandler />
        </div>;
    }
});

export default App;