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
import { HttpStatus, getBaseUri, logger, mimeConfig } from '../../shared';
import {
    KundeNotExistsError,
    KundeService,
    ValidationError,
    VersionInvalidError,
    VornameExistsError,
} from '../service';
import type { Request, Response } from 'express';
import JSON5 from 'json5';
import type { KundeData } from '../entity/types';

// export bei async und await:
// https://blogs.msdn.microsoft.com/typescript/2015/11/30/announcing-typescript-1-7
// http://tc39.github.io/ecmascript-export
// https://nemethgergely.com/async-function-best-practices#Using-async-functions-with-express

export class KundeRequestHandler {
    // Dependency Injection ggf. durch
    // * Awilix https://github.com/jeffijoe/awilix
    // * InversifyJS https://github.com/inversify/InversifyJS
    // * Node Dependency Injection https://github.com/zazoomauro/node-dependency-injection
    // * BottleJS https://github.com/young-steveo/bottlejs
    private readonly service = new KundeService();

    // vgl Kotlin: Schluesselwort "suspend"
    async findById(req: Request, res: Response) {
        const versionHeader = req.header('If-None-Match');
        logger.debug(
            `KundeRequestHandler.findById(): versionHeader=${versionHeader}`,
        );
        const { id } = req.params;
        logger.debug(`KundeRequestHandler.findById(): id=${id}`);

        let kunde: KundeData | undefined;
        try {
            // vgl. Kotlin: Aufruf einer suspend-Function
            kunde = await this.service.findById(id);
        } catch (err) {
            // Exception einer export async function bei der Ausfuehrung fangen:
            // https://strongloop.com/strongblog/comparing-node-js-promises-trycatch-zone-js-angular
            logger.error(
                `KundeRequestHandler.findById(): error=${JSON5.stringify(err)}`,
            );
            res.sendStatus(HttpStatus.INTERNAL_ERROR);
            return;
        }

        if (kunde === undefined) {
            logger.debug('KundeRequestHandler.findById(): status=NOT_FOUND');
            res.sendStatus(HttpStatus.NOT_FOUND);
            return;
        }

        logger.debug(
            `KundeRequestHandler.findById(): kunde=${JSON5.stringify(kunde)}`,
        );
        const versionDb = kunde.__v;
        if (versionHeader === `"${versionDb}"`) {
            res.sendStatus(HttpStatus.NOT_MODIFIED);
            return;
        }
        logger.debug(`KundeRequestHandler.findById(): VersionDb=${versionDb}`);
        res.header('ETag', `"${versionDb}"`);

        const baseUri = getBaseUri(req);
        // HATEOAS: Atom Links
        kunde._links = {
            self: { href: `${baseUri}/${id}` },
            list: { href: `${baseUri}` },
            add: { href: `${baseUri}` },
            update: { href: `${baseUri}/${id}` },
            remove: { href: `${baseUri}/${id}` },
        };
        res.json(kunde);
    }

    async find(req: Request, res: Response) {
        // z.B. https://.../kunde?vorname=Alpha
        const { query } = req;
        logger.debug(
            `KundeRequestHandler.find(): queryParams=${JSON5.stringify(query)}`,
        );

        let kunden: Array<KundeData>;
        try {
            kunden = await this.service.find(query);
        } catch (err) {
            logger.error(
                `KundeRequestHandler.find(): error=${JSON5.stringify(err)}`,
            );
            res.sendStatus(HttpStatus.INTERNAL_ERROR);
            return;
        }

        logger.debug(
            `KundeRequestHandler.find(): kunden=${JSON5.stringify(kunden)}`,
        );
        if (kunden.length === 0) {
            // Alternative: https://www.npmjs.com/package/http-errors
            // Damit wird aber auch der Stacktrace zum Client
            // uebertragen, weil das resultierende Fehlerobjekt
            // von Error abgeleitet ist.
            logger.debug('KundeRequestHandler.find(): status = NOT_FOUND');
            res.sendStatus(HttpStatus.NOT_FOUND);
            return;
        }

        const baseUri = getBaseUri(req);

        // asynchrone for-of Schleife statt synchrones kunden.map()
        for await (const kunde of kunden) {
            // HATEOAS: Atom Links je Kunde
            kunde._links = { self: { href: `${baseUri}/${kunde._id}` } };
        }

        logger.debug(
            `KundeRequestHandler.find(): kunden=${JSON5.stringify(kunden)}`,
        );
        res.json(kunden);
    }

    async create(req: Request, res: Response) {
        const contentType = req.header(mimeConfig.contentType);
        if (
            // Optional Chaining
            contentType?.toLowerCase() !== mimeConfig.json
        ) {
            logger.debug('KundeRequestHandler.create() status=NOT_ACCEPTABLE');
            res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            return;
        }

        const kundeData = req.body;
        logger.debug(
            `KundeRequestHandler.create(): body=${JSON5.stringify(kundeData)}`,
        );

        let kundeSaved: KundeData;
        try {
            kundeSaved = await this.service.create(kundeData);
        } catch (err) {
            this.handleCreateError(err, res);
            return;
        }

        const location = `${getBaseUri(req)}/${kundeSaved._id}`;
        logger.debug(`KundeRequestHandler.create(): location=${location}`);
        res.location(location);
        res.sendStatus(HttpStatus.CREATED);
    }

    // eslint-disable-next-line max-lines-per-function
    async update(req: Request, res: Response) {
        const { id } = req.params;
        logger.debug(`KundeRequestHandler.update(): id=${id}`);

        const contentType = req.header(mimeConfig.contentType);
        if (contentType?.toLowerCase() !== mimeConfig.json) {
            res.status(HttpStatus.NOT_ACCEPTABLE);
            return;
        }
        const version = this.getVersionHeader(req, res);
        if (version === undefined) {
            return;
        }

        const kundeData = req.body;
        kundeData._id = id;
        logger.debug(
            `KundeRequestHandler.update(): kunde=${JSON5.stringify(kundeData)}`,
        );

        let result: KundeData;
        try {
            result = await this.service.update(kundeData, version);
        } catch (err) {
            this.handleUpdateError(err, res);
            return;
        }

        logger.debug(
            `KundeRequestHandler.update(): result=${JSON5.stringify(result)}`,
        );
        res.sendStatus(HttpStatus.NO_CONTENT);
    }

    async delete(req: Request, res: Response) {
        const { id } = req.params;
        logger.debug(`KundeRequestHandler.delete(): id=${id}`);

        try {
            await this.service.delete(id);
        } catch (err) {
            logger.error(
                `KundeRequestHandler.delete(): error=${JSON5.stringify(err)}`,
            );
            res.sendStatus(HttpStatus.INTERNAL_ERROR);
            return;
        }

        logger.debug('KundeRequestHandler.delete(): NO_CONTENT');
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
                `KundeRequestHandler.handleCreateError(): err.name=${name}, message=${message}`,
            );
            res.status(HttpStatus.BAD_REQUEST)
                .set('Content-Type', 'application/json')
                .send(message);
            return;
        }

        if (err instanceof VornameExistsError) {
            const { name, message } = err;
            logger.debug(
                `KundeRequestHandler.handleCreateError(): err.name=${name}, message=${message}`,
            );
            res.status(HttpStatus.BAD_REQUEST)
                .set('Content-Type', 'text/plain')
                .send(message);
            return;
        }

        logger.error(
            `KundeRequestHandler.handleCreateError(): error=${JSON5.stringify(
                err,
            )}`,
        );
        res.sendStatus(HttpStatus.INTERNAL_ERROR);
    }

    private getVersionHeader(req: Request, res: Response) {
        const versionHeader = req.header('If-Match');
        logger.debug(
            `KundeRequestHandler.getVersionHeader() versionHeader=${versionHeader}`,
        );

        if (versionHeader === undefined) {
            const msg = 'Versionsnummer fehlt';
            logger.debug(
                `KundeRequestHandler.getVersionHeader(): status=428, message=${msg}`,
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
                `KundeRequestHandler.getVersionHeader(): status=412, message=${msg}`,
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
            err instanceof KundeNotExistsError ||
            err instanceof VornameExistsError
        ) {
            const { name, message } = err;
            logger.debug(
                `KundeRequestHandler.handleUpdateError(): err.name=${name}, message=${message}`,
            );
            res.status(HttpStatus.PRECONDITION_FAILED)
                .set('Content-Type', 'text/plain')
                .send(message);
            return;
        }

        if (err instanceof ValidationError) {
            const { name, message } = err;
            logger.debug(
                `KundeRequestHandler.handleUpdateError(): err.name=${name}, message=${message}`,
            );
            res.status(HttpStatus.BAD_REQUEST)
                .set('Content-Type', 'application/json')
                .send(message);
            return;
        }

        logger.error(
            `KundeRequestHandler.handleUpdateError(): error=${JSON5.stringify(
                err,
            )}`,
        );
        res.sendStatus(HttpStatus.INTERNAL_ERROR);
    }
}
