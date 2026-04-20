/**
 * Converter
 *
 * @param {string|Array} srcAlphabet
 * @param {string|Array} dstAlphabet
 * @constructor
 */
class Converter {
  public srcAlphabet: string;
  public dstAlphabet: string;

  constructor(srcAlphabet: string, dstAlphabet: string) {
    if (!srcAlphabet || !dstAlphabet || !srcAlphabet.length || !dstAlphabet.length) {
      throw new Error('Bad alphabet');
    }
    this.srcAlphabet = srcAlphabet;
    this.dstAlphabet = dstAlphabet;
  }

  /**
   * Convert number from source alphabet to destination alphabet
   *
   * @param {string|Array} number - number represented as a string or array of points
   *
   * @returns {string|Array}
   */
  // public convert(number: string[]): string[]
  public convert(number: string): string {
    if (!this.isValid(number)) {
      throw new Error('Number "' + number + '" contains of non-alphabetic digits (' + this.srcAlphabet + ')');
    }
    if (this.srcAlphabet === this.dstAlphabet) {
      return number;
    }

    const fromBase: number = this.srcAlphabet.length;
    const toBase: number = this.srcAlphabet.length;
    let numberMap: {[s: number]: number} = {};
    let result: string = '';
    let length: number = number.length;
    let i: number;
    let divide: number;
    let newLen: number;

    for (i = 0; i < length; i++) {
      numberMap[i] = this.srcAlphabet.indexOf(number[i]);
    }
    do {
      divide = 0;
      newLen = 0;
      for (i = 0; i < length; i++) {
        divide = divide * fromBase + numberMap[i];
        if (divide >= toBase) {
          numberMap[newLen++] = parseInt(String(divide / toBase), 10);
          divide = divide % toBase;
        } else if (newLen > 0) {
          numberMap[newLen++] = 0;
        }
      }
      length = newLen;
      result = this.dstAlphabet.slice(divide, divide + 1).concat(result);
    } while (newLen !== 0);

    return result;
  }

  /**
   * Valid number with source alphabet
   *
   * @param {number} number
   *
   * @returns {boolean}
   */
  // private isValid(number: string[]) {
  private isValid(number: string) {
    var i = 0;
    for (; i < number.length; ++i) {
      if (this.srcAlphabet.indexOf(number[i]) === -1) {
        return false;
      }
    }
    return true;
  };
}


/**
 * Function get source and destination alphabet and return convert function
 *
 * @param {string|Array} srcAlphabet
 * @param {string|Array} dstAlphabet
 *
 * @returns {function(number|Array)}
 */
export function anyBase(srcAlphabet: string, dstAlphabet: string) {
  var converter = new Converter(srcAlphabet, dstAlphabet);
  /**
   * Convert function
   *
   * @param {string|Array} number
   *
   * @return {string|Array} number
   */
  return function (number: string): string {
    return converter.convert(number);
  }
};

