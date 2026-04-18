module.exports = {
  roots: [
    "<rootDir>/src"
  ],
  globalSetup: "<rootDir>/configs/jest.globalSetup.cjs",
  globalTeardown: "<rootDir>/configs/jest.globalTeardown.cjs",
  setupFilesAfterEnv: [
    "<rootDir>/configs/jest.setupAfterEnv.cjs"
  ],
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: "<rootDir>/tsconfig.jest.json"
    }]
  },
  verbose: true,
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "**/*.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/__tests__/**"
  ],

  // collectCoverage: true
};
