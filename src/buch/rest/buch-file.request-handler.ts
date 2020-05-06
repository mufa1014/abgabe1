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
    FileNotFoundError,
    MultipleFilesError,
} from './../service/exceptions';
import { HttpStatus, logger } from '../../shared';
import type { Request, Response } from 'express';
import { BuchFileService } from '../service';
import JSON5 from 'json5';

// export bei async und await:
// https://blogs.msdn.microsoft.com/typescript/2015/11/30/announcing-typescript-1-7
// http://tc39.github.io/ecmascript-export
// https://nemethgergely.com/async-function-best-practices#Using-async-functions-with-express

export class BuchFileRequestHandler {
    private readonly service = new BuchFileService();

    upload(req: Request, res: Response) {
        const { id } = req.params;
        logger.debug(`BuchFileRequestHandler.uploadBinary(): id=${id}`);

        // https://jsao.io/2019/06/uploading-and-downloading-files-buffering-in-node-js

        const data: Array<any> = [];
        let totalBytesInBuffer = 0;
        req.on('data', (chunk: Array<any>) => {
            const { length } = chunk;
            logger.debug(
                `BuchFileRequestHandler.uploadBinary(): data ${length}`,
            );
            data.push(chunk);
            totalBytesInBuffer += length;
        })
            .on('aborted', () =>
                logger.debug('BuchFileRequestHandler.uploadBinary(): aborted'),
            )
            .on('end', () => {
                logger.debug(
                    `BuchFileRequestHandler.uploadBinary(): end ${totalBytesInBuffer}`,
                );
                const buffer = Buffer.concat(data, totalBytesInBuffer);
                this.save(req, id, buffer)
                    .then(() => res.sendStatus(HttpStatus.NO_CONTENT))
                    .catch(err =>
                        logger.error(
                            `Fehler beim Abspeichern: ${JSON5.stringify(err)}`,
                        ),
                    );
            });
    }

    async download(req: Request, res: Response) {
        const { id } = req.params;
        logger.debug(`BuchFileRequestHandler.downloadBinary(): ${id}`);
        if (id === undefined) {
            res.status(HttpStatus.BAD_REQUEST).send('Keine Buch-Id');
            return;
        }

        let file;
        try {
            file = await this.service.find(id);
        } catch (err) {
            this.handleDownloadError(err, res);
            return;
        }

        const { readStream, contentType } = file;
        res.contentType(contentType);
        // https://www.freecodecamp.org/news/node-js-streams-everything-you-need-to-know-c9141306be93
        readStream.pipe(res);
    }

    private async save(req: Request, id: any, buffer: Buffer) {
        const contentType = req.headers['content-type'];
        await this.service.save(id, buffer, contentType);
    }

    private handleDownloadError(err: Error, res: Response) {
        if (err instanceof BuchNotExistsError) {
            logger.debug(err.message);
            res.status(HttpStatus.NOT_FOUND).send(err.message);
            return;
        }

        if (err instanceof FileNotFoundError) {
            logger.error(err.message);
            res.status(HttpStatus.NOT_FOUND).send(err.message);
            return;
        }

        if (err instanceof MultipleFilesError) {
            logger.error(err.message);
            res.status(HttpStatus.INTERNAL_ERROR).send(err.message);
            return;
        }

        logger.error(
            `BuchFileRequestHandler.handleDownloadError(): error=${JSON5.stringify(
                err,
            )}`,
        );
        res.sendStatus(HttpStatus.INTERNAL_ERROR);
    }
}
