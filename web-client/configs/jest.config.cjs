module.exports = {
  rootDir: "..",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/configs/jest/setupTests.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": "<rootDir>/configs/jest/tsJestTransformer.cjs"
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss)$": "<rootDir>/configs/jest/styleMock.cjs",
    "\\.(svg|png|jpg|jpeg|gif)$": "<rootDir>/configs/jest/fileMock.cjs"
  }
};
