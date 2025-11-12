const {createDefaultPreset} = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
    testEnvironment: "node",
    preset: 'ts-jest',
    testTimeout: 30000,
    transform: {
        ...tsJestTransformCfg,
    },
    testPathIgnorePatterns: ["/dist/"],
    reporters: [
        "default",
        ["jest-html-reporter", {
            "outputPath": "reports/report.html"
        }]
    ],
};

