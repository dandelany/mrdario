import React from 'react';

const responsiveGame = (GameComponent) => {
  return class ResponsiveGame extends React.Component {
    static defaultProps = {
      heightPercent: 0.85,
      padding: 15
    };

    render() {
      const {heightPercent, padding, gridRows, windowHeight} = this.props;
      const cellSize = Math.round(((windowHeight - (padding * 2)) * heightPercent) / gridRows);
      return <GameComponent {...{cellSize, ...this.props}}/>;
    }
  };
};

export default responsiveGame;
