import * as React from "react";

import { GameControllerMode, GameGrid, GameOptions, PillColors } from "mrdario-core";

import PillPreviewPanel from "@/components/game/PillPreviewPanel";
import ContainerDimensions, { Dimensions } from "react-container-dimensions";
import { Omit } from "lodash";
import Playfield from "@/components/game/Playfield";
import LostOverlay from "@/components/overlays/LostOverlay";
import WonOverlay from "@/components/overlays/WonOverlay";

const styles = require("./GameDisplay.module.scss");

export interface GameDisplayProps {
  grid?: GameGrid;
  mode?: GameControllerMode;
  gameOptions?: Partial<GameOptions> & { level: number; baseSpeed: number };
  nextPill?: PillColors;
  score?: number;
  timeBonus?: number;
  gameId?: string;
  cellSize: number;
  padding: number;
  onResetGame?: () => void;
}

export class GameDisplay extends React.PureComponent<GameDisplayProps> {
  static defaultProps = {
    cellSize: 20,
    padding: 0
  };
  render() {
    const { grid, mode, gameOptions, nextPill, score, timeBonus, cellSize, padding } = this.props;

    // pass fractional padding to set padding to a fraction of cell size
    // const padding: number = paddingProp > 0 && paddingProp < 1 ? paddingProp * cellSize : paddingProp;
    const numRows: number = grid ? grid.length : 17;
    const numCols: number = grid ? grid[0].length : 8;
    const width: number = numCols * cellSize + padding * 2;
    // make shorter by one row to account for special unplayable top row
    const height: number = (numRows - 1) * cellSize + padding * 2;
    // const style = { position: "relative" as "relative", width, height, padding };
    const overlayStyle = { width, height, padding };
    const lostOverlayStyle = { ...overlayStyle };
    const wonOverlayStyle = { ...overlayStyle };

    const panelRightDistance = grid
      ? (grid[0].length * cellSize) / 2 + padding * cellSize + cellSize * 0.75
      : 0;
    const rightPanelStyle = {
      left: "50%",
      transform: `translate(${panelRightDistance}px, 0)`
    };

    return (
      <div className={styles.gameDisplay}>
        {grid ? <Playfield grid={grid} cellSize={cellSize} padding={padding} /> : null}

        {nextPill ? (
          <PillPreviewPanel
            style={rightPanelStyle}
            className={styles.pillPreview}
            {...{ cellSize, pill: nextPill }}
          />
        ) : null}

        {score !== undefined ? (
          <div className="score-panel" style={rightPanelStyle}>
            <h5>SCORE</h5>
            {score}
          </div>
        ) : null}

        {mode === GameControllerMode.Lost ? (
          <LostOverlay
            style={lostOverlayStyle}
            gameOptions={gameOptions}
            onResetGame={this.props.onResetGame}
          />
        ) : null}

        {mode === GameControllerMode.Won ? (
          <WonOverlay style={wonOverlayStyle} gameOptions={gameOptions} score={score} timeBonus={timeBonus} />
        ) : null}
      </div>
    );
  }
}

interface ResponsiveGameDisplayProps extends Omit<GameDisplayProps, "cellSize"> {
  gridHeightPercent: number;
  padding: number;
}
export class ResponsiveGameDisplay extends React.Component<ResponsiveGameDisplayProps> {
  static defaultProps = {
    gridHeightPercent: 0.85,
    padding: 0.35
  };
  protected getCellSize = ({ height }: Dimensions): number => {
    // todo handle width
    const { gridHeightPercent, padding, grid } = this.props;
    if (!grid) return 0;
    const cellSize = Math.floor((height * gridHeightPercent) / (grid.length - 1 + 2 * padding));
    return cellSize;
  };
  render() {
    return (
      <ContainerDimensions>
        {(dimensions: Dimensions): React.ReactNode => {
          if (dimensions.height <= 0) return null;

          return <GameDisplay {...this.props} cellSize={this.getCellSize(dimensions)} />;
        }}
      </ContainerDimensions>
    );
  }
}
