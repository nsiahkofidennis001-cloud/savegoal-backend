export default {
  testEnvironment: "node",
  testPathIgnorePatterns: ["/dist/"],
  transformIgnorePatterns: [
    "node_modules/(?!(better-auth|@better-auth|better-call|@better-call)/)"
  ],
  testMatch: [
    "<rootDir>/tests/**/*.test.ts"
  ],
  transform: {
    "^.+\\.(t|j|mj)sx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  extensionsToTreatAsEsm: [".ts"],
};