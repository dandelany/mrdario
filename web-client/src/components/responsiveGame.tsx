import * as React from "react";

interface ResponsiveGameProps {
  heightPercent: number;
  padding: number;
  gridRows: number;
  windowHeight: number;
}

const responsiveGame = <P extends object>(GameComponent: React.ComponentType<P>) => {
  return class ResponsiveGame extends React.Component<P & ResponsiveGameProps> {
    static defaultProps = {
      heightPercent: 0.85,
      padding: 15
    };

    render() {
      const { heightPercent, padding, gridRows, windowHeight } = this.props;
      const cellSize = Math.round(((windowHeight - padding * 2) * heightPercent) / gridRows);
      return <GameComponent {...{ cellSize, ...this.props }} />;
    }
  };
};

export default responsiveGame;
