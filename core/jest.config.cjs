module.exports = {
  preset: "ts-jest/presets/default-esm",
  roots: [
    "<rootDir>/src"
  ],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", {
      tsconfig: "<rootDir>/tsconfig.jest.json",
      useESM: true
    }]
  },
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.ts"
  ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  verbose: true,
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "**/*.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/__tests__/**"
  ]
};
