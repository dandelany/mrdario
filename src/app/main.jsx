import React from 'react';
import Router from 'react-router';

import routes from './routes.jsx';

class App {
    constructor(el) {
        this.el = el;
        this.game = null;
    }

    onStartGame() {

    }

    render(gameState, dt) {
        const {mode, grid} = gameState;
        React.render(<MrDario {...gameState} />, this.el);
    }
}

