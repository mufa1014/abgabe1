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

export enum Geschlecht {
    MAN = 'M',
    WOMEN = 'W',
}

export enum KundeArt {
    PRIVAT = 'Privatkunde',
    GEWERBLICH = 'Gewerbekunde',
}

// gemeinsames Basis-Interface fuer REST und GraphQL
export interface Kunde {
    _id?: string;
    __v?: number;
    vorname: string;
    nachname: string;
    kundenart?: KundeArt | '';
    geschlecht: Geschlecht;
    hausnummer: number;
    plz: number;
    aktiv?: boolean;
    registrierungsdatum?: string | Date;
    strasse: string;
    zusatzinfo?: string;
    bestellungen: any;
}

export interface KundeData extends Kunde {
    createdAt?: number;
    updatedAt?: number;
    _links?: {
        self?: { href: string };
        list?: { href: string };
        add?: { href: string };
        update?: { href: string };
        remove?: { href: string };
    };
}
