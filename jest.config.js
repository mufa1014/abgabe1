/*
 * Copyright (C) 2020 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// https://jestjs.io/docs/en/configuration
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',

    bail: true,
    collectCoverageFrom: ['**/*.ts', '!src/index.ts'],
    // default: ["/node_modules/"]
    coveragePathIgnorePatterns: [
        '<rootDir>/.nyc_output/',
        '<rootDir>/.vscode/',
        '<rootDir>/build/',
        '<rootDir>/config/',
        '<rootDir>/coverage/',
        '<rootDir>/dist/',
        '<rootDir>/node_modules/',
        '<rootDir>/scripts/',
        '<rootDir>/temp/',
        '<rootDir>/src/buch/service/mock/',
        '<rootDir>/src/buch/graphql',
        '<rootDir>/src/buch/html',
    ],
    coverageReporters: ['text-summary', 'html'],
    errorOnDeprecated: true,
    verbose: true,
};
