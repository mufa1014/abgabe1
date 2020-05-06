/*
 * Copyright (C) 2017 - present Juergen Zimmermann, Hochschule Karlsruhe
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

import { dbConfig, logger } from '../../shared';
import JSON5 from 'json5';
import { MongoClient } from 'mongodb';

export const connectMongoDB = async () => {
    const { dbName, url } = dbConfig;
    logger.debug(`mongodb.connectMongoDB(): url=${url}`);
    // TODO Connection Pooling
    const client = new MongoClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    await client.connect();
    logger.debug('mongodb.connectMongoDB(): DB-Client geoeffnet');
    const db = client.db(dbName);

    return { db, client };
};

export const closeMongoDBClient = (client: MongoClient) => {
    client
        .close()
        .then(() =>
            logger.debug(
                'mongodb.closeDbClient(): DB-Client wurde geschlossen',
            ),
        )
        .catch(err =>
            logger.error(`mongodb.closeDbClient(): ${JSON5.stringify(err)}`),
        );
};
