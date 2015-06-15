import _ from 'lodash';
import React from 'react';
import Reflux from 'reflux';
import Router from 'react-router';

import gameStore from 'app/stores/GameStore';
import SinglePlayerGameController from 'game/SinglePlayerGameController';
import Playfield from 'app/components/Playfield';

const SinglePlayerGame = React.createClass({
    //mixins: [Reflux.connect(gameStore)], // bind gameStore.state directly to this.state
    mixins: [Router.State],
    getInitialState() {
        return { game: null }
    },

    componentDidMount() {
        const params = this.getParams();
        const level = parseInt(params.level) || 0;
        const speed = parseInt(params.speed) || 15;
        this.game = new SinglePlayerGameController({
            render: this.updateGameState,
            level, speed
        });
        this.game.play();
    },
    componentWillUnmount() {
        this.game.cleanup();
    },

    updateGameState(gameState) {
        this.setState({game: gameState});
    },

    render() {
        const hasGame = this.game && this.state.game;
        const hasGrid = hasGame && this.state.game.grid;
        return <div>
            {this.getParams().level}
            {hasGrid ?
                <Playfield grid={this.state.game.grid} />
            : ''}
        </div>
    }
});

export default SinglePlayerGame;