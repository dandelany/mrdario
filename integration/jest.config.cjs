module.exports = {
  roots: [
    "<rootDir>/lib"
  ],
  globalSetup: "<rootDir>/configs/jest.globalSetup.cjs",
  globalTeardown: "<rootDir>/configs/jest.globalTeardown.cjs",
  setupFilesAfterEnv: [
    "<rootDir>/configs/jest.setupAfterEnv.cjs"
  ],
  verbose: true,
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "**/*.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/__tests__/**"
  ],
};
