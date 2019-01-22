import React from 'react';

function createMarkup(html) { return {__html: html}; }

export default function makeReactSvg(svgString, gProps, svgProps) {
  return <g {...gProps}>
    <svg {...svgProps} dangerouslySetInnerHTML={createMarkup(svgString)} />
  </g>;
}
