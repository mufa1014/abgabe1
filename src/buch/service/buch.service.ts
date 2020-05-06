/* eslint-disable max-lines */
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

import type { Buch, BuchData } from '../entity/types';
import { BuchModel, validateBuch } from '../entity';
import {
    BuchNotExistsError,
    IsbnExistsError,
    TitelExistsError,
    ValidationError,
    VersionInvalidError,
} from './exceptions';
import { dbConfig, logger } from '../../shared';
import { BuchServiceMock } from './mock';
import type { Document } from 'mongoose';
import JSON5 from 'json5';
import { startSession } from 'mongoose';
// UUID v4: random
// https://github.com/uuidjs/uuid
import { v4 as uuid } from 'uuid';

const { mockDB } = dbConfig;

// API-Dokumentation zu mongoose:
// http://mongoosejs.com/docs/api.html
// https://github.com/Automattic/mongoose/issues/3949

/* eslint-disable require-await, no-null/no-null */
export class BuchService {
    private readonly mock: BuchServiceMock | undefined;

    constructor() {
        if (mockDB) {
            this.mock = new BuchServiceMock();
        }
    }

    // Status eines Promise:
    // Pending: das Resultat gibt es noch nicht, weil die asynchrone Operation,
    //          die das Resultat liefert, noch nicht abgeschlossen ist
    // Fulfilled: die asynchrone Operation ist abgeschlossen und
    //            das Promise-Objekt hat einen Wert
    // Rejected: die asynchrone Operation ist fehlgeschlagen and das
    //           Promise-Objekt wird nicht den Status "fulfilled" erreichen.
    //           Stattdessen ist im Promise-Objekt die Fehlerursache enthalten.

    async findById(id: string) {
        if (this.mock !== undefined) {
            return this.mock.findById(id);
        }
        logger.debug(`BuchService.findById(): id= ${id}`);

        // ein Buch zur gegebenen ID asynchron suchen
        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        // null falls nicht gefunden
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
        return BuchModel.findById(id)
            .lean<BuchData>()
            .then(buch => buch ?? undefined);
    }

    async find(query?: any) {
        if (this.mock !== undefined) {
            return this.mock.find(query);
        }

        logger.debug(`BuchService.find(): query=${JSON5.stringify(query)}`);
        const tmpQuery = BuchModel.find().lean<BuchData>();

        // alle Buecher asynchron suchen u. aufsteigend nach titel sortieren
        // nach _id sortieren: Timestamp des INSERTs (Basis: Sek)
        // https://docs.mongodb.org/manual/reference/object-id
        if (query === undefined || Object.entries(query).length === 0) {
            // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
            return tmpQuery.sort('titel').lean<BuchData>();
        }

        const { titel, javascript, typescript, ...dbQuery } = query;

        // Buecher zur Query (= JSON-Objekt durch Express) asynchron suchen
        if (titel !== undefined) {
            // Titel in der Query: Teilstring des Titels,
            // d.h. "LIKE" als regulaerer Ausdruck
            // 'i': keine Unterscheidung zw. Gross- u. Kleinschreibung
            // NICHT /.../, weil das Muster variabel sein muss
            // CAVEAT: KEINE SEHR LANGEN Strings wg. regulaerem Ausdruck
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            if (titel.length < 20) {
                dbQuery.titel = new RegExp(titel, 'iu'); // eslint-disable-line security/detect-non-literal-regexp
            }
        }

        // z.B. {javascript: true, typescript: true}
        const schlagwoerter = [];
        if (javascript === 'true') {
            schlagwoerter.push('JAVASCRIPT');
        }
        if (typescript === 'true') {
            schlagwoerter.push('TYPESCRIPT');
        }
        if (schlagwoerter.length === 0) {
            delete dbQuery.schlagwoerter;
        } else {
            dbQuery.schlagwoerter = schlagwoerter;
        }

        logger.debug(`BuchService.find(): dbQuery=${JSON5.stringify(dbQuery)}`);

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        // leeres Array, falls nichts gefunden wird
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
        return BuchModel.find(dbQuery).lean<BuchData>();
        // Buch.findOne(query), falls das Suchkriterium eindeutig ist
        // bei findOne(query) wird null zurueckgeliefert, falls nichts gefunden
    }

    // eslint-disable-next-line max-statements,max-lines-per-function
    async create(buchData: Buch) {
        if (this.mock !== undefined) {
            return this.mock.create(buchData);
        }

        // Das gegebene Buch innerhalb von save() asynchron neu anlegen:
        // Promise.reject(err) bei Verletzung von DB-Constraints, z.B. unique

        const buch = new BuchModel(buchData);
        const errorMsg = validateBuch(buch);
        if (errorMsg !== undefined) {
            logger.debug(
                `BuchService.create(): Validation Message: ${JSON5.stringify(
                    errorMsg,
                )}`,
            );
            // Promise<void> als Rueckgabewert
            // Eine von Error abgeleitete Klasse hat die Property "message"
            return Promise.reject(new ValidationError(errorMsg));
        }

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        const { titel } = buchData;
        let tmp = await BuchModel.findOne({ titel }).lean<BuchData>();
        if (tmp !== null) {
            // Promise<void> als Rueckgabewert
            // Eine von Error abgeleitete Klasse hat die Property "message"
            return Promise.reject(
                new TitelExistsError(`Der Titel "${titel}" existiert bereits.`),
            );
        }

        const { isbn } = buchData;
        tmp = await BuchModel.findOne({ isbn }).lean<BuchData>();
        if (tmp !== null) {
            return Promise.reject(
                new IsbnExistsError(
                    `Die ISBN-Nr. "${isbn}" existiert bereits.`,
                ),
            );
        }

        buch._id = uuid(); // eslint-disable-line require-atomic-updates

        let buchSaved!: Document;
        // https://www.mongodb.com/blog/post/quick-start-nodejs--mongodb--how-to-implement-transactions
        const session = await startSession();
        try {
            await session.withTransaction(async () => {
                buchSaved = await buch.save();
            });
        } catch (err) {
            logger.error(
                `BuchService.create(): Die Transaktion wurde abgebrochen: ${JSON5.stringify(
                    err,
                )}`,
            );
            // TODO Weitere Fehlerbehandlung bei Rollback
        } finally {
            session.endSession();
        }
        const buchDataSaved: BuchData = buchSaved.toObject();
        logger.debug(
            `BuchService.create(): buchDataSaved=${JSON5.stringify(
                buchDataSaved,
            )}`,
        );

        // TODO Email senden

        return buchDataSaved;
    }

    // eslint-disable-next-line max-lines-per-function,max-statements
    async update(buchData: Buch, versionStr: string) {
        if (this.mock !== undefined) {
            return this.mock.update(buchData);
        }

        if (versionStr === undefined) {
            return Promise.reject(
                new VersionInvalidError('Die Versionsnummer fehlt'),
            );
        }
        const version = Number.parseInt(versionStr, 10);
        if (Number.isNaN(version)) {
            return Promise.reject(
                new VersionInvalidError('Die Versionsnummer ist ungueltig'),
            );
        }
        logger.debug(`BuchService.update(): version=${version}`);

        logger.debug(`BuchService.update(): buch=${JSON5.stringify(buchData)}`);
        const buch = new BuchModel(buchData);
        const err = validateBuch(buch);
        if (err !== undefined) {
            logger.debug(
                `BuchService.update(): Validation Message: ${JSON5.stringify(
                    err,
                )}`,
            );
            // Promise<void> als Rueckgabewert
            return Promise.reject(new ValidationError(err));
        }

        const { titel }: { titel: string } = buchData;
        const tmp = await BuchModel.findOne({ titel }).lean<BuchData>();
        if (tmp !== null && tmp._id !== buch._id) {
            return Promise.reject(
                new TitelExistsError(
                    `Der Titel "${titel}" existiert bereits bei ${
                        tmp._id as string
                    }.`,
                ),
            );
        }

        const buchDb = await BuchModel.findById(buch._id).lean<BuchData>();
        if (buchDb === null) {
            return Promise.reject(
                new BuchNotExistsError('Kein Buch mit der ID'),
            );
        }
        const versionDb = buchDb?.__v ?? 0;
        if (version < versionDb) {
            return Promise.reject(
                new VersionInvalidError(
                    `Die Versionsnummer ${version} ist nicht aktuell`,
                ),
            );
        }

        // findByIdAndReplace ersetzt ein Document mit ggf. weniger Properties
        const result = await BuchModel.findByIdAndUpdate(buch._id, buch).lean<
            BuchData
        >();
        if (result === null) {
            return Promise.reject(
                new VersionInvalidError(
                    `Kein Buch mit ID ${
                        buch._id as string
                    } und Version ${version}`,
                ),
            );
        }

        if (result.__v !== undefined) {
            result.__v++;
        }
        logger.debug(`BuchService.update(): result=${JSON5.stringify(result)}`);

        // Weitere Methoden von mongoose zum Aktualisieren:
        //    Buch.findOneAndUpdate(update)
        //    buch.update(bedingung)
        return Promise.resolve(result);
    }

    async delete(id: string) {
        if (this.mock !== undefined) {
            return this.mock.remove(id);
        }
        logger.debug(`BuchService.delete(): id=${id}`);

        // Das Buch zur gegebenen ID asynchron loeschen
        const { deletedCount } = await BuchModel.deleteOne({ _id: id });
        logger.debug(`BuchService.delete(): deletedCount=${deletedCount}`);
        return deletedCount !== undefined;

        // Weitere Methoden von mongoose, um zu loeschen:
        //  Buch.findByIdAndRemove(id)
        //  Buch.findOneAndRemove(bedingung)
    }
}
