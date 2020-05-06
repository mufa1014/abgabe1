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

import {
    IsbnExistsError,
    KundeNotExistsError,
    TitelExistsError,
    ValidationError,
    VersionInvalidError,
} from './exceptions';
import type { Kunde, KundeData } from '../entity/types';
import { KundeModel, validateKunde } from '../entity';
import { dbConfig, logger } from '../../shared';
import type { Document } from 'mongoose';
import JSON5 from 'json5';
import { KundeServiceMock } from './mock';
import { startSession } from 'mongoose';
// UUID v4: random
// https://github.com/uuidjs/uuid
import { v4 as uuid } from 'uuid';

const { mockDB } = dbConfig;

// API-Dokumentation zu mongoose:
// http://mongoosejs.com/docs/api.html
// https://github.com/Automattic/mongoose/issues/3949

/* eslint-disable require-await, no-null/no-null */
export class KundeService {
    private readonly mock: KundeServiceMock | undefined;

    constructor() {
        if (mockDB) {
            this.mock = new KundeServiceMock();
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
        logger.debug(`KundeService.findById(): id= ${id}`);

        // ein Kunde zur gegebenen ID asynchron suchen
        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        // null falls nicht gefunden
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
        return KundeModel.findById(id)
            .lean<KundeData>()
            .then(kunde => kunde ?? undefined);
    }

    async find(query?: any) {
        if (this.mock !== undefined) {
            return this.mock.find(query);
        }

        logger.debug(`KundeService.find(): query=${JSON5.stringify(query)}`);
        const tmpQuery = KundeModel.find().lean<KundeData>();

        // alle Kunden asynchron suchen u. aufsteigend nach titel sortieren
        // nach _id sortieren: Timestamp des INSERTs (Basis: Sek)
        // https://docs.mongodb.org/manual/reference/object-id
        if (query === undefined || Object.entries(query).length === 0) {
            // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
            return tmpQuery.sort('titel').lean<KundeData>();
        }

        const { titel, javascript, typescript, ...dbQuery } = query;

        // Kunden zur Query (= JSON-Objekt durch Express) asynchron suchen
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
        // prettier-ignore
        logger.debug(`KundeService.find(): dbQuery=${JSON5.stringify(dbQuery)}`);

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        // leeres Array, falls nichts gefunden wird
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
        return KundeModel.find(dbQuery).lean<KundeData>();
        // Kunde.findOne(query), falls das Suchkriterium eindeutig ist
        // bei findOne(query) wird null zurueckgeliefert, falls nichts gefunden
    }

    // eslint-disable-next-line max-statements,max-lines-per-function
    async create(kundeData: Kunde) {
        if (this.mock !== undefined) {
            return this.mock.create(kundeData);
        }

        // Das gegebene Kunde innerhalb von save() asynchron neu anlegen:
        // Promise.reject(err) bei Verletzung von DB-Constraints, z.B. unique

        const kunde = new KundeModel(kundeData);
        const errorMsg = validateKunde(kunde);
        if (errorMsg !== undefined) {
            logger.debug(
                `KundeService.create(): Validation Message: ${JSON5.stringify(
                    errorMsg,
                )}`,
            );
            // Promise<void> als Rueckgabewert
            // Eine von Error abgeleitete Klasse hat die Property "message"
            return Promise.reject(new ValidationError(errorMsg));
        }

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        const { titel } = kundeData;
        let tmp = await KundeModel.findOne({ titel }).lean<KundeData>();
        if (tmp !== null) {
            // Promise<void> als Rueckgabewert
            // Eine von Error abgeleitete Klasse hat die Property "message"
            return Promise.reject(
                new TitelExistsError(`Der Titel "${titel}" existiert bereits.`),
            );
        }

        const { isbn } = kundeData;
        tmp = await KundeModel.findOne({ isbn }).lean<KundeData>();
        if (tmp !== null) {
            return Promise.reject(
                new IsbnExistsError(
                    `Die ISBN-Nr. "${isbn}" existiert bereits.`,
                ),
            );
        }

        kunde._id = uuid(); // eslint-disable-line require-atomic-updates

        let kundeSaved!: Document;
        // https://www.mongodb.com/blog/post/quick-start-nodejs--mongodb--how-to-implement-transactions
        const session = await startSession();
        try {
            await session.withTransaction(async () => {
                kundeSaved = await kunde.save();
            });
        } catch (err) {
            logger.error(
                `KundeService.create(): Die Transaktion wurde abgebrochen: ${JSON5.stringify(
                    err,
                )}`,
            );
            // TODO Weitere Fehlerbehandlung bei Rollback
        } finally {
            session.endSession();
        }
        const kundeDataSaved: KundeData = kundeSaved.toObject();
        logger.debug(
            `KundeService.create(): kundeDataSaved=${JSON5.stringify(
                kundeDataSaved,
            )}`,
        );

        // TODO Email senden

        return kundeDataSaved;
    }

    // eslint-disable-next-line max-lines-per-function,max-statements
    async update(kundeData: Kunde, versionStr: string) {
        if (this.mock !== undefined) {
            return this.mock.update(kundeData);
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
        logger.debug(`KundeService.update(): version=${version}`);
        // prettier-ignore
        logger.debug(`KundeService.update(): kunde=${JSON5.stringify(kundeData)}`);
        const kunde = new KundeModel(kundeData);
        const err = validateKunde(kunde);
        if (err !== undefined) {
            logger.debug(
                `KundeService.update(): Validation Message: ${JSON5.stringify(
                    err,
                )}`,
            );
            // Promise<void> als Rueckgabewert
            return Promise.reject(new ValidationError(err));
        }

        const { titel }: { titel: string } = kundeData;
        const tmp = await KundeModel.findOne({ titel }).lean<KundeData>();
        if (tmp !== null && tmp._id !== kunde._id) {
            return Promise.reject(
                new TitelExistsError(
                    `Der Titel "${titel}" existiert bereits bei ${
                        tmp._id as string
                    }.`,
                ),
            );
        }

        const kundeDb = await KundeModel.findById(kunde._id).lean<KundeData>();
        if (kundeDb === null) {
            return Promise.reject(
                new KundeNotExistsError('Kein Kunde mit der ID'),
            );
        }
        const versionDb = kundeDb?.__v ?? 0;
        if (version < versionDb) {
            return Promise.reject(
                new VersionInvalidError(
                    `Die Versionsnummer ${version} ist nicht aktuell`,
                ),
            );
        }
        // prettier-ignore
        // findByIdAndReplace ersetzt ein Document mit ggf. weniger Properties
        const result = await KundeModel.findByIdAndUpdate(kunde._id, kunde).lean
        <KundeData
        >();
        if (result === null) {
            return Promise.reject(
                new VersionInvalidError(
                    `Kein Kunde mit ID ${
                        kunde._id as string
                    } und Version ${version}`,
                ),
            );
        }

        if (result.__v !== undefined) {
            result.__v++;
        }
        // prettier-ignore
        logger.debug(`KundeService.update(): result=${JSON5.stringify(result)}`);

        // Weitere Methoden von mongoose zum Aktualisieren:
        //    Kunde.findOneAndUpdate(update)
        //    kunde.update(bedingung)
        return Promise.resolve(result);
    }

    async delete(id: string) {
        if (this.mock !== undefined) {
            return this.mock.remove(id);
        }
        logger.debug(`KundeService.delete(): id=${id}`);

        // Das Kunde zur gegebenen ID asynchron loeschen
        const { deletedCount } = await KundeModel.deleteOne({ _id: id });
        logger.debug(`KundeService.delete(): deletedCount=${deletedCount}`);
        return deletedCount !== undefined;

        // Weitere Methoden von mongoose, um zu loeschen:
        //  Kunde.findByIdAndRemove(id)
        //  Kunde.findOneAndRemove(bedingung)
    }
}
