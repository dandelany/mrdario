import * as _ from "lodash";
import * as React from "react";

import SVGShimmerCycler from "@/components/ui/SVGShimmerCycler";

const aztecCalendar: string = require("@/img/aztec_small.svg");

const oranges = ["#BE1E2D", "#F05A28", "#F6921E"];
const greens = ["#009345", "#006838", "#8BC53F", "#37B34A"];
const purples = ["#5251A1", "#A376CD", "#744B9D", "#7A6ED4"];
const colorGroups = [undefined, oranges, greens, purples];

export enum AztecCalendarMode {
  Title = "Title",
  Won = "Won",
  Lost = "Lost"
}

export interface AztecCalendarProps {
  mode: AztecCalendarMode;
  shouldAnimate: boolean;
  width: number;
  height: number;
  cycleTime: number;
}

export default class AztecCalendar extends React.Component<AztecCalendarProps> {
  static defaultProps = {
    mode: AztecCalendarMode.Title,
    shouldAnimate: true,
    width: 600,
    height: 600,
    cycleTime: 2000
  };

  static modeShimmerProps = {
    defaults: {
      colorSets: [undefined]
    },
    title: {
      colorSets: colorGroups,
      cycleTime: 1500,
      repeat: true
    },
    won: {
      colorSets: colorGroups.concat(undefined),
      shapesPerFrame: 10,
      cycleTime: 0,
      repeat: false
    },
    lost: {
      colorSets: [["#000000"]],
      shapesPerFrame: 8
    }
  };

  render() {
    const { mode, width, height } = this.props;
    const shimmerProps = _.get(AztecCalendar.modeShimmerProps, mode, AztecCalendar.modeShimmerProps.defaults);

    return (
      <div className="aztec-calendar">
        <SVGShimmerCycler
          {...{
            svgPath: aztecCalendar,
            colorSets: colorGroups,
            shapesPerFrame: 4,
            width,
            height,
            ...shimmerProps
          }}
        />
      </div>
    );
  }
}
