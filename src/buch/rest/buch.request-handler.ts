/* eslint-disable max-lines, no-underscore-dangle */

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

import {
    BuchNotExistsError,
    BuchService,
    IsbnExistsError,
    TitelExistsError,
    ValidationError,
    VersionInvalidError,
} from '../service';
import { HttpStatus, getBaseUri, logger, mimeConfig } from '../../shared';
import type { Request, Response } from 'express';
import type { BuchData } from '../entity/types';
import JSON5 from 'json5';

// export bei async und await:
// https://blogs.msdn.microsoft.com/typescript/2015/11/30/announcing-typescript-1-7
// http://tc39.github.io/ecmascript-export
// https://nemethgergely.com/async-function-best-practices#Using-async-functions-with-express

export class BuchRequestHandler {
    // Dependency Injection ggf. durch
    // * Awilix https://github.com/jeffijoe/awilix
    // * InversifyJS https://github.com/inversify/InversifyJS
    // * Node Dependency Injection https://github.com/zazoomauro/node-dependency-injection
    // * BottleJS https://github.com/young-steveo/bottlejs
    private readonly service = new BuchService();

    // vgl Kotlin: Schluesselwort "suspend"
    async findById(req: Request, res: Response) {
        const versionHeader = req.header('If-None-Match');
        logger.debug(
            `BuchRequestHandler.findById(): versionHeader=${versionHeader}`,
        );
        const { id } = req.params;
        logger.debug(`BuchRequestHandler.findById(): id=${id}`);

        let buch: BuchData | undefined;
        try {
            // vgl. Kotlin: Aufruf einer suspend-Function
            buch = await this.service.findById(id);
        } catch (err) {
            // Exception einer export async function bei der Ausfuehrung fangen:
            // https://strongloop.com/strongblog/comparing-node-js-promises-trycatch-zone-js-angular
            logger.error(
                `BuchRequestHandler.findById(): error=${JSON5.stringify(err)}`,
            );
            res.sendStatus(HttpStatus.INTERNAL_ERROR);
            return;
        }

        if (buch === undefined) {
            logger.debug('BuchRequestHandler.findById(): status=NOT_FOUND');
            res.sendStatus(HttpStatus.NOT_FOUND);
            return;
        }

        logger.debug(
            `BuchRequestHandler.findById(): buch=${JSON5.stringify(buch)}`,
        );
        const versionDb = buch.__v;
        if (versionHeader === `"${versionDb}"`) {
            res.sendStatus(HttpStatus.NOT_MODIFIED);
            return;
        }
        logger.debug(`BuchRequestHandler.findById(): VersionDb=${versionDb}`);
        res.header('ETag', `"${versionDb}"`);

        const baseUri = getBaseUri(req);
        // HATEOAS: Atom Links
        buch._links = {
            self: { href: `${baseUri}/${id}` },
            list: { href: `${baseUri}` },
            add: { href: `${baseUri}` },
            update: { href: `${baseUri}/${id}` },
            remove: { href: `${baseUri}/${id}` },
        };
        res.json(buch);
    }

    async find(req: Request, res: Response) {
        // z.B. https://.../buch?titel=Alpha
        const { query } = req;
        logger.debug(
            `BuchRequestHandler.find(): queryParams=${JSON5.stringify(query)}`,
        );

        let buecher: Array<BuchData>;
        try {
            buecher = await this.service.find(query);
        } catch (err) {
            logger.error(
                `BuchRequestHandler.find(): error=${JSON5.stringify(err)}`,
            );
            res.sendStatus(HttpStatus.INTERNAL_ERROR);
            return;
        }

        logger.debug(
            `BuchRequestHandler.find(): buecher=${JSON5.stringify(buecher)}`,
        );
        if (buecher.length === 0) {
            // Alternative: https://www.npmjs.com/package/http-errors
            // Damit wird aber auch der Stacktrace zum Client
            // uebertragen, weil das resultierende Fehlerobjekt
            // von Error abgeleitet ist.
            logger.debug('BuchRequestHandler.find(): status = NOT_FOUND');
            res.sendStatus(HttpStatus.NOT_FOUND);
            return;
        }

        const baseUri = getBaseUri(req);

        // asynchrone for-of Schleife statt synchrones buecher.map()
        for await (const buch of buecher) {
            // HATEOAS: Atom Links je Buch
            buch._links = { self: { href: `${baseUri}/${buch._id}` } };
        }

        logger.debug(
            `BuchRequestHandler.find(): buecher=${JSON5.stringify(buecher)}`,
        );
        res.json(buecher);
    }

    async create(req: Request, res: Response) {
        const contentType = req.header(mimeConfig.contentType);
        if (
            // Optional Chaining
            contentType?.toLowerCase() !== mimeConfig.json
        ) {
            logger.debug('BuchRequestHandler.create() status=NOT_ACCEPTABLE');
            res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            return;
        }

        const buchData = req.body;
        logger.debug(
            `BuchRequestHandler.create(): body=${JSON5.stringify(buchData)}`,
        );

        let buchSaved: BuchData;
        try {
            buchSaved = await this.service.create(buchData);
        } catch (err) {
            this.handleCreateError(err, res);
            return;
        }

        const location = `${getBaseUri(req)}/${buchSaved._id}`;
        logger.debug(`BuchRequestHandler.create(): location=${location}`);
        res.location(location);
        res.sendStatus(HttpStatus.CREATED);
    }

    // eslint-disable-next-line max-lines-per-function
    async update(req: Request, res: Response) {
        const { id } = req.params;
        logger.debug(`BuchRequestHandler.update(): id=${id}`);

        const contentType = req.header(mimeConfig.contentType);
        if (contentType?.toLowerCase() !== mimeConfig.json) {
            res.status(HttpStatus.NOT_ACCEPTABLE);
            return;
        }
        const version = this.getVersionHeader(req, res);
        if (version === undefined) {
            return;
        }

        const buchData = req.body;
        buchData._id = id;
        logger.debug(
            `BuchRequestHandler.update(): buch=${JSON5.stringify(buchData)}`,
        );

        let result: BuchData;
        try {
            result = await this.service.update(buchData, version);
        } catch (err) {
            this.handleUpdateError(err, res);
            return;
        }

        logger.debug(
            `BuchRequestHandler.update(): result=${JSON5.stringify(result)}`,
        );
        res.sendStatus(HttpStatus.NO_CONTENT);
    }

    async delete(req: Request, res: Response) {
        const { id } = req.params;
        logger.debug(`BuchRequestHandler.delete(): id=${id}`);

        try {
            await this.service.delete(id);
        } catch (err) {
            logger.error(
                `BuchRequestHandler.delete(): error=${JSON5.stringify(err)}`,
            );
            res.sendStatus(HttpStatus.INTERNAL_ERROR);
            return;
        }

        logger.debug('BuchRequestHandler.delete(): NO_CONTENT');
        res.sendStatus(HttpStatus.NO_CONTENT);
    }

    // any ist ein "universal supertype", d.h. Basisklasse wie z.B. Object bei
    // Java oder Any bei Kotlin, aber auch die Moeglichkeit, Funktionen mi
    // irgendwelchen Namen aufzurufen oder auf Properties mit irgendwelchen
    // Namen zuzugreifen
    private handleCreateError(err: any, res: Response) {
        if (err instanceof ValidationError) {
            const { name, message } = err;
            logger.debug(
                `BuchRequestHandler.handleCreateError(): err.name=${name}, message=${message}`,
            );
            res.status(HttpStatus.BAD_REQUEST)
                .set('Content-Type', 'application/json')
                .send(message);
            return;
        }

        if (err instanceof TitelExistsError || err instanceof IsbnExistsError) {
            const { name, message } = err;
            logger.debug(
                `BuchRequestHandler.handleCreateError(): err.name=${name}, message=${message}`,
            );
            res.status(HttpStatus.BAD_REQUEST)
                .set('Content-Type', 'text/plain')
                .send(message);
            return;
        }

        logger.error(
            `BuchRequestHandler.handleCreateError(): error=${JSON5.stringify(
                err,
            )}`,
        );
        res.sendStatus(HttpStatus.INTERNAL_ERROR);
    }

    private getVersionHeader(req: Request, res: Response) {
        const versionHeader = req.header('If-Match');
        logger.debug(
            `BuchRequestHandler.getVersionHeader() versionHeader=${versionHeader}`,
        );

        if (versionHeader === undefined) {
            const msg = 'Versionsnummer fehlt';
            logger.debug(
                `BuchRequestHandler.getVersionHeader(): status=428, message=${msg}`,
            );
            res.status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'text/plain')
                .send(msg);
            return;
        }

        const { length } = versionHeader;
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        if (length < 3) {
            const msg = `Ungueltige Versionsnummer: ${versionHeader}`;
            logger.debug(
                `BuchRequestHandler.getVersionHeader(): status=412, message=${msg}`,
            );
            res.status(HttpStatus.PRECONDITION_FAILED)
                .set('Content-Type', 'text/plain')
                .send(msg);
            return;
        }

        // slice: einschl. Start, ausschl. Ende
        return versionHeader.slice(1, -1);
    }

    private handleUpdateError(err: any, res: Response) {
        if (
            err instanceof VersionInvalidError ||
            err instanceof BuchNotExistsError ||
            err instanceof TitelExistsError
        ) {
            const { name, message } = err;
            logger.debug(
                `BuchRequestHandler.handleUpdateError(): err.name=${name}, message=${message}`,
            );
            res.status(HttpStatus.PRECONDITION_FAILED)
                .set('Content-Type', 'text/plain')
                .send(message);
            return;
        }

        if (err instanceof ValidationError) {
            const { name, message } = err;
            logger.debug(
                `BuchRequestHandler.handleUpdateError(): err.name=${name}, message=${message}`,
            );
            res.status(HttpStatus.BAD_REQUEST)
                .set('Content-Type', 'application/json')
                .send(message);
            return;
        }

        logger.error(
            `BuchRequestHandler.handleUpdateError(): error=${JSON5.stringify(
                err,
            )}`,
        );
        res.sendStatus(HttpStatus.INTERNAL_ERROR);
    }
}
