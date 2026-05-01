import * as _ from "lodash";
import * as React from "react";

function findSvgShapes(root: ParentNode, tags = ["path", "circle", "rect"]): SVGElement[] {
  const elLists = tags.map(tag => Array.from(root.querySelectorAll<SVGElement>(tag)));
  return _.flatten(elLists);
}

function getFillShapes(shapes: SVGElement[]): SVGElement[] {
  return shapes.filter(shape => Boolean(getShapeFill(shape)));
}

function getShapeFill(shape: SVGElement): string | null {
  return shape.style.fill || shape.getAttribute("fill");
}

function setShapeFill(shape: SVGElement, fill: string) {
  if (shape.style.fill) shape.style.fill = fill;
  else shape.setAttribute("fill", fill);
}

export interface SVGShimmerFillsProps {
  svgContent: string;
  colors?: Array<string>;
  // shuffle: boolean;
  width: number;
  height: number;
  shouldAnimate: boolean;
  transition: string;
  shapesPerFrame: number;
  interval: number;
  onFinish: (colors?: Array<string>) => any;
}

export default class SVGShimmerFills extends React.Component<SVGShimmerFillsProps> {
  static defaultProps = {
    width: 600,
    height: 600,
    shouldAnimate: true,
    transition: "fill 0.3s ease-in",
    shapesPerFrame: 3,
    interval: 1,
    onFinish: _.noop
  };

  _fillShapes: SVGElement[] = [];
  _trueColors: (string | null)[] = [];
  _hasInitialized: boolean = false;
  _animation: number | undefined;
  _animIndex: number = 0;
  svgRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    this._initSvg();
  }

  componentDidUpdate(prevProps: SVGShimmerFillsProps) {
    if (this.props.svgContent !== prevProps.svgContent) this._initSvg(true);
    if (!this._hasInitialized) return;

    const hasChanged = (key: keyof SVGShimmerFillsProps) => !_.isEqual(this.props[key], prevProps[key]);
    if (hasChanged("transition")) this._setShapeTransitions();
    if (hasChanged("width") || hasChanged("height")) this._setSvgSize();
    if (hasChanged("colors")) this._startAnimation(this.props);
    else this.props.onFinish(this.props.colors);
  }

  componentWillUnmount() {
    this._stopAnimation();
  }

  _initSvg = (force: boolean = false) => {
    if (this._hasInitialized && !force) return;

    const rootEl = this.svgRef.current;
    if (!rootEl) return;

    this._stopAnimation();

    const shapes = findSvgShapes(rootEl);
    this._fillShapes = getFillShapes(shapes);
    this._trueColors = this._fillShapes.map(getShapeFill);
    this._hasInitialized = true;

    this._setSvgSize();
    this._setShapeTransitions();
    if (this.props.colors) this._startAnimation(this.props);
  };

  _setSvgSize = () => {
    if (!this.svgRef.current) return;

    const svg = this.svgRef.current.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("width", String(this.props.width));
    svg.setAttribute("height", String(this.props.height));
  };

  _setShapeTransitions = () => {
    if (!this._hasInitialized || !this._fillShapes) return;
    this._fillShapes.forEach(shape => (shape.style.transition = this.props.transition));
  };

  _stopAnimation = () => {
    if (this._animation) {
      clearInterval(this._animation);
      delete this._animation;
    }
  };

  _startAnimation = (props: SVGShimmerFillsProps) => {
    const { colors, shapesPerFrame, interval } = props;
    const { _fillShapes: fillShapes, _trueColors: trueColors } = this;

    const shapeIndexChunks = _.chunk(_.shuffle(_.range(fillShapes.length)), shapesPerFrame);

    this._animIndex = 0;
    this._stopAnimation();

    this._animation = window.setInterval(() => {
      if (this._animIndex >= shapeIndexChunks.length) {
        this._stopAnimation();
        this.props.onFinish(colors);
      } else {
        const shapeIndices = shapeIndexChunks[this._animIndex];
        if (!colors) {
          // animate to original colors
          shapeIndices.forEach((i: number) => setShapeFill(fillShapes[i], trueColors[i] || ""));
        } else {
          // animate to target colors
          shapeIndices.forEach((i: number) => {
            // if the shape's true (original) color is in the list of target colors, use its true color
            const trueColor = trueColors[i];
            const newColor = _.includes(colors, trueColor) ? trueColor : _.sample(colors);
            setShapeFill(fillShapes[i], newColor || "");
          });
        }
      }
      this._animIndex += 1;
    }, interval);
  };

  render() {
    return (
      <div
        ref={this.svgRef}
        style={{ width: this.props.width, height: this.props.height }}
        dangerouslySetInnerHTML={{ __html: this.props.svgContent }}
      />
    );
  }
}
