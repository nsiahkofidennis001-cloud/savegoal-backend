module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
    coverageDirectory: 'coverage',
    verbose: true,
};
