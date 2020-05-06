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
    BuchNotExistsError,
    FileNotFoundError,
    MultipleFilesError,
} from './exceptions';
import { GridFSBucket, ObjectId } from 'mongodb';
import { closeMongoDBClient, connectMongoDB, saveReadable } from '../../shared';
import { BuchModel } from '../entity';
import JSON5 from 'json5';
import { Readable } from 'stream';
import { logger } from '../../shared';

/* eslint-disable no-null/no-null */
export class BuchFileService {
    async save(id: string, buffer: Buffer, contentType: string | undefined) {
        logger.debug(
            `BuchFileService.save(): id = ${id}, contentType=${contentType}`,
        );

        // Gibt es ein Buch zur angegebenen ID?
        const buch = await BuchModel.findById(id);
        if (buch === null) {
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
        logger.debug(`BuchFileService.findFile(): filename=${filename}`);
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
        logger.debug(`BuchFileService.deleteFiles(): filename=${filename}`);
        const idObjects: Array<{ _id: ObjectId }> = await bucket
            .find({ filename })
            .project({ _id: 1 })
            .toArray();
        const ids = idObjects.map(obj => obj._id);
        logger.debug(
            `BuchFileService.deleteFiles(): ids=${JSON5.stringify(ids)}`,
        );
        ids.forEach(fileId =>
            bucket.delete(fileId, () =>
                logger.debug(
                    `BuchFileService.deleteFiles(): geloeschte ID=${JSON5.stringify(
                        fileId,
                    )}`,
                ),
            ),
        );
    }

    private async checkFilename(filename: string) {
        logger.debug(`BuchFileService.checkFilename(): filename=${filename}`);

        // Gibt es ein Buch mit dem gegebenen "filename" als ID?
        const buch = await BuchModel.findById(filename);
        if (buch === null) {
            throw new BuchNotExistsError(
                `Es gibt kein Buch mit der Id ${filename}`,
            );
        }

        logger.debug(
            `BuchFileService.checkFilename(): buch=${JSON5.stringify(buch)}`,
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
                    `BuchFileService.getContentType(): Es gibt kein File mit Name ${filename}`,
                );
            case 1: {
                const [file] = files;
                const { contentType }: { contentType: string } = file.metadata;
                logger.debug(
                    `BuchFileService.getContentType(): contentType=${contentType}`,
                );
                return contentType;
            }
            default:
                throw new MultipleFilesError(
                    `BuchFileService.getContentType(): Es gibt mehr als ein File mit Name ${filename}`,
                );
        }
    }
}
