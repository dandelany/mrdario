// import * as _ from "lodash";
import * as React from "react";
import shallowEqual from "@/utils/shallowEqual";
// import makeReactSvg from "@/utils/makeReactSvg";

// import PillPart from "./PillPart";

import { GameGrid, GameColor } from "mrdario-core/src/game/types";

import * as virusOrange from "!raw-loader!@/svg2/virus_orange.svg";
import * as virusPurple from "!raw-loader!@/svg2/virus_purple.svg";
import * as virusGreen from "!raw-loader!@/svg2/virus_green.svg";
// import * as destroyed from "!raw-loader!@/svg2/destroyed.svg";

import * as pillHalfOrange from "!raw-loader!@/svg2/pill_half_orange.svg";
import * as pillHalfPurple from "!raw-loader!@/svg2/pill_half_purple.svg";
import * as pillHalfGreen from "!raw-loader!@/svg2/pill_half_green.svg";
import * as pillSegmentOrange from "!raw-loader!@/svg2/pill_segment_orange.svg";
import * as pillSegmentPurple from "!raw-loader!@/svg2/pill_segment_purple.svg";
import * as pillSegmentGreen from "!raw-loader!@/svg2/pill_segment_green.svg";


const pillHalves = {
  [GameColor.Color1]: pillHalfOrange,
  [GameColor.Color2]: pillHalfPurple,
  [GameColor.Color3]: pillHalfGreen
};

const pillSegments = {
  [GameColor.Color1]: pillSegmentOrange,
  [GameColor.Color2]: pillSegmentPurple,
  [GameColor.Color3]: pillSegmentGreen
};


const viruses = [virusOrange, virusPurple, virusGreen];



import * as Pixi from "pixi.js";
import { GameColor } from "mrdario-core";

export interface PlayfieldProps {
  cellSize: number;
  grid: GameGrid;
}
export default class Playfield extends React.Component<PlayfieldProps> {
  static defaultProps = {
    cellSize: 36
  };

  protected canvasRef: React.RefObject<HTMLCanvasElement>;

  constructor(props: PlayfieldProps) {
    super(props);
    this.canvasRef = React.createRef();
  }

  componentDidMount() {
    const canvas = this.canvasRef.current;
    if (canvas) {
      const {width, height} = this._getSize();

      const app = new Pixi.Application({
        view: canvas,
        width,
        height
      });

      const makeSVGTexture = (svgStr: string): PIXI.Texture => {
        return PIXI.Texture.fromImage('data:image/svg+xml;charset=utf8,' + svgStr);
      };

      const renderSprite = (s: PIXI.Sprite) => {
        s.position.x = Math.random() * 300;
        s.position.y = Math.random() * 300;
        app.stage.addChild(s);
      };

      const virusTextures = viruses.map(makeSVGTexture);
      const virusSprites = virusTextures.map(t => new PIXI.Sprite(t));
      virusSprites.forEach(renderSprite);

      const pSprites = Object.values(pillSegments).map(makeSVGTexture).map(t => new PIXI.Sprite(t));
      pSprites.forEach(renderSprite);


      // var tVirusOrange = PIXI.Texture.fromImage('data:image/svg+xml;charset=utf8,' + virusOrange);
      // var texture = PIXI.Texture.fromImage('data:image/svg+xml;charset=utf8,' + virusGreen);
      // var texture = PIXI.Texture.fromImage('data:image/svg+xml;charset=utf8,' + virusPurple);
      // var bunny = new PIXI.Sprite(texture);
      //
      // bunny.position.x = 200;
      // bunny.position.y = 150;
      //
      // app.stage.addChild(bunny);
      let circle = new Pixi.Graphics();
      circle.beginFill(0x9966FF);
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

  shouldComponentUpdate(newProps: PlayfieldProps) {
    return !shallowEqual(newProps, this.props);
  }

  _getSize = () => {
    const grid = this.props.grid;
    // first row of grid is "true" top row which is out of play and should be rendered above the playfield

    const numRows = grid.length;
    const numCols = grid[0].length;
    const cellSize = this.props.cellSize;
    const width = numCols * cellSize;
    const height = numRows * cellSize;
    return {width, height};
  }

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
    const style = { width, height, backgroundColor: 'thistle'};

    return (
      <canvas width={width} height={height} style={style} ref={this.canvasRef} />
    );
  }
}
