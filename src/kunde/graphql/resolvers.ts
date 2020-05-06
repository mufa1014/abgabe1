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

import type {
    IResolverObject,
    IResolvers,
} from 'graphql-tools/dist/Interfaces';
import type { Kunde } from '../entity/types';
import { KundeService } from '../service/kunde.service';
import { logger } from '../../shared';

const kundeService = new KundeService();

const findKunden = (vorname: string) => {
    const suchkriterium = vorname === undefined ? {} : { vorname };
    return kundeService.find(suchkriterium);
};

interface VornameCriteria {
    vorname: string;
}

interface IdCriteria {
    id: string;
}

const createKunde = (kunde: Kunde) => {
    kunde.registrierungsdatum = new Date(kunde.registrierungsdatum as string);
    return kundeService.create(kunde);
};

const updateKunde = async (kunde: Kunde) => {
    const version = kunde.__v ?? 0;
    kunde.registrierungsdatum = new Date(kunde.registrierungsdatum as string);
    const kundeUpdated = await kundeService.update(kunde, version.toString());
    logger.debug(`resolvers updateKunde(): Versionsnummer: ${kunde.__v}`);
    return kundeUpdated;
};

const deleteKunde = async (id: string) => {
    await kundeService.delete(id);
};

// Queries passend zu "type Query" in typeDefs.ts
const query: IResolverObject = {
    // Kunden suchen, ggf. mit Vorname als Suchkriterium
    kunden: (_: unknown, { vorname }: VornameCriteria) => findKunden(vorname),
    // Ein Kunde mit einer bestimmten ID suchen
    kunde: (_: unknown, { id }: IdCriteria) => kundeService.findById(id),
};

const mutation: IResolverObject = {
    createKunde: (_: unknown, kunde: Kunde) => createKunde(kunde),
    updateKunde: (_: unknown, kunde: Kunde) => updateKunde(kunde),
    deleteKunde: (_: unknown, { id }: IdCriteria) => deleteKunde(id),
};

export const resolvers: IResolvers = {
    Query: query,
    Mutation: mutation,
};
