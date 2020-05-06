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

/* globals describe, expect, test, beforeAll, afterAll */

import { KundeArt, Geschlecht } from '../../../src/kunde/entity';
import type { Kunde } from '../../../src/kunde/entity/types';
import { HttpStatus } from '../../../src/shared';
import { PATHS } from '../../../src/app';
import type { Server } from 'http';
import chai from 'chai';
import { createTestserver } from '../../createTestserver';
import request from 'supertest';

const { expect } = chai;

// startWith(), endWith()
import('chai-string').then(chaiString => chai.use(chaiString.default));

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuesKunde: Kunde = {
    vorname: 'Angela',
    nachname: 'Merkel',
    kundenart: KundeArt.GEWERBLICH,
    geschlecht: Geschlecht.WOMEN,
    hausnummer: 1,
    plz: 10119 ,
    aktiv: false,
    registrierungsdatum: '2016-02-28',
    strasse: 'Regierungsstrasse',
    zusatzinfo: 'Bundeskanzler',
    bestellungen: 'Mode',
};
// const neuesKundeInvalid: object = {
//     vorname: 'Bla',
//     nachname: 'Bla',
//     kundenart: 'Superunternehmer',
//     geschlecht: '-',
//     hausnummer: 0,
//     plz: 'strasse',
//     aktiv: false,
//     registrierungsdatum: '2016-02-28',
//     strasse: 'teststrasse',
//     zusatzinfo: '-',
//     bestellungen: '-',
// };
// const neuesKundeNameExistiert: Kunde = {
//     vorname: 'Fabian',
//     nachname: 'Mueller',
//     kundenart: KundeArt.PRIVAT,
//     geschlecht: Geschlecht.MAN,
//     hausnummer: 18,
//     plz: 74626,
//     aktiv: true,
//     registrierungsdatum: '2016-02-28',
//     strasse: 'Bahnhofstrasse',
//     zusatzinfo: 'good buyer',
//     bestellungen: 'Buchlastig',
// };

// const loginDaten: object = {
//     username: 'admin',
//     password: 'p',
// };

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
const path = PATHS.kunden;
// const loginPath = PATHS.login;
let server: Server;

// Test-Suite
describe('POST /kunden', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => (server = await createTestserver()));

    afterAll(async () => {
        server.close();
        // "open handle error (TCPSERVERWRAP)" bei Supertest mit Jest vermeiden
        // https://github.com/visionmedia/supertest/issues/520
        await new Promise(resolve => setTimeout(() => resolve(), 1000)); // eslint-disable-line @typescript-eslint/no-magic-numbers
    });

    // test('Neuer Kunde', async () => {
    //     // given: neuesKunde
    //     let response = await request(server)
    //         .post(`${loginPath}`)
    //         .set('Content-type', 'application/x-www-form-urlencoded')
    //         .send(loginDaten)
    //         .trustLocalhost();
    //     const { token } = response.body;

    //     // when
    //     response = await request(server)
    //         .post(path)
    //         .set('Authorization', `Bearer ${token}`)
    //         .send(neuesKunde)
    //         .trustLocalhost();

    //     // then
    //     const { status, header } = response;
    //     expect(status).to.be.equal(HttpStatus.CREATED);

    //     const { location } = header;
    //     expect(location).to.exist;
    //     expect(typeof location === 'string').to.be.true;
    //     expect(location).not.to.be.empty;

    //     // UUID: Muster von HEX-Ziffern
    //     const indexLastSlash: number = location.lastIndexOf('/');
    //     const idStr = location.slice(indexLastSlash + 1);

    //     expect(idStr).to.match(
    //         // eslint-disable-next-line max-len
    //         /[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-[\dA-Fa-f]{4}-[\dA-Fa-f]{4}-[\dA-Fa-f]{12}/u,
    //     );
    // });

    // test('Neuer Kunde mit ungueltigen Daten', async () => {
    //     // given: neuesKundeInvalid
    //     let response = await request(server)
    //         .post(`${loginPath}`)
    //         .set('Content-type', 'application/x-www-form-urlencoded')
    //         .send(loginDaten)
    //         .trustLocalhost();
    //     const { token } = response.body;

    //     // when
    //     response = await request(server)
    //         .post(path)
    //         .set('Authorization', `Bearer ${token}`)
    //         .send(neuesKundeInvalid)
    //         .trustLocalhost();

    //     // then
    //     const { status, body } = response;
    //     expect(status).to.be.equal(HttpStatus.BAD_REQUEST);
    //     const { kundenart, hausnummer, geschlecht, plz } = body;

    //     expect(kundenart).to.be.equal(
    //         'Die Kundenart muss Privatkunde oder Gewerbekunde sein.',
    //     );
    //     expect(hausnummer).to.endWith('eine gueltige Bewertung.');
    //     expect(geschlecht).to.be.equal(
    //         'Das Geschlecht eines Kundens muss M oder W sein.',
    //     );
    //     expect(plz).to.endWith('eine gueltige PLZ-Nummer.');
    // });

    // test('Neuer Kunde, aber der Name existiert bereits', async () => {
    //     // given: neuesKundeInvalid
    //     let response = await request(server)
    //         .post(`${loginPath}`)
    //         .set('Content-type', 'application/x-www-form-urlencoded')
    //         .send(loginDaten)
    //         .trustLocalhost();
    //     const { token } = response.body;

    //     // when
    //     response = await request(server)
    //         .post(path)
    //         .set('Authorization', `Bearer ${token}`)
    //         .send(neuesKundeNameExistiert)
    //         .trustLocalhost();

    //     // then
    //     const { status, text } = response;
    //     expect(status).to.be.equal(HttpStatus.BAD_REQUEST);
    //     expect(text).has.string('Name');
    // });

    test('Neuer Kunde, aber ohne Token', async () => {
        // given: neuesKunde

        // when
        const response = await request(server)
            .post(path)
            .send(neuesKunde)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.be.empty;
    });

    test('Neuer Kunde, aber mit falschem Token', async () => {
        // given: neuesKunde
        const falscherToken = 'x';

        // when
        const response = await request(server)
            .post(path)
            .set('Authorization', `Bearer ${falscherToken}`)
            .send(neuesKunde)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.be.empty;
    });

    // test.todo('Test mit abgelaufenem Token');
});
