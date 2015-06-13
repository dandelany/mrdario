import _ from 'lodash';
import React from 'react';
import Reflux from 'reflux';

import gameStore from 'app/stores/GameStore';
import SinglePlayerGameController from 'game/SinglePlayerGameController';
import Playfield from 'app/components/Playfield';

const SinglePlayerGame = React.createClass({
    //mixins: [Reflux.connect(gameStore)], // bind gameStore.state directly to this.state
    getInitialState() {
        return { game: null }
    },
    componentDidMount() {
        this.game = new SinglePlayerGameController({
            render: this.updateGameState
        });
        this.game.play();
    },
    updateGameState(gameState) {
        this.setState({game: gameState});
    },
    render() {
        const hasGame = this.game && this.state.game;
        const hasGrid = hasGame && this.state.game.grid;
        return <div>
            {hasGrid ?
                <Playfield grid={this.state.game.grid} />
            : ''}
        </div>
    }
});

export default SinglePlayerGame;