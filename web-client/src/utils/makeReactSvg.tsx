import * as React from "react";

function createMarkup(html: string) {
  return { __html: html };
}

function makeReactSvg(svgString: string, gProps?: object, svgProps?: object): React.ReactElement<"g"> {
  return (
    <g {...gProps}>
      <svg {...svgProps} dangerouslySetInnerHTML={createMarkup(svgString)} />
    </g>
  );
}

export default makeReactSvg;
