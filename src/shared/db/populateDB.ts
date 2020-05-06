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

import { Collection, Db, GridFSBucket, MongoClient } from 'mongodb';
import { dbConfig, serverConfig } from './../config';
import { connectMongoDB } from './mongoDB';
import { createReadStream } from 'fs';
import { kunden } from './kunden';
import { logger } from '../logger';
import { resolve } from 'path';
import { saveReadable } from './gridfs';

const createIndex = async (collection: Collection) => {
    // http://mongodb.github.io/node-mongodb-native/3.5/api/Collection.html#createIndex
    // Beachte: bei createIndexes() gelten die Optionen fuer alle Indexe gelten
    let index = await collection.createIndex('titel', { unique: true });
    logger.warn(`Der Index ${index} wurde angelegt.`);
    index = await collection.createIndex('isbn', { unique: true });
    logger.warn(`Der Index ${index} wurde angelegt.`);
    index = await collection.createIndex('schlagwoerter', { sparse: true });
    logger.warn(`Der Index ${index} wurde angelegt.`);
};

const uploadBinary = (db: Db, client: MongoClient) => {
    // Kein File-Upload in die Cloud
    if (serverConfig.cloud !== undefined) {
        logger.info('uploadBinary(): Keine Binaerdateien mit der Cloud');
        return;
    }

    const filenameBinary = 'image.png';
    const contentType = 'image/png';

    const filename = '00000000-0000-0000-0000-000000000001';
    logger.warn(`uploadBinary(): "${filename}" wird eingelesen.`);

    // https://mongodb.github.io/node-mongodb-native/3.5/tutorials/gridfs/streaming
    const bucket = new GridFSBucket(db);
    bucket.drop();

    const readable = createReadStream(resolve(__dirname, filenameBinary));
    const metadata = { contentType };
    saveReadable(readable, bucket, filename, { metadata }, client);
};

export const populateDB = async (dev?: boolean) => {
    let devMode = dev;
    if (devMode === undefined) {
        devMode = dbConfig.dbPopulate;
    }
    logger.info(`populateDB(): devMode=${devMode}`);

    if (!devMode) {
        return;
    }

    const { db, client } = await connectMongoDB();

    // http://mongodb.github.io/node-mongodb-native/3.5/api/Db.html#dropCollection
    const collectionName = 'Buch';
    let dropped = false;
    try {
        dropped = await db.dropCollection(collectionName);
    } catch (err) {
        // Falls der Error *NICHT* durch eine fehlende Collection verursacht wurde
        if (err.name !== 'MongoError') {
            logger.error(`Fehler beim Neuladen der DB ${db.databaseName}`);
            return;
        }
    }
    if (dropped) {
        logger.warn(`Die Collection "${collectionName}" wurde geloescht.`);
    }

    // http://mongodb.github.io/node-mongodb-native/3.5/api/Db.html#createCollection
    const collection = await db.createCollection(collectionName);
    logger.warn(
        `Die Collection "${collection.collectionName}" wurde neu angelegt.`,
    );

    // http://mongodb.github.io/node-mongodb-native/3.5/api/Collection.html#insertMany
    const result = await collection.insertMany(kunden);
    logger.warn(`${result.insertedCount} Datensaetze wurden eingefuegt.`);

    await createIndex(collection);
    uploadBinary(db, client);
};
