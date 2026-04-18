import * as React from "react";

function createMarkup(html: string) {
  return { __html: html };
}

function parseSvgString(svgString: string): { innerMarkup: string; viewBox?: string } {
  const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/i);
  const innerMarkupMatch = svgString.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);

  return {
    viewBox: viewBoxMatch ? viewBoxMatch[1] : undefined,
    innerMarkup: innerMarkupMatch ? innerMarkupMatch[1] : svgString
  };
}

function makeReactSvg(svgString: string, gProps?: object, svgProps?: object): React.ReactElement<"g"> {
  const { innerMarkup, viewBox } = parseSvgString(svgString);

  return (
    <g {...gProps}>
      <svg {...svgProps} viewBox={viewBox} dangerouslySetInnerHTML={createMarkup(innerMarkup)} />
    </g>
  );
}

export default makeReactSvg;
