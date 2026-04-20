const { default: tsJest } = require("ts-jest");
const path = require("path");

module.exports = {
  createTransformer: () =>
    tsJest.createTransformer({
      diagnostics: false,
      tsconfig: path.join(__dirname, "../../tsconfig.jest.json")
    })
};
