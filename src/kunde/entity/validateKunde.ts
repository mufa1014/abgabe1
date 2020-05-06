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
import { MAX_RATING } from '../../shared';
import validator from 'validator';

const { isUUID, isURL, isISBN } = validator;

export interface ValidationErrorMsg {
    id?: string;
    titel?: string;
    art?: string;
    rating?: string;
    verlag?: string;
    isbn?: string;
    homepage?: string;
}

/* eslint-disable no-null/no-null */
export const validateKunde = (kunde: Document) => {
    const err: ValidationErrorMsg = {};
    const { titel, art, rating, verlag, isbn, homepage } = kunde as Document &
        KundeData;

    const kundeDocument = kunde;
    if (!kundeDocument.isNew && !isUUID(kundeDocument._id)) {
        err.id = 'Das Kunde hat eine ungueltige ID.';
    }

    if (titel === undefined || titel === null || titel === '') {
        err.titel = 'Ein Kunde muss einen Titel haben.';
    } else if (!/^\w.*/u.test(titel)) {
        err.titel =
            'Ein Kundetitel muss mit einem Kundestaben, einer Ziffer oder _ beginnen.';
    }
    if (art === undefined || art === null || art === '') {
        err.art = 'Die Art eines Kundees muss gesetzt sein';
    } else if (art !== 'KINDLE' && art !== 'DRUCKAUSGABE') {
        err.art = 'Die Art eines Kundees muss KINDLE oder DRUCKAUSGABE sein.';
    }
    if (
        rating !== undefined &&
        rating !== null &&
        (rating < 0 || rating > MAX_RATING)
    ) {
        err.rating = `${rating} ist keine gueltige Bewertung.`;
    }
    if (verlag === undefined || verlag === null || verlag === '') {
        err.verlag = 'Der Verlag des Kundees muss gesetzt sein.';
    } else if (verlag !== 'FOO_VERLAG' && verlag !== 'BAR_VERLAG') {
        err.verlag =
            'Der Verlag eines Kundees muss FOO_VERLAG oder BAR_VERLAG sein.';
    }
    if (
        isbn !== undefined &&
        isbn !== null &&
        (typeof isbn !== 'string' || !isISBN(isbn))
    ) {
        err.isbn = 'Keine gueltige ISBN-Nummer.';
    }
    // Falls "preis" ein string ist: Pruefung z.B. 12.30
    // if (isPresent(preis) && !isCurrency(`${preis}`)) {
    //     err.preis = `${preis} ist kein gueltiger Preis`
    // }
    if (
        homepage !== undefined &&
        homepage !== null &&
        (typeof homepage !== 'string' || !isURL(homepage))
    ) {
        err.homepage = 'Keine gueltige URL.';
    }

    return Object.entries(err).length === 0 ? undefined : err;
};
