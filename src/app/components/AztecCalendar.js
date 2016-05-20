import _ from 'lodash';
import React from 'react';

import aztecCalendar from 'app/img/aztec_small.svg';

const oranges = ["#BE1E2D", "#F05A28", "#F6921E"];
const greens = ["#009345", "#006838", "#8BC53F", "#37B34A"];
const purples = ["#5251A1", "#A376CD",  "#744B9D", "#7A6ED4"];
const colorGroups = [null, oranges, greens, purples];

export default class AztecCalendar extends React.Component {
  static defaultProps = {
    width: 600,
    height: 600,
    shouldAnimate: true,
    cycleTime: 2000
  };

  componentDidMount() {
    let svgEl = this.refs.svg;

    svgEl.addEventListener('load', () => {
      let svg = svgEl.contentDocument;
      let paths = svg ? svg.getElementsByTagName('path') : [];

      if(paths.length) {
        let circles = svg.getElementsByTagName('circle') || [];
        paths = Array.prototype.slice.call(paths);
        circles = Array.prototype.slice.call(circles);
        const shapes = paths.concat(circles);
        _.each(shapes, shape => shape.style.transition = 'fill 0.3s ease-in');
        this.onLoadedSvg(shapes);
      }
    });
  }

  componentWillReceiveProps(newProps) {
    console.log('got props', newProps);
    if(newProps.shouldAnimate === false && this.changeTimer) {
      clearTimeout(this.changeTimer);
      delete this.changeTimer;

    } else if(newProps.shouldAnimate === true && !this.animation && !this.changeTimer) {
      this.changeTimer = setTimeout(this.changeAnimation, newProps.cycleTime);
    }
  }

  componentWillUnmount() {
    if(this.changeTimer) clearTimeout(this.changeTimer);
    if(this.animation) clearInterval(this.animation);
  }

  onLoadedSvg = (paths) => {
    console.log('loaded')
    this.paths = paths;

    let bgPaths = [];
    let bgColors = [];
    let borderPaths = [];
    _.each(paths, path => {
      let fill = path.getAttribute('fill');
      if(!fill || !fill.length) borderPaths.push(path); // return;
      else {
        bgPaths.push(path);
        bgColors.push(fill);
      }
    });

    _.assign(this, {bgPaths, bgColors, borderPaths});

    this.colorGroupIndex = 0;
    if(this.props.shouldAnimate)
      this.changeTimer = setTimeout(this.changeAnimation, this.props.cycleTime / 2);
  };

  changeAnimation = () => {
    console.log('change');
    this.animIndex = 0;
    this.colorGroupIndex = (this.colorGroupIndex + 1) % colorGroups.length;
    this.colorGroup = colorGroups[this.colorGroupIndex];

    let {bgPaths, bgColors, colorGroup} = this;
    let pathIndexChunks = _.chunk(_.shuffle(_.range(bgPaths.length)), 3);

    this.stopAnimation();
    this.animation = setInterval(() => {
      let {animIndex} = this;
      if(animIndex >= pathIndexChunks.length) {
        this.stopAnimation();
        if(this.props.shouldAnimate)
          this.changeTimer = setTimeout(this.changeAnimation, this.props.cycleTime);
      } else {
        if(!colorGroup) {
          // animate to original colors
          const pathIndices = pathIndexChunks[animIndex];
          pathIndices.forEach(i => bgPaths[i].setAttribute('fill', bgColors[i]));
        } else {
          const pathIndices = pathIndexChunks[animIndex];
          pathIndices.forEach(i => {
            const trueColor = bgColors[i];
            const useTrueColor = _.includes(colorGroup.concat(['#FFF', '#FFFFFF']), trueColor);
            const newColor = useTrueColor ? trueColor : _.sample(colorGroup);
            bgPaths[i].setAttribute('fill', newColor);
          });
        }
      }
      this.animIndex += 1;
    }, 1);
  };

  stopAnimation = () => {
    if(this.animation) {
      clearInterval(this.animation);
      delete this.animation;
    }
  }

  render() {
    return <div className="aztec-calendar">
      <object
        type="image/svg+xml"
        ref="svg"
        width={this.props.width}
        height={this.props.height}
        data={aztecCalendar}
      />
    </div>;
  }
}
