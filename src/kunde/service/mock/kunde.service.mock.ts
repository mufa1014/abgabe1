/*
 * Copyright (C) 2018 - present Juergen Zimmermann, Hochschule Karlsruhe
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

import { kunde, kunden } from './kunde';
import JSON5 from 'json5';
import { Kunde } from '../../entity/types';
import { logger } from '../../../shared';
import { v4 as uuid } from 'uuid';

/* eslint-disable @typescript-eslint/no-unused-vars,require-await,@typescript-eslint/require-await */
export class KundeServiceMock {
    async findById(id: string) {
        kunde._id = id;
        return kunde;
    }

    async find(_?: any) {
        return kunden;
    }

    async create(kundeData: Kunde) {
        kundeData._id = uuid();
        logger.info(`Neuer Kunde: ${JSON5.stringify(kundeData)}`);
        return kundeData;
    }

    async update(kundeData: Kunde) {
        if (kundeData.__v !== undefined) {
            kundeData.__v++;
        }
        logger.info(`Aktualisierte Kunde: ${JSON5.stringify(kundeData)}`);
        return Promise.resolve(kundeData);
    }

    async remove(id: string) {
        logger.info(`ID des geloeschten Kunden: ${id}`);
        return true;
    }
}
