import * as _ from "lodash";
import * as React from "react";

function findSvgShapes(svg: Document, tags = ["path", "circle", "rect"]): SVGElement[] {
  if (!svg) return [];
  const elLists = tags.map(tag => svg.getElementsByTagName(tag) || []);
  return _.flatten(elLists.map(_.toArray));
}

function getFillShapes(shapes: SVGElement[]): SVGElement[] {
  return shapes.filter(shape => {
    const fill = shape.getAttribute("fill");
    return fill && fill.length;
  });
}

export interface SVGShimmerFillsProps {
  svgPath: string;
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
  _hasLoaded: boolean = false;
  _animation: number | undefined;
  _animIndex: number = 0;

  componentDidMount() {
    const svgEl = this.refs.svg as HTMLObjectElement;

    svgEl.addEventListener("load", () => {
      if (!svgEl.contentDocument) return;
      const shapes = findSvgShapes(svgEl.contentDocument);
      this._fillShapes = getFillShapes(shapes);
      this._trueColors = this._fillShapes.map(shape => shape.getAttribute("fill"));
      this._hasLoaded = true;

      this._setShapeTransitions();
      if (this.props.colors) this._startAnimation(this.props);
    });
  }

  componentWillReceiveProps(newProps: SVGShimmerFillsProps) {
    if (!this._hasLoaded) return;
    const hasChanged = (key: string) => !_.isEqual(newProps[key], this.props[key]);
    if (hasChanged("transition")) this._setShapeTransitions();
    if (hasChanged("colors")) this._startAnimation(newProps);
    else this.props.onFinish(newProps.colors);
  }

  componentWillUnmount() {
    this._stopAnimation();
  }

  _setShapeTransitions = () => {
    if (!this._hasLoaded || !this._fillShapes) return;
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
          shapeIndices.forEach((i: number) => fillShapes[i].setAttribute("fill", trueColors[i] || ""));
        } else {
          // animate to target colors
          shapeIndices.forEach((i: number) => {
            // if the shape's true (original) color is in the list of target colors, use its true color
            const trueColor = trueColors[i];
            const newColor = _.includes(colors, trueColor) ? trueColor : _.sample(colors);
            fillShapes[i].setAttribute("fill", newColor || "");
          });
        }
      }
      this._animIndex += 1;
    }, interval);
  };

  render() {
    return (
      <object
        ref="svg"
        data={this.props.svgPath}
        width={this.props.width}
        height={this.props.height}
        type="image/svg+xml"
      />
    );
  }
}
