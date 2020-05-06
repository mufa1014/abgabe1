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

import type { Document } from 'mongoose';
import { KundeData } from './kunde';
import validator from 'validator';

const { isUUID, isPostalCode } = validator;

export interface ValidationErrorMsg {
    id?: string;
    vorname?: string;
    nachname?: string;
    kundenart?: string;
    hausnummer?: string;
    geschlecht?: string;
    plz?: string;
}

/* eslint-disable no-null/no-null */
export const validateKunde = (kunde: Document) => {
    const err: ValidationErrorMsg = {};
    const {
        vorname,
        nachname,
        kundenart,
        hausnummer,
        geschlecht,
        plz,
    } = kunde as Document & KundeData;

    const kundeDocument = kunde;
    if (!kundeDocument.isNew && !isUUID(kundeDocument._id)) {
        err.id = 'Das Kunde hat eine ungueltige ID.';
    }

    if (vorname === undefined || vorname === null || vorname === '') {
        err.vorname = 'Ein Kunde muss einen Vornamen haben.';
    } else if (!/^\w.*/u.test(vorname)) {
        err.vorname = 'Ein Kundenvorname muss mit einem Buchstaben beginnen.';
    }
    if (nachname === undefined || nachname === null || nachname === '') {
        err.nachname = 'Ein Kunde muss einen Nachnamen haben.';
    } else if (!/^\w.*/u.test(nachname)) {
        err.nachname = 'Ein Kundennachname muss mit einem Buchstaben beginnen.';
    }
    if (kundenart === undefined || kundenart === null || kundenart === '') {
        err.kundenart = 'Dem Kundenmuss eine Kundenart zugewiesen sein';
    } else if (kundenart !== 'Privatkunde' && kundenart !== 'Gewerbekunde') {
        err.kundenart =
            'Die Kundenart muss Privatkunde oder Gewerbekunde sein.';
    }
    if (hausnummer !== undefined && hausnummer !== null) {
        err.hausnummer = 'Ein Kunde muss eine Hausnummer haben.';
    }
    if (geschlecht === undefined || geschlecht === null) {
        err.geschlecht = 'Das Geschlecht des Kundees muss gesetzt sein.';
    } else if (geschlecht !== 'M' && geschlecht !== 'W') {
        err.geschlecht = 'Das Geschlecht eines Kundees muss M oder W sein.';
    }
    if (
        plz !== undefined &&
        plz !== null &&
        (typeof plz !== 'string' || !isPostalCode(plz, 'DE'))
    ) {
        err.plz = 'Keine gueltige PLZ.';
    }
    // Falls "preis" ein string ist: Pruefung z.B. 12.30
    // if (isPresent(preis) && !isCurrency(`${preis}`)) {
    //     err.preis = `${preis} ist kein gueltiger Preis`
    // }
    return Object.entries(err).length === 0 ? undefined : err;
};
