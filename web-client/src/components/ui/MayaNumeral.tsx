import * as _ from "lodash";
import * as React from "react";

interface MayaNumeralStyles {
  container: object;
  digit: object;
  zero: object;
  bar: object;
  dots: object;
}

const defaultStyles: MayaNumeralStyles = {
  container: {
    display: "inline-block"
  },
  digit: {
    display: "block"
  },
  zero: {},
  bar: {
    height: 0
  },
  dots: {}
};

interface MayaNumeralZeroProps {
  symbol: string;
  size: number | string;
  color: string;
  style: object;
}

const toCssSize = (size: number | string): string => (typeof size === "number" ? `${size}px` : size);

const scaleSize = (size: number | string, multiplier: number): string =>
  typeof size === "number" ? `${Math.ceil(size * multiplier)}px` : `calc(${size} * ${multiplier})`;

const divideSize = (size: number | string, divisor: number): string =>
  typeof size === "number" ? `${Math.ceil(size / divisor)}px` : `calc(${size} / ${divisor})`;

const MayaNumeralZero: React.FunctionComponent<MayaNumeralZeroProps> = props => {
  const { symbol, size, color } = props;
  const fontSize = scaleSize(size, 1.8);
  const lineHeight = scaleSize(size, 0.75);
  const fontFamily =  "Noto Sans Symbols 2, serif";
  const style = _.defaults({}, props.style, { lineHeight, fontSize, color, fontFamily });

  return (
    <div className="mayan-numeral-zero" style={style}>
      {/* this zero glyph dates to 31 BC */}
      {symbol ?? "𝋠"}
    </div>
  );
};

interface MayaNumeralDotsProps {
  count: number;
  symbol: string;
  size: number | string;
  color: string;
  style: object;
}
const MayaNumeralDots: React.FunctionComponent<MayaNumeralDotsProps> = props => {
  const { count, symbol, size, color } = props;
  const fontSize = toCssSize(size);
  const lineHeight = scaleSize(size, 0.5);
  const style = _.defaults({}, props.style, { lineHeight, fontSize, color });

  return (
    <div className="mayan-numeral-dots" style={style}>
      {_.times(count, _.constant(symbol || "\u2022")).join("")}
    </div>
  );
};

interface MayaNumeralBarProps {
  size: number | string;
  color: string;
  style: object;
}
const MayaNumeralBar: React.FunctionComponent<MayaNumeralBarProps> = props => {
  const { size, color } = props;
  const style = _.defaults({}, props.style, {
    width: typeof size === "number" ? size * 2 : `calc(${size} * 2)`,
    borderBottom: `${divideSize(size, 4)} solid ${color}`,
    margin: `${divideSize(size, 12)} auto`
  });

  return <div className="mayan-numeral-bar" style={style} />;
};

interface MayaNumeralDigitProps {
  value: number;
  i: number;
  size: number | string;
  color: string;
  dotSymbol: string;
  zeroSymbol: string;
  styles: MayaNumeralStyles;
}
const MayaNumeralDigit: React.FunctionComponent<MayaNumeralDigitProps> = props => {
  const { value, i, size, color, dotSymbol, zeroSymbol, styles } = props;
  const dots = Math.round(((value / 5) % 1) * 5);
  const bars = Math.floor(value / 5);
  const style = _.defaults({}, styles.digit, {
    marginTop: i === 0 ? 0 : divideSize(size, 2)
  });

  const children =
    value === 0 ? (
      <MayaNumeralZero {...{ symbol: zeroSymbol, size, color, style: styles.zero }} />
    ) : (
      [
        <MayaNumeralDots
          {...{ count: dots, symbol: dotSymbol, size, color, style: styles.dots, key: "dots" }}
        />,
        _.times(bars, i => <MayaNumeralBar {...{ size, color, style: styles.bar, key: `bar-${i}` }} />)
      ]
    );

  return (
    <div className="mayan-numeral-digit" style={style}>
      {children}
    </div>
  );
};

interface MayaNumeralProps {
  value: number;
  size: number | string;
  color: string;
  dotSymbol: string;
  zeroSymbol: string;
  styles: Partial<MayaNumeralStyles>;
}
export default class MayaNumeral extends React.Component<MayaNumeralProps> {
  static defaultProps = {
    size: 10,
    color: "black",
    dotSymbol: "\u2022",
    zeroSymbol: "𝋠",
    styles: {}
  };

  render() {
    // merge in the custom inline styles object prop (see defaultStyles for structure)
    const styles = _.defaultsDeep({}, this.props.styles, defaultStyles);
    // convert value to positive integer, then to base 20 string
    const base20String = Math.abs(Math.floor(this.props.value)).toString(20);

    return (
      <div style={styles.container}>
        {base20String.split("").map((base20Digit, i) => {
          // render each base 20 digit
          const digit = parseInt(base20Digit, 20);
          return <MayaNumeralDigit {...this.props} {...{ value: digit, i, styles, key: `digit-${i}` }} />;
        })}
      </div>
    );
  }
}
