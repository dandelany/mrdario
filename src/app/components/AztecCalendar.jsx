import _ from 'lodash';
import React from 'react';

import aztecCalendar from 'app/img/aztec_small.svg';

const oranges = ["#BE1E2D", "#F05A28", "#F6921E"];
const greens = ["#009345", "#006838", "#8BC53F", "#37B34A"];
const purples = ["#5251A1", "#A376CD",  "#744B9D", "#7A6ED4"];
const colorGroups = [oranges, greens, purples];

const AztecCalendar = React.createClass({
    getDefaultProps() {
        return {
            width: 600,
            height: 600,
            shouldAnimate: true
        }
    },
    componentDidMount() {
        let svgEl = React.findDOMNode(this.refs.svg);
        svgEl.addEventListener('load', () => {
            let svg = svgEl.contentDocument;
            let paths = svg ? svg.getElementsByTagName('path') : [];
            if(paths.length) {
                let circles = svg.getElementsByTagName('circle') || [];
                paths = Array.prototype.slice.call(paths);
                circles = Array.prototype.slice.call(circles);
                this.onLoadedSvg(paths.concat(circles));
            }
        });
    },
    componentWillReceiveProps(newProps) {
        if(newProps.shouldAnimate === false && this.changeTimer) {
            clearInterval(this.changeTimer);
            delete this.changeTimer;
        } else if(newProps.shouldAnimate === true && !this.changeTimer)
            this.changeTimer = setInterval(this.changeAnimation, 4000);
    },
    componentWillUnmount() {
        if(this.changeTimer) clearInterval(this.changeTimer);
        if(this.animation) clearInterval(this.animation);
    },

    onLoadedSvg(paths) {
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
        console.log(_.uniq(bgColors));
        //borderPaths.forEach(path => path.setAttribute('fill', 'transparent'));

        _.assign(this, {bgPaths, bgColors, borderPaths});

        this.colorGroupIndex = 0;
        if(this.props.shouldAnimate) this.changeTimer = setInterval(this.changeAnimation, 4000);
    },
    changeAnimation() {
        this.animIndex = 0;
        this.colorGroupIndex = (this.colorGroupIndex + 1) % colorGroups.length;
        this.colorGroup = colorGroups[this.colorGroupIndex];

        let {bgPaths, bgColors, colorGroup} = this;
        let pathChunkIndices = _.chunk(_.shuffle(_.range(bgPaths.length)), 3);

        this.animation = setInterval(() => {
            let {animIndex} = this;
            if(animIndex >= pathChunkIndices.length * 2) {
                clearInterval(this.animation);
            } else if(animIndex >= pathChunkIndices.length) {
                const pathIndices = pathChunkIndices[animIndex - pathChunkIndices.length];
                pathIndices.forEach(i => bgPaths[i].setAttribute('fill', bgColors[i]));
            } else {
                const pathIndices = pathChunkIndices[animIndex];
                pathIndices.forEach(i => {
                    let fill = bgPaths[i].getAttribute('fill');
                    if(_.includes(colorGroup.concat(['#FFF', '#FFFFFF']), fill)) return;
                    //console.log(bgPaths[i].getAttribute('fill'));
                    bgPaths[i].setAttribute('fill', _.sample(colorGroup))
                });
            }
            this.animIndex += 1;
        }, 1);
    },


    render() {
        return <div className="aztec-calendar">
            <object type="image/svg+xml"
                    ref="svg"
                    width={this.props.width}
                    height={this.props.height}
                    data={aztecCalendar}>
            </object>
        </div>;
    }
});

export default AztecCalendar;