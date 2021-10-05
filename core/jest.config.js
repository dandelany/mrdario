module.exports = {
  roots: [
    "<rootDir>/src"
  ],
  transform: {
    "^.+\\.(t|j)sx?$": "ts-jest"
  },
  verbose: true,
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "**/*.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/__tests__/**"
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true
    },
  },

  // collectCoverage: true
};