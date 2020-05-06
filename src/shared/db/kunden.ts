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

export const kunden = [
    {
        _id: '00000000-0000-0000-0000-000000000001',
        vorname: 'Fabian',
        nachname: 'Mueller',
        kundenart: 'Privatkunde',
        geschlecht: 'M',
        hausnummer: 18,
        plz: 74626,
        aktiv: true,
        registrierungsdatum: new Date('2019-04-01T00:00:00.000Z'),
        strasse: 'Bahnhofstrasse',
        zusatzinfo: 'good buyer',
        bestellungen: 'Buchlastig',
        __v: 0,
        createdAt: new Date('2019-04-01'),
        updatedAt: new Date('2019-04-01'),
    },
    {
        _id: '00000000-0000-0000-0000-000000000002',
        vorname: 'Johanna',
        nachname: 'Sperrer',
        kundenart: 'Gewerbekunde',
        geschlecht: 'W',
        hausnummer: 150,
        plz: 71665,
        aktiv: false,
        registrierungsdatum: new Date('2019-04-01T00:00:00.000Z'),
        strasse: 'Hauptstrasse',
        zusatzinfo: 'bad buyer',
        bestellungen: 'Möbellastig',
        __v: 0,
        createdAt: new Date('2019-04-01'),
        updatedAt: new Date('2019-04-01'),
    },
    {
        _id: '00000000-0000-0000-0000-000000000003',
        vorname: 'Mario',
        nachname: 'Goetze',
        kundenart: 'Privatkunde',
        geschlecht: 'M',
        hausnummer: 2,
        plz: 80331,
        aktiv: true,
        registrierungsdatum: new Date('2019-04-01T00:00:00.000Z'),
        strasse: 'Saebenerstrasse',
        zusatzinfo: 'nothing special',
        bestellungen: 'Sportartikel',
        __v: 0,
        createdAt: new Date('2019-04-01'),
        updatedAt: new Date('2019-04-01'),
    },
    {
        _id: '00000000-0000-0000-0000-000000000004',
        vorname: 'Melissa',
        nachname: 'Naschenweng',
        kundenart: 'Gewerbekunde',
        geschlecht: 'W',
        hausnummer: 23,
        plz: 80539,
        aktiv: true,
        registrierungsdatum: new Date('2019-04-01T00:00:00.000Z'),
        strasse: 'Dorfstrasse',
        zusatzinfo: 'frequent buyer',
        bestellungen: 'Modelastig',
        __v: 0,
        createdAt: new Date('2019-04-01'),
        updatedAt: new Date('2019-04-01'),
    },
    {
        _id: '00000000-0000-0000-0000-000000000005',
        vorname: 'Oliver',
        nachname: 'Kahn',
        kundenart: 'Privatkunde',
        geschlecht: 'M',
        hausnummer: 3000,
        plz: 81247,
        aktiv: false,
        registrierungsdatum: new Date('2019-04-01T00:00:00.000Z'),
        strasse: 'Titanenstrasse',
        zusatzinfo: 'Der Titan',
        bestellungen: 'Torwarthandschuhe',
        __v: 0,
        createdAt: new Date('2019-04-01'),
        updatedAt: new Date('2019-04-01'),
    },
];
