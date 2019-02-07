import * as React from "react";
import { clamp, sample } from "lodash";
import { GameColor, GameGrid } from "../../../../core/src/game/types";
import { randomLogNormal, randomNormal } from "d3-random";
import { hasColor, isDestroyed } from "../../../../core/src/game/utils/guards";

type GridLocation = [number, number];
type Particle = [number, number, number, number, number];
type RGBColor = [number, number, number];

const oranges: RGBColor[] = [[190, 30, 45], [240, 90, 40], [246, 146, 30]];
const greens: RGBColor[] = [[0, 147, 69], [0, 104, 56], [139, 197, 63], [55, 179, 74]];
const purples: RGBColor[] = [[82, 81, 161], [163, 118, 205], [116, 75, 157], [122, 110, 212]];

const colorSets: { [C in GameColor]: RGBColor[] } = {
  [GameColor.Color1]: oranges,
  [GameColor.Color2]: purples,
  [GameColor.Color3]: greens
};

interface ParticleSimOptions {
  context: CanvasRenderingContext2D;
  locations: GridLocation[];
  colors?: RGBColor[];
  maxParticles?: number;
  maxPerExplosion?: number;
  width?: number;
  height?: number;
  minSize?: number;
  maxSize?: number;
}
interface CompleteParticleSimOptions extends ParticleSimOptions {
  colors: RGBColor[];
  maxParticles: number;
  maxPerExplosion: number;
  width: number;
  height: number;
  minSize: number;
  maxSize: number;
}

// const defaultParticleSimOptions: Partial<ParticleSimOptions> = {
//   colors: [[0, 0, 0]],
//   maxParticles: 400,
//   maxPerExplosion: 20,
//   height: 200,
//   width: 200
// };

class ExplosionParticleSim {
  options: CompleteParticleSimOptions;
  particles: Particle[];
  colorDataSets: ImageData[];

  constructor(options: ParticleSimOptions) {
    this.options = Object.assign(
      {
        colors: [[0, 0, 0]],
        maxParticles: 400,
        maxPerExplosion: 35,
        height: 200,
        width: 200,
        minSize: 4,
        maxSize: 16
      },
      options
    );
    this.particles = this.initParticles();

    const { colors, context, maxSize } = this.options;
    const swatchSize = maxSize + 2;

    this.colorDataSets = colors.map(
      (color: RGBColor): ImageData => {
        const imgData: ImageData = context.createImageData(swatchSize, swatchSize);
        var data = imgData.data;
        for (var i = 0, len = swatchSize * swatchSize * 4; i < len; i += 4) {
          data[i] = color[0];
          data[i + 1] = color[1];
          data[i + 2] = color[2];
          data[i + 3] = 255;
        }
        return imgData;
      }
    );
  }
  private initParticles(): Particle[] {
    const { maxPerExplosion, locations, minSize, maxSize } = this.options;
    const particles: Particle[] = new Array(maxPerExplosion * locations.length);

    let particleIndex = 0;
    for (let location of locations) {
      const [centerX, centerY] = location;
      const getX = randomNormal(centerX, 10);
      const getY = randomNormal(centerY, 10);
      const getVelocity = randomLogNormal(0, 0.5);

      for (let i = 0; i < maxPerExplosion; i++) {
        const x: number = getX();
        const y: number = getY();
        const size: number = Math.round(minSize + Math.random() * (maxSize - minSize));
        const vx: number = Math.round(getVelocity() * 10000 * (sample([-1, 1]) as number));
        const vy: number = Math.round(getVelocity() * 10000 * (sample([-1, 1]) as number));
        // const vx = Math.round(Math.random() * 100);
        // const vy = Math.round(Math.random() * 100);
        particles[particleIndex] = [x, y, size, vx, vy];
        particleIndex += 1;
      }
    }
    return particles;
  }

  public tickAndDraw() {
    const { context, width, height, colors } = this.options;
    const { particles, colorDataSets } = this;
    const gravity = 600;

    let minX = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    const count = particles.length;
    let colorIndex = -1;
    let killParticles: number[] = [];

    for (var j = 0; j < count; j++) {
      var particle = this.particles[j];
      const [x, y, size, vx, vy] = particle;

      const nextX = clamp(x + vx / 1500, 0, width);
      const nextY = clamp(y + vy / 1500, 0, height);

      particle[0] = nextX;
      particle[1] = nextY;

      const radius = ~~(size / 2);

      minX = Math.min(minX, nextX - (radius + 1));
      minY = Math.min(minY, nextY - (radius + 1));
      maxX = Math.max(maxX, nextX + (radius + 1));
      maxY = Math.max(maxY, nextY + (radius + 1));

      const nextColorIndex = Math.floor((j / count) * colorDataSets.length);

      if (nextColorIndex !== colorIndex) {
        const [r, g, b] = colors[nextColorIndex];
        if (colorIndex >= 0) context.fill();
        context.fillStyle = "rgb(" + r + ", " + g + ", " + b + ")";
        context.beginPath();
        colorIndex = nextColorIndex;
      }

      // const imageData = ctx.createImageData(diameter, diameter);
      //
      // const colorData = this.colorDataSets[nextColorIndex];
      // context.putImageData(colorData, x, y, 0, 0, size, size);

      // context.beginPath();
      // todo draw all rectangles of each color before filling
      // context.fillStyle = "rgb(" + r + ", " + g + ", " + b + ")";
      context.rect(~~(nextX - size / 2), ~~(nextY - size / 2), size, size);
      // context.fill();

      let nextVX = vx;
      let nextVY = vy + gravity;

      if (nextX === 0 || nextX === width || nextY === 0 || nextY === height) {
        nextVX = 0;
        nextVY = 0;
        killParticles.push(j);
      }
      if (nextY === 0 || nextY === height) particle[3] = ~~nextVX;
      particle[4] = ~~nextVY;
    }
    context.fill();
    // context.fillRect(minX, minY, maxX - minX, maxY - minY);

    for (var i = killParticles.length - 1; i >= 0; i--) {
      this.particles.splice(killParticles[i], 1);
    }

    return [minX, maxX, minY, maxY];
  }
}

class ExplosionManager {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  explosionSims: ExplosionParticleSim[];
  started: boolean;
  frameRequestId?: number;
  tickTimes: number[];
  combinedBounds: number[];

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.context = context;
    this.explosionSims = [];
    this.started = false;
    this.tickTimes = [];
    this.combinedBounds = [0, 0, 0, 0];

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  public start() {
    if (this.started) return;
    this.frameRequestId = requestAnimationFrame(this.tickAndDraw);
    this.started = true;
  }
  public stop() {
    if (this.frameRequestId !== undefined) {
      cancelAnimationFrame(this.frameRequestId);
    }
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.started = false;
  }
  public clear = () => {
    let [minX, maxX, minY, maxY] = this.combinedBounds;
    this.context.clearRect(minX, minY, maxX - minX, maxY - minY);
  };
  public tickAndDraw = () => {
    // const start = performance.now();
    // this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.clear();
    let simBounds = [];
    for (let sim of this.explosionSims) {
      simBounds.push(sim.tickAndDraw());
    }

    let combinedBounds = simBounds[0].slice();
    for (let bounds of simBounds) {
      let [simMinX, simMaxX, simMinY, simMaxY] = bounds;
      combinedBounds[0] = Math.min(combinedBounds[0], simMinX);
      combinedBounds[1] = Math.max(combinedBounds[1], simMaxX);
      combinedBounds[2] = Math.min(combinedBounds[2], simMinY);
      combinedBounds[3] = Math.max(combinedBounds[3], simMaxY);
    }
    // let [minX, maxX, minY, maxY] = combinedBounds;
    // this.context.fillRect(minX, minY, maxX - minX, maxY - minY);
    this.combinedBounds = combinedBounds;
    // this.tickTimes.push(performance.now() - start);
    // if (this.tickTimes.length == 20) {
    //   console.log("avg tick time", mean(this.tickTimes));
    //   this.tickTimes = [];
    // }

    this.frameRequestId = requestAnimationFrame(this.tickAndDraw);
  };
  explode(locations: GridLocation[], colorSets: RGBColor[][]) {
    for (let i = 0; i < locations.length; i++) {
      const sim = new ExplosionParticleSim({
        context: this.context,
        width: this.canvas.width,
        height: this.canvas.height,
        locations: [locations[i]],
        colors: colorSets[i]
      });
      this.explosionSims.push(sim);
    }
    this.start();
    let locationCount = locations.length;
    setTimeout(() => {
      this.explosionSims.splice(0, locationCount);
      if (!this.explosionSims.length) this.stop();
    }, 2000);
  }
}

function getSize(grid: GameGrid, cellSize: number) {
  const numRows = grid.length;
  const numCols = grid[0].length;
  const width = numCols * cellSize;
  const height = numRows * cellSize;
  return { width, height };
}

interface ExplosionFieldProps {
  particleCount: number;
  width: number;
  height: number;
  grid: GameGrid;
  cellSize: number;
}
export class ExplosionField extends React.Component<ExplosionFieldProps> {
  static defaultProps = {
    particleCount: 50,
    width: 300,
    height: 500
  };
  public canvasRef: React.RefObject<HTMLCanvasElement>;
  public ctx?: CanvasRenderingContext2D | null;
  private explosions?: ExplosionManager;

  constructor(props: ExplosionFieldProps) {
    super(props);
    this.canvasRef = React.createRef();
  }

  componentDidMount() {
    const canvas = this.canvasRef.current;
    if (canvas) {
      // const ctx = canvas.getContext("2d");
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) {
        this.explosions = new ExplosionManager(canvas, ctx);
        this.ctx = ctx;
      }
    }
  }
  componentWillReceiveProps(nextProps: ExplosionFieldProps) {
    const { cellSize } = nextProps;
    const nextGrid = nextProps.grid;
    const lastGrid = this.props.grid;
    let explosionLocations: GridLocation[] = [];
    const explosionColorSets = [];
    for (let rowIndex = 0, rowCount = nextGrid.length; rowIndex < rowCount; rowIndex++) {
      const nextRow = nextGrid[rowIndex];
      for (let colIndex = 0, colCount = nextRow.length; colIndex < colCount; colIndex++) {
        const nextObj = nextRow[colIndex];
        // if(nextObj !== lastGrid[rowIndex][colIndex] && this.explosions && Math.random() > .9) {
        //   this.explosions.explode([[100, 100]], [[[0,189,198]]]);
        // }
        if (isDestroyed(nextObj) && !isDestroyed(lastGrid[rowIndex][colIndex])) {
          const centerX = colIndex * cellSize + Math.round(cellSize / 2);
          const centerY = rowIndex * cellSize + Math.round(cellSize / 2);
          explosionLocations.push([centerX, centerY]);
          const gridObj = lastGrid[rowIndex][colIndex];
          if (hasColor(gridObj)) {
            explosionColorSets.push(colorSets[gridObj.color]);
          } else {
            explosionColorSets.push(colorSets[GameColor.Color1]);
          }
        }
      }
    }
    if (explosionLocations.length && this.explosions) {
      this.explosions.explode(explosionLocations, explosionColorSets);
    }
  }
  animate = () => {
    // if (this.particleSim) {
    //   this.particleSim.tickAndDraw();
    // }
    // requestAnimationFrame(this.animate);
  };

  render() {
    const { grid, cellSize } = this.props;
    const { width, height } = getSize(grid, cellSize);

    return (
      <div className="game-explosions">
        <canvas ref={this.canvasRef} width={width} height={height} />
      </div>
    );
  }
}
