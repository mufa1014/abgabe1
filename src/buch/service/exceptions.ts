/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
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

/* eslint-disable max-classes-per-file */

import type { ValidationErrorMsg } from './../entity/types';
import { logger } from '../../shared';

// http://stackoverflow.com/questions/1382107/whats-a-good-way-to-extend-error-in-javascript#answer-5251506
// https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Error

export class ValidationError extends Error {
    readonly name = 'ValidationError';
    readonly message!: string;
    // readonly code = 4711

    constructor(msg: ValidationErrorMsg) {
        super();
        // *NICHT* JSON5, damit der Client einen regulaeren JSON-Parser nutzen kann
        this.message = JSON.stringify(msg);
        logger.debug(`ValidationError.constructor(): ${this.message}`);
    }
}

export class TitelExistsError extends Error {
    readonly name = 'TitelExistsError';

    constructor(public readonly message: string) {
        super();
        logger.debug(`TitelExistsError.constructor(): ${message}`);
    }
}

export class IsbnExistsError extends Error {
    readonly name = 'IsbnExistsError';

    constructor(public readonly message: string) {
        super();
        logger.debug(`IsbnExistsError.constructor(): ${message}`);
    }
}

export class VersionInvalidError extends Error {
    readonly name = 'VersionInvalidError';

    constructor(public readonly message: string) {
        super();
        logger.debug(`VersionInvalidError.constructor(): ${message}`);
    }
}

export class BuchNotExistsError extends Error {
    readonly name = 'BuchNotExistsError';

    constructor(public readonly message: string) {
        super();
        logger.debug(`BuchNotExistsError.constructor(): ${message}`);
    }
}

export class FileNotFoundError extends Error {
    readonly name = 'FilenNotFoundError';

    constructor(public readonly message: string) {
        super();
        logger.debug(`FilenNotFoundError.constructor(): ${message}`);
    }
}

export class MultipleFilesError extends Error {
    readonly name = 'MultipleFilesError';

    constructor(public readonly message: string) {
        super();
        logger.debug(`MultipleFilesError.constructor(): ${message}`);
    }
}
