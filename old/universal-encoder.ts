import { uniq } from "lodash";

enum PresetName {
  binary = "binary",
  decimal = "decimal",
  base16 = "base16",
  base32 = "base32",
  base32hex = "base32hex",
  base64 = "base64",
  base64url = "base64url"
}

export class BaseConverter {
  protected inputSymbols: string | null;
  protected inputBase: number | null;
  protected inputPreset: string | null;

  protected outputSymbols: string | null;
  protected outputBase: number | null;
  protected outputPreset: string | null;

  protected symbolPresets: { [s in PresetName]: { symbols: string; base: number } };

  protected statusStrings: { [k: string]: string };

  constructor() {
    this.inputSymbols = null;
    this.inputBase = null;
    this.inputPreset = null;

    this.outputSymbols = null;
    this.outputBase = null;
    this.outputPreset = null;

    // based on RFC4648
    this.symbolPresets = {
      [PresetName.binary]: {
        symbols: "01",
        base: 2
      },
      [PresetName.decimal]: {
        symbols: "0123456789",
        base: 10
      },
      [PresetName.base16]: {
        symbols: "0123456789ABCDEF",
        base: 16
      },
      [PresetName.base32]: {
        symbols: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
        base: 32
      },
      [PresetName.base32hex]: {
        symbols: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
        base: 32
      },
      [PresetName.base64]: {
        symbols: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
        base: 64
      },
      [PresetName.base64url]: {
        symbols: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
        base: 64
      }
    };

    this.statusStrings = {
      no_errors: "Values are safe",
      unsafe_symbols_type: "Symbols must be set to a string value",
      unsafe_base_type: "Base must be an integer",
      unsafe_symbol_len: "Length of symbols must be equal to or grater than base",
      dupe_symbol_values: "Symbols must not be repeated",
      no_preset: "Preset does not exist",
      safe_base_value: "Base must be greater than zero and less than " + Number.MAX_SAFE_INTEGER,
      invalid_input: "Unknown symbol in input",
      input_too_large: "Input value too large to convert"
    };
  }

  setInputPreset(preset: string): BaseConverter {
    this.inputPreset = preset;
    return this;
  }

  setOutputPreset(preset: string): BaseConverter {
    this.outputPreset = preset;
    return this;
  }

  setInputSymbols(symbols: string): BaseConverter {
    this.inputPreset = null;
    this.inputSymbols = symbols;
    return this;
  }

  setOutputSymbols(symbols: string): BaseConverter {
    this.outputPreset = null;
    this.outputSymbols = symbols;
    return this;
  }

  setInputBase(base: number): BaseConverter {
    this.inputPreset = null;
    this.inputBase = base;
    return this;
  }

  setOutputBase(base: number): BaseConverter {
    this.outputPreset = null;
    this.outputBase = base;
    return this;
  }

  prepAndGetStatus(value: string | null = null) {
    if (this.inputPreset) {
      if (!this.symbolPresets[this.inputPreset]) return this.statusStrings.no_preset;
      this.inputBase = this.symbolPresets[this.inputPreset].base;
      this.inputSymbols = this.symbolPresets[this.inputPreset].symbols;
    }
    if (this.outputPreset) {
      if (!this.symbolPresets[this.outputPreset]) return this.statusStrings.no_preset;
      this.outputBase = this.symbolPresets[this.outputPreset].base;
      this.outputSymbols = this.symbolPresets[this.outputPreset].symbols;
    }

    var safe_base_type = typeof this.inputBase === "number" && typeof this.outputBase === "number";
    if (!safe_base_type) return this.statusStrings.unsafe_base_type;
    const inputBase = this.inputBase as number;
    const outputBase = this.outputBase as number;

    var safe_base_value =
      inputBase > 0 &&
      inputBase < Number.MAX_SAFE_INTEGER &&
      outputBase > 0 &&
      outputBase < Number.MAX_SAFE_INTEGER;
    if (!safe_base_value) return this.statusStrings.unsafe_base_type;

    var safe_symbols_type =
      typeof this.inputSymbols === "string" && typeof this.outputSymbols === "string";
    if (!safe_symbols_type) return this.statusStrings.unsafe_symbols_type;
    const inputSymbols = this.inputSymbols as string;
    const outputSymbols = this.outputSymbols as string;

    var safe_symbol_len = inputBase >= inputSymbols.length && outputBase >= outputSymbols.length;
    if (!safe_symbol_len) return this.statusStrings.unsafe_symbol_len;

    var nondupe_symbol_values =
      uniq(inputSymbols.split("")).length === inputSymbols.length &&
      uniq(outputSymbols.split("")).length === outputSymbols.length;
    if (!nondupe_symbol_values) return this.statusStrings.dupe_symbol_values;
    if (value) {
      value = "" + value;
      for (let i = 0, l = value.length; i < l; i++) {
        if (!~inputSymbols.indexOf(value[i])) return this.statusStrings.invalid_input;
      }
    }
    return this.statusStrings.no_errors;
  }

  convert(numberValue: number | string): string {
    let value: string = "" + numberValue;
    var status = this.prepAndGetStatus(value);
    if (status !== this.statusStrings.no_errors) throw new Error(status);

    const inputSymbols = this.inputSymbols as string;
    const inputBase = this.inputBase as number;
    const outputSymbols = this.outputSymbols as string;
    const outputBase = this.outputBase as number;

    var dec_value = value
      .split("")
      .reverse()
      .reduce((carry, digit, index) => {
        return (carry += inputSymbols.indexOf(digit) * Math.pow(inputBase, index));
      }, 0);

    if (dec_value > Number.MAX_SAFE_INTEGER) throw new Error(this.statusStrings.input_too_large);

    var new_value = "";
    while (dec_value > 0) {
      new_value = outputSymbols[dec_value % outputBase] + new_value;
      dec_value = (dec_value - (dec_value % outputBase)) / outputBase;
    }

    return new_value;
  }

  generateHelper(): (s: number | string) => string {
    return this.convert.bind(this);
  }
}

export class ASCIIEncoder extends BaseConverter {
  private pad_char: string;

  constructor() {
    super();
    this.setInputPreset(PresetName.binary);
    this.pad_char = "=";
  }

  setPadChar(char: string) {
    this.pad_char = char.toString().charAt(0);
    return this;
  }

  encode(ascii: string) {
    var binary = asciiToBinary(ascii);
    var status = this.prepAndGetStatus(binary);
    if (status !== this.statusStrings.no_errors) throw new Error(status);

    const outputSymbols = this.outputSymbols as string;
    const outputBase = this.outputBase as number;

    var bits_per_char = (outputBase - 1).toString(2).length;
    var bit_grp_size = leastCommonMultiple(bits_per_char, 8);
    var encoded = [];
    for (var i = 0, l = binary.length; i < l; i += bits_per_char) {
      encoded.push(
        outputSymbols.charAt(
          parseInt(padEnd(binary.substring(i, i + bits_per_char), bits_per_char, "0"), 2)
        )
      );
    }
    var padlen = ((encoded.length * bits_per_char) % bit_grp_size) / bits_per_char;
    encoded.push(this.pad_char.repeat(padlen));
    return encoded.join("");
  }

  decode(str: string) {
    var status = this.prepAndGetStatus();
    if (status !== this.statusStrings.no_errors) throw new Error(status);

    const outputSymbols = this.outputSymbols as string;
    const outputBase = this.outputBase as number;

    var bits_per_char = (outputBase - 1).toString(2).length;
    var binary = [];
    for (var i = 0, l = str.length; i < l; i++) {
      if (this.pad_char !== str.charAt(i)) {
        binary.push(padStart(outputSymbols.indexOf(str.charAt(i)).toString(2), bits_per_char, "0"));
      }
    }
    let binaryStr: string = binary.join("");
    binaryStr = binaryStr.substring(0, binary.length - (binary.length % 8));
    return binaryToASCII(binaryStr);
  }

  generateEncoder() {
    return this.encode.bind(this);
  }

  generateDecoder() {
    return this.decode.bind(this);
  }
}

function asciiToBinary(ascii: string): string {
  let bytes = [];
  for (let i = 0, l = ascii.length; i < l; i++) {
    bytes.push(padStart(ascii.charCodeAt(i).toString(2), 8, "0"));
  }
  return bytes.join("");
}

function binaryToASCII(binary: string) {
  const ascii = [];
  for (let i = 0, l = binary.length; i < l; i += 8) {
    ascii.push(String.fromCharCode(parseInt(binary.substring(i, i + 8), 2)));
  }
  return ascii.join("");
}

function leastCommonMultiple(a: number, b: number) {
  if (!a || !b) return 0;
  var x = Math.abs(a);
  var y = Math.abs(b);
  while (y) {
    var t = y;
    y = x % y;
    x = t;
  }
  var gcd = x;
  return Math.abs((a * b) / gcd);
}

function padStart(str: string, targetLength: number, padString: string) {
  targetLength = Math.floor(targetLength) || 0;
  if (targetLength < str.length) return String(str);

  padString = padString ? String(padString) : " ";

  var pad = "";
  var len = targetLength - str.length;
  var i = 0;
  while (pad.length < len) {
    if (!padString[i]) {
      i = 0;
    }
    pad += padString[i];
    i++;
  }

  return pad + str;
}
function padEnd(str: string, targetLength: number, padString: string) {
  targetLength = Math.floor(targetLength) || 0;
  if (targetLength < str.length) str;

  padString = padString ? padString : " ";

  var pad = "";
  var len = targetLength - str.length;
  var i = 0;
  while (pad.length < len) {
    if (!padString[i]) {
      i = 0;
    }
    pad += padString[i];
    i++;
  }

  return str + pad;
}
