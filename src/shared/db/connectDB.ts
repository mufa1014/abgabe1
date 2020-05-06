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

/* eslint-disable no-invalid-this,no-process-env,no-process-exit */

import { Schema, connect, connection, pluralize } from 'mongoose';
import type { ConnectionOptions } from 'mongoose';
import JSON5 from 'json5';
import { dbConfig } from '../config';
import { logger } from '../logger';

// http://mongoosejs.com/docs/connections.html
// https://github.com/mongodb/node-mongodb-native
// https://docs.mongodb.com/manual/tutorial/configure-ssl-clients

const { mockDB, url } = dbConfig;

// TODO ab mongoose 5.8.3 (und mongodb 3.4) funktioniert TLS nicht mehr mit selbstsigniertem Zertifikat
// https://mongodb.github.io/node-mongodb-native/3.5/reference/connecting/connection-settings
// const tls = true;
// const tlsInsecure = true;
// const tlsCertificateKeyFile = 'mongodb.cer';

// bei "ESnext" statt "CommonJS": __dirname ist nicht vorhanden
// import { dirname } from 'path';
// import { fileURLToPath } from 'url';
// const filename = fileURLToPath(import.meta.url);
// const currentDir = dirname(filename);

// https://mongoosejs.com/docs/deprecations.html
const useNewUrlParser = true;

// findOneAndUpdate nutzt findOneAndUpdate() von MongoDB statt findAndModify()
const useFindAndModify = false;

// Mongoose nutzt createIndex() von MongoDB statt ensureIndex()
const useCreateIndex = true;

// MongoDB hat eine neue "Server Discover and Monitoring engine"
const useUnifiedTopology = true;

// Name eines mongoose-Models = Name der Collection
pluralize(undefined);

// Callback: Start des Appservers, nachdem der DB-Server gestartet ist

export const connectDB = async () => {
    if (mockDB) {
        logger.warn('Mocking: Keine DB-Verbindung');
        return;
    }

    logger.info(
        `URL fuer mongoose: ${url
            .replace(/\/\/.*:/u, '//USERNAME:@')
            .replace(/:[^:]*@/u, ':***@')}`,
    );

    // http://mongoosejs.com/docs/connections.html
    // http://mongodb.github.io/node-mongodb-native/3.5/api/MongoClient.html#.connect
    const options: ConnectionOptions = {
        useNewUrlParser,
        useFindAndModify,
        useCreateIndex,
        useUnifiedTopology,
    };

    // http://mongoosejs.com/docs/api.html#index_Mongoose-createConnection
    // http://mongoosejs.com/docs/api.html#connection_Connection-open
    // http://mongoosejs.com/docs/connections.html
    // https://github.com/Automattic/mongoose/issues/5304
    // https://docs.mongodb.com/manual/reference/connection-string/#connections-connection-options
    // http://mongodb.github.io/node-mongodb-native/3.5/api/MongoClient.html
    try {
        await connect(url, options);
    } catch (err) {
        logger.error(`${JSON5.stringify(err)}`);
        logger.error(
            `FEHLER beim Aufbau der DB-Verbindung: ${err.message as string}\n`,
        );
        process.exit(0);
    }

    logger.info(`DB-Verbindung zu ${connection.db.databaseName} ist aufgebaut`);

    // util.promisify(fn) funktioniert nur mit Funktionen, bei denen
    // der error-Callback das erste Funktionsargument ist
    connection.on('disconnecting', () =>
        logger.info('DB-Verbindung wird geschlossen...'),
    );
    connection.on('disconnected', () =>
        logger.info('DB-Verbindung ist geschlossen.'),
    );
    connection.on('error', () => logger.error('Fehlerhafte DB-Verbindung'));
};

// In Produktion auf false setzen
export const autoIndex = true;

/* eslint-disable no-null/no-null */
export const optimistic = (schema: Schema) => {
    // https://mongoosejs.com/docs/guide.html#versionKey
    // https://github.com/Automattic/mongoose/issues/1265
    schema.pre('findOneAndUpdate', function () {
        const update = this.getUpdate();
        if (update.__v !== null) {
            delete update.__v;
        }
        const keys = ['$set', '$setOnInsert'];
        for (const key of keys) {
            // Optional Chaining
            /* eslint-disable no-undef,security/detect-object-injection */
            if (update[key]?.__v !== null) {
                delete update[key].__v;
                if (Object.entries(update[key]).length === 0) {
                    delete update[key]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
                }
            }
        }

        update.$inc = update.$inc || {}; // eslint-disable-line @typescript-eslint/strict-boolean-expressions,@typescript-eslint/no-unnecessary-condition
        update.$inc.__v = 1;
    });
};
