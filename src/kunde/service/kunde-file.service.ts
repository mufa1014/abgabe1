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

import {
    FileNotFoundError,
    KundeNotExistsError,
    MultipleFilesError,
} from './exceptions';
import { GridFSBucket, ObjectId } from 'mongodb';
import { closeMongoDBClient, connectMongoDB, saveReadable } from '../../shared';
import JSON5 from 'json5';
import { KundeModel } from '../entity';
import { Readable } from 'stream';
import { logger } from '../../shared';

/* eslint-disable no-null/no-null */
export class KundeFileService {
    async save(id: string, buffer: Buffer, contentType: string | undefined) {
        logger.debug(
            `KundeFileService.save(): id = ${id}, contentType=${contentType}`,
        );

        // Gibt es ein Kunde zur angegebenen ID?
        const kunde = await KundeModel.findById(id);
        if (kunde === null) {
            return false;
        }

        const { db, client } = await connectMongoDB();
        const bucket = new GridFSBucket(db);
        await this.deleteFiles(id, bucket);

        // https://stackoverflow.com/questions/13230487/converting-a-buffer-into-a-readablestream-in-node-js#answer-44091532
        const readable = new Readable();
        // _read ist erforderlich, kann die leere Funktion sein
        readable._read = () => {}; // eslint-disable-line no-underscore-dangle,@typescript-eslint/unbound-method,no-empty-function,@typescript-eslint/no-empty-function
        readable.push(buffer);
        readable.push(null);

        const metadata = { contentType };
        saveReadable(readable, bucket, id, { metadata }, client);
        return true;
    }

    async find(filename: string) {
        logger.debug(`KundeFileService.findFile(): filename=${filename}`);
        await this.checkFilename(filename);

        const { db, client } = await connectMongoDB();

        // https://mongodb.github.io/node-mongodb-native/3.5/tutorials/gridfs/streaming
        const bucket = new GridFSBucket(db);
        const contentType = await this.getContentType(filename, bucket);

        // https://mongodb.github.io/node-mongodb-native/3.5/tutorials/gridfs/streaming/#downloading-a-file
        // https://www.freecodecamp.org/news/node-js-streams-everything-you-need-to-know-c9141306be93
        const readStream = bucket
            .openDownloadStreamByName(filename)
            .on('end', () => closeMongoDBClient(client));
        return { readStream, contentType };
    }

    private async deleteFiles(filename: string, bucket: GridFSBucket) {
        logger.debug(`KundeFileService.deleteFiles(): filename=${filename}`);
        const idObjects: Array<{ _id: ObjectId }> = await bucket
            .find({ filename })
            .project({ _id: 1 })
            .toArray();
        const ids = idObjects.map(obj => obj._id);
        logger.debug(
            `KundeFileService.deleteFiles(): ids=${JSON5.stringify(ids)}`,
        );
        ids.forEach(fileId =>
            bucket.delete(fileId, () =>
                logger.debug(
                    `KundeFileService.deleteFiles(): geloeschte ID=${JSON5.stringify(
                        fileId,
                    )}`,
                ),
            ),
        );
    }

    private async checkFilename(filename: string) {
        logger.debug(`KundeFileService.checkFilename(): filename=${filename}`);

        // Gibt es ein Kunde mit dem gegebenen "filename" als ID?
        const kunde = await KundeModel.findById(filename);
        if (kunde === null) {
            throw new KundeNotExistsError(
                `Es gibt kein Kunde mit der Id ${filename}`,
            );
        }

        logger.debug(
            `KundeFileService.checkFilename(): kunde=${JSON5.stringify(kunde)}`,
        );
    }

    private async getContentType(filename: string, bucket: GridFSBucket) {
        let files;
        try {
            files = await bucket.find({ filename }).toArray();
        } catch (err) {
            logger.error(`${JSON5.stringify(err)}`);
            files = [];
        }

        switch (files.length) {
            case 0:
                throw new FileNotFoundError(
                    `KundeFileService.getContentType(): Es gibt kein File mit Name ${filename}`,
                );
            case 1: {
                const [file] = files;
                const { contentType }: { contentType: string } = file.metadata;
                logger.debug(
                    `KundeFileService.getContentType(): contentType=${contentType}`,
                );
                return contentType;
            }
            default:
                throw new MultipleFilesError(
                    `KundeFileService.getContentType(): Es gibt mehr als ein File mit Name ${filename}`,
                );
        }
    }
}
