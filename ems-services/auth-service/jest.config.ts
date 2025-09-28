/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type {Config} from 'jest';

const config: Config = {
    preset: 'ts-jest',
    clearMocks: true,
    collectCoverage: true,
    verbose: true,
    coverageDirectory: "coverage",
    coveragePathIgnorePatterns: [
        "/node_modules/",
        "/tests/",
        "/generated/",
        "/generated/prisma/"
    ],
    coverageProvider: "v8",
    moduleDirectories: ["node_modules", "src"],
    setupFiles: ["<rootDir>/src/test/env-setup.ts"],
    setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
};

export default config;
