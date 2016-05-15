import _ from 'lodash';
import React from 'react';

import SinglePlayerGameController from 'game/SinglePlayerGameController';
//import SinglePlayerGameController from 'game/SinglePlayerNetworkGameController';
import Playfield from 'app/components/Playfield';

export default class SinglePlayerGame extends React.Component {
  state = { game: null };

  componentDidMount() {
    const params = _.defaults();
    const level = parseInt(params.level) || 0;
    const speed = parseInt(params.speed) || 15;

    // create new game controller that will run the game
    // and update component state whenever game state changes to re-render
    this.game = new SinglePlayerGameController({
      level, speed,
      render: (gameState) => this.setState({game: gameState})
    });
    this.game.play();
  }
  componentWillUnmount() {
    this.game.cleanup();
  }

  render() {
    const hasGame = this.game && this.state.game;
    const hasGrid = hasGame && this.state.game.grid;
    return <div>
      {hasGrid ?
        <Playfield grid={this.state.game.grid} />
        : ''}
    </div>
  }
}
