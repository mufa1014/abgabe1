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

import { Geschlecht, KundeArt } from '../../entity';
import type { KundeData } from '../../entity/types';

export const kunde: KundeData = {
    _id: '00000000-0000-0000-0000-000000000020',
    vorname: 'Fabian',
    nachname: 'Mueller',
    kundenart: KundeArt.PRIVAT,
    geschlecht: Geschlecht.MAN,
    hausnummer: 18,
    plz: 74839,
    aktiv: true,
    registrierungsdatum: new Date('2019-02-01T00:00:00.000Z'),
    strasse: 'Strassestrasse',
    zusatzinfo: 'good buyer',
    bestellungen: 'Buchlastig',
    __v: 0,
    createdAt: 0,
    updatedAt: 0,
};

export const kunden: Array<KundeData> = [
    kunde,
    {
        _id: '00000000-0000-0000-0000-000000000021',
        vorname: 'Johanna',
        nachname: 'Sperrer',
        kundenart: KundeArt.GEWERBLICH,
        geschlecht: Geschlecht.WOMEN,
        hausnummer: 150,
        plz: 79665,
        aktiv: false,
        registrierungsdatum: new Date('2017-02-01T00:00:00.000Z'),
        strasse: 'Zweitestrasse',
        zusatzinfo: 'bad buyer',
        bestellungen: 'Möbellastig',
        __v: 0,
        createdAt: 0,
        updatedAt: 0,
    },
];
