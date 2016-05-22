import _ from 'lodash';
import React from 'react';


function findSvgShapes(svg, tags = ['path', 'circle', 'rect']) {
  if(!svg) return [];
  const elLists = tags.map(tag => svg.getElementsByTagName(tag) || []);
  return _.flatten(elLists.map(_.toArray));
}

function getFillShapes(shapes) {
  return shapes.filter(shape => {
    const fill = shape.getAttribute('fill');
    return fill && fill.length;
  })
}


export default class SVGShimmerFills extends React.Component {
  static propTypes = {
    svgPath: React.PropTypes.string,
    colors: React.PropTypes.array,
    shuffle: React.PropTypes.bool
  };

  static defaultProps = {
    width: 600,
    height: 600,
    shouldAnimate: true,
    transition: 'fill 0.3s ease-in',
    shapesPerFrame: 3,
    interval: 1,
    onFinish: _.noop
  };

  componentDidMount() {
    const svgEl = this.refs.svg;

    svgEl.addEventListener('load', () => {
      const shapes = findSvgShapes(svgEl.contentDocument);
      this.fillShapes = getFillShapes(shapes);
      this.trueColors = this.fillShapes.map(shape => shape.getAttribute('fill'));
      this.hasLoaded = true;

      this._setShapeTransitions();
      if(this.props.colors) this._startAnimation(this.props);
    });
  }

  componentWillReceiveProps(newProps) {
    if(!this.hasLoaded) return;
    const hasChanged = (key) => !_.isEqual(newProps[key], this.props[key]);
    if(hasChanged('transition')) this._setShapeTransitions();
    if(hasChanged('colors')) this._startAnimation(newProps);
    else this.props.onFinish(newProps.colors);
  }

  componentWillUnmount() {
    this._stopAnimation();
  }

  _setShapeTransitions = () => {
    if (!this.hasLoaded || !this.fillShapes) return;
    this.fillShapes.forEach(shape => shape.style.transition = this.props.transition)
  };

  _stopAnimation = () => {
    if(this.animation) {
      clearInterval(this.animation);
      delete this.animation;
    }
  };

  _startAnimation = (props) => {
    const {colors, shapesPerFrame, shuffle, interval} = props;
    const {fillShapes, trueColors} = this;

    const shapeIndexChunks = _.chunk(_.shuffle(_.range(fillShapes.length)), shapesPerFrame);

    this.animIndex = 0;
    this._stopAnimation();

    this.animation = setInterval(() => {
      const {animIndex} = this;
      if(animIndex >= shapeIndexChunks.length) {
        this._stopAnimation();
        this.props.onFinish(colors);

      } else {
        const shapeIndices = shapeIndexChunks[animIndex];
        if(!colors) {
          // animate to original colors
          shapeIndices.forEach(i => fillShapes[i].setAttribute('fill', trueColors[i]));
        } else {
          // animate to target colors
          shapeIndices.forEach(i => {
            // if the shape's true (original) color is in the list of target colors, use its true color
            const trueColor = trueColors[i];
            const newColor = _.includes(colors, trueColor) ? trueColor : _.sample(colors);
            fillShapes[i].setAttribute('fill', newColor);
          });
        }
      }
      this.animIndex += 1;
    }, interval);
  };

  render() {
    return <object
      ref="svg"
      data={this.props.svgPath}
      width={this.props.width}
      height={this.props.height}
      type="image/svg+xml"
    />;
  }
}
