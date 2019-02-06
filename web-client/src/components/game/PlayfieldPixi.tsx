// import * as _ from "lodash";
import * as React from "react";
import { GameGrid } from "mrdario-core/src/game/types";

import * as virusOrange from "../../svg2/virus_orange.svg";
import * as virusPurple from "@/svg2/virus_purple.svg";
import * as virusGreen from "@/svg2/virus_green.svg";
import * as pillHalfOrange from "@/svg2/pill_half_orange.svg";
import * as pillHalfPurple from "@/svg2/pill_half_purple.svg";
import * as pillHalfGreen from "@/svg2/pill_half_green.svg";
import * as pillSegmentOrange from "@/svg2/pill_segment_orange.svg";
import * as pillSegmentPurple from "@/svg2/pill_segment_purple.svg";
import * as pillSegmentGreen from "@/svg2/pill_segment_green.svg";
import * as Pixi from "pixi.js";
import { GameGridRow, GridObjectPillHalfType, GridObjectType, MaybeGridObject } from "mrdario-core";
import { hasColor, isPillHalf, isPillHalf } from "mrdario-core/lib/game/utils";
// import makeReactSvg from "@/utils/makeReactSvg";

// import PillPart from "./PillPart";
// import * as destroyed from "!raw-loader!@/svg2/destroyed.svg";

type SpriteGrid = (Pixi.Sprite | null)[][];

const pillHalves = [pillHalfOrange, pillHalfPurple, pillHalfGreen];
const pillSegments = [pillSegmentOrange, pillSegmentPurple, pillSegmentGreen];
const viruses = [virusOrange, virusPurple, virusGreen];

const pillHalfRotations: { [P in GridObjectPillHalfType]: number } = {
  [GridObjectType.PillTop]: 0,
  [GridObjectType.PillRight]: Math.PI / 2,
  [GridObjectType.PillBottom]: Math.PI,
  [GridObjectType.PillLeft]: (3 * Math.PI) / 2
};

export interface PlayfieldProps {
  cellSize: number;
  grid: GameGrid;
}
export default class Playfield extends React.Component<PlayfieldProps> {
  static defaultProps = {
    cellSize: 36
  };

  protected canvasRef: React.RefObject<HTMLCanvasElement>;
  protected virusTextures: Pixi.Texture[];
  protected pillHalfTextures: Pixi.Texture[];
  protected pillSegmentTextures: Pixi.Texture[];
  protected pixiApp?: Pixi.Application;
  protected lastGrid?: GameGrid;
  protected spriteGrid?: SpriteGrid;

  constructor(props: PlayfieldProps) {
    super(props);
    this.canvasRef = React.createRef();
    this.virusTextures = viruses.map(v => Pixi.Texture.from(v));
    this.pillHalfTextures = pillHalves.map(v => Pixi.Texture.from(v));
    this.pillSegmentTextures = pillSegments.map(v => Pixi.Texture.from(v));
  }

  protected getSpriteForGridObject(obj: MaybeGridObject, rowIndex: number, colIndex: number): Pixi.Sprite | null {
    if (!obj || obj.type === GridObjectType.Empty) return null;
    const {cellSize} = this.props;
    let sprite = null;
    if (hasColor) {
      if (obj.type === GridObjectType.Virus) {
        sprite = new Pixi.Sprite(this.virusTextures[obj.color]);
      } else if (obj.type === GridObjectType.PillSegment) {
        sprite = new Pixi.Sprite(this.pillSegmentTextures[obj.color]);
      } else if (isPillHalf(obj)) {
        sprite = new Pixi.Sprite(this.pillHalfTextures[obj.color]);

      }
    }
    if (sprite) {
      sprite.width = cellSize;
      sprite.height = cellSize;
      sprite.anchor.x = 0.5;
      sprite.anchor.y = 0.5;
      sprite.position.x = Math.floor((colIndex * this.props.cellSize) + (cellSize * 0.5));
      sprite.position.y = Math.floor((rowIndex * this.props.cellSize) + (cellSize * 0.5));

      if(isPillHalf(obj)) {
        sprite.rotation = pillHalfRotations[obj.type];
      }
    }
    return sprite;
  }

  componentWillReceiveProps(nextProps: PlayfieldProps) {
    const { pixiApp, lastGrid } = this;
    const { grid, cellSize } = nextProps;
    // let spriteGrid: Pixi.Sprite[][];

    if (!pixiApp) return;

    if (!this.spriteGrid || !this.lastGrid) {
      pixiApp.stage.removeChildren();
      this.lastGrid = grid;
      this.spriteGrid = grid.map((row: GameGridRow, rowIndex: number) => {
        return row.map((obj: MaybeGridObject, colIndex) => {
          const sprite = this.getSpriteForGridObject(obj, rowIndex, colIndex);
          if (sprite) {
            pixiApp.stage.addChild(sprite);
          }
          return sprite;
        });
      });
      pixiApp.render();
    } else if (grid !== this.lastGrid) {
      for (let rowIndex = 0, gridLen = grid.length; rowIndex < gridLen; rowIndex++) {
        const row = grid[rowIndex];
        const lastGridRow = this.lastGrid[rowIndex];
        if (row === lastGridRow) continue;
        for (let colIndex = 0, rowLen = row.length; colIndex < rowLen; colIndex++) {
          const gridObj = row[colIndex];
          if (gridObj === lastGridRow[colIndex]) continue;
          const lastSprite = this.spriteGrid[rowIndex][colIndex];
          if (lastSprite) lastSprite.destroy();
          const sprite = this.getSpriteForGridObject(gridObj, rowIndex, colIndex);
          if (sprite) {
            pixiApp.stage.addChild(sprite);
          }
          this.spriteGrid[rowIndex][colIndex] = sprite;
        }
      }
      this.lastGrid = grid;
      pixiApp.render();
    }

    // if(!this.lastGrid || grid !== this.lastGrid) {
    //   for(var v of this.virusTextures) {
    //     const s = new Pixi.Sprite(v);
    //     s.position.x = Math.random() * 300;
    //     s.position.y = Math.random() * 300;
    //     if(this.pixiApp)
    //       this.pixiApp.stage.addChild(s);
    //   }
    // }
  }
  componentDidUpdate() {}
  shouldComponentUpdate() {
    return false;
  }
  // shouldComponentUpdate(newProps: PlayfieldProps) {
  //   return !shallowEqual(newProps, this.props);
  // }

  componentDidMount() {
    const canvas = this.canvasRef.current;
    if (canvas) {
      const { width, height } = this._getSize();

      const app = new Pixi.Application({
        view: canvas,
        width,
        height,
        transparent: true,
        resolution: 2
      });
      this.pixiApp = app;

      const makeSVGTexture = (svgStr: string): PIXI.Texture => {
        return PIXI.Texture.fromImage("data:image/svg+xml;charset=utf8," + svgStr);
      };

      const renderSprite = (s: PIXI.Sprite) => {
        s.position.x = Math.random() * 300;
        s.position.y = Math.random() * 300;
        app.stage.addChild(s);
      };

      // const virusTextures = viruses.map(makeSVGTexture);

      var texture = PIXI.Texture.from(virusOrange);

      // var tVirusOrange = PIXI.Texture.fromImage('data:image/svg+xml;charset=utf8,' + virusOrange);
      // var texture = PIXI.Texture.fromImage('data:image/svg+xml;charset=utf8,' + virusGreen);

      // var bunny = new PIXI.Sprite(texture);

      let circle = new Pixi.Graphics();
      circle.beginFill(0x996600);
      circle.drawCircle(0, 0, 32);
      circle.endFill();
      circle.x = 64;
      circle.y = 130;
      app.stage.addChild(circle);

      // app.stage.addChild(Pixi.)
      app.render();

      // console.log(app, bunny, texture);
    }
  }

  _getSize = () => {
    const grid = this.props.grid;
    // first row of grid is "true" top row which is out of play and should be rendered above the playfield

    const numRows = grid.length;
    const numCols = grid[0].length;
    const cellSize = this.props.cellSize;
    const width = numCols * cellSize;
    const height = numRows * cellSize;
    return { width, height };
  };

  render() {
    const grid = this.props.grid;
    // first row of grid is "true" top row which is out of play and should be rendered above the playfield

    const numRows = grid.length;
    const numCols = grid[0].length;
    const cellSize = this.props.cellSize;
    const width = numCols * cellSize;
    const height = numRows * cellSize;

    // translate svg up by one row to account for out-of-sight true top row
    // const style = { width, height, transform: `translate(0, ${-cellSize}px)` };
    const style = {
      width,
      height,
      position: "absolute",
      top: "-32px",
      left: "15px",
      zIndex: 10000
    };

    return <canvas width={width} height={height} style={style} ref={this.canvasRef} />;
  }
}
