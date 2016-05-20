import _ from 'lodash';
import React from 'react';

const defaultStyles = {
  container: {
    display: 'inline-block'
  },
  digit: {
    display: 'block'
  },
  zero: {},
  bar: {
    height: 0
  },
  dots: {}
};

const MayaNumeralZero = (props) => {
  const {symbol, size, color} = props;
  const fontSize = size + 'px';
  const lineHeight = Math.ceil(size * .5) + 'px';
  const style = _.defaults({}, props.style, {lineHeight, fontSize, color});

  return <div className="mayan-numeral-zero" style={style}>
    {symbol || '\u2205'}
  </div>;
};

const MayaNumeralDots = (props) => {
  const {count, symbol, size, color} = props;
  const fontSize = size + 'px';
  const lineHeight = Math.ceil(size * .5) + 'px';
  const style = _.defaults({}, props.style, {lineHeight, fontSize, color});

  return <div className="mayan-numeral-dots" style={style}>
    {_.times(count, _.constant(symbol || '\u2022')).join('')}
  </div>;
};

const MayaNumeralBar = (props) => {
  const {size, color} = props;
  const style = _.defaults({}, props.style, {
    width: size * 2,
    borderBottom: `${Math.ceil(size / 4)}px solid ${color}`,
    margin: `${Math.ceil(size / 12)}px auto`
  });

  return <div className="mayan-numeral-bar" style={style}></div>;
};

const MayaNumeralDigit = (props) => {
  const {value, i, size, color, dotSymbol, zeroSymbol, styles} = props;
  const dots = Math.round(((value / 5) % 1) * 5);
  const bars = Math.floor(value / 5);
  const style = _.defaults({}, styles.digit, {
    marginTop: (i == 0) ? 0 : `${Math.ceil(size / 2)}px`
  });

  const children = (value === 0) ?
    <MayaNumeralZero {...{symbol: zeroSymbol, size, color}} /> :
    [
      <MayaNumeralDots {...{count: dots, symbol: dotSymbol, size, color, style: styles.dots}} />,
      _.times(bars, () => <MayaNumeralBar {...{size, color, style: styles.bar}} />)
    ];

  return <div className="mayan-numeral-digit" style={style}>{children}</div>;
};

export default class MayaNumeral extends React.Component {
  static propTypes = {
    value: React.PropTypes.number.isRequired,
    size: React.PropTypes.number,
    color: React.PropTypes.string,
    dotSymbol: React.PropTypes.string,
    zeroSymbol: React.PropTypes.string,
    styles: React.PropTypes.object
  };
  static defaultProps = {
    size: 10,
    color: 'black',
    dotSymbol: '\u2022',
    zeroSymbol: '\u2205',
    styles: {}
  };

  render() {
    // merge in the custom inline styles object prop (see defaultStyles for structure)
    const styles = _.defaultsDeep({}, this.props.styles, defaultStyles);
    // convert value to positive integer, then to base 20 string
    const base20String = Math.abs(Math.floor(this.props.value)).toString(20);

    return <div style={styles.container}>
      {base20String.split('').map((base20Digit, i) => {
        // render each base 20 digit
        const digit = parseInt(base20Digit, 20);
        return <MayaNumeralDigit {...this.props} {...{value: digit, i, styles}} />;
      })}
    </div>;
  }
}
