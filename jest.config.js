export default {
  testEnvironment: "node",
  testPathIgnorePatterns: ["/dist/"],
  transformIgnorePatterns: [
    "node_modules/(?!better-auth)/"
  ],
  testMatch: [
    "<rootDir>/tests/**/*.test.ts"
  ],
  transform: {
    "^.+\\.(t|j|mj)sx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "Node"
        },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)$": "<rootDir>/src/$1"
  },
};