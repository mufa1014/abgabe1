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
const geaendertesKunde: object = {
    // plz wird nicht geaendet
    vorname: 'Annkatrin',
    nachname: 'Goetze',
    kundenart: KundeArt.GEWERBLICH,
    geschlecht: Geschlecht.WOMEN,
    hausnummer: 20,
    aktiv: false,
    registrierungsdatum: '2016-02-03',
    strasse: 'Modelstrasse',
    zusatzinfo: 'special',
    bestellungen: 'Modeartikel',
};
const idVorhanden = '00000000-0000-0000-0000-000000000003';

// const geaendertesKundeIdNichtVorhanden: object = {
//     vorname: 'NichtVorhanden',
//     nachname: 'NichtVorhanden',
//     kundenart: KundeArt.GEWERBLICH,
//     geschlecht: Geschlecht.WOMEN,
//     hausnummer: 20,
//     aktiv: false,
//     registrierungsdatum: '2016-02-03',
//     strasse: 'Modelstrasse',
//     zusatzinfo: 'special',
//     bestellungen: 'Modeartikel',
// };
// const idNichtVorhanden = '00000000-0000-0000-0000-000000000999';

// const geaendertesKundeInvalid: object = {
//     vorname: 'Alpha',
//     nachname: 1,
//     geschlecht: 'UNSICHTBAR',
//     kundenart: 'NO_VERLAG',
//     aktiv: true,
//     registrierungsdatum: '2016-02-01',
//     plz: 'falsche-PLZ',
//     strasse: 'Saebenerstrasse',
//     zusatzinfo: 'nothing special',
//     bestellungen: 'Sportartikel',
// };

 const loginDaten: object = {
     username: 'admin',
     password: 'p',
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
const path = PATHS.kunden;
const loginPath = PATHS.login;
let server: Server;

// Test-Suite
describe('PUT /kunden/:id', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => (server = await createTestserver()));

    afterAll(async () => {
        server.close();
        // "open handle error (TCPSERVERWRAP)" bei Supertest mit Jest vermeiden
        // https://github.com/visionmedia/supertest/issues/520
        await new Promise(resolve => setTimeout(() => resolve(), 1000)); // eslint-disable-line @typescript-eslint/no-magic-numbers
    });

    // test('Vorhandener Kunde aendern', async () => {
    //     // given: geaendertesKunde
    //     let response = await request(server)
    //         .post(`${loginPath}`)
    //         .set('Content-type', 'application/x-www-form-urlencoded')
    //         .send(loginDaten)
    //         .trustLocalhost();
    //     const { token } = response.body;

    //     // when
    //     response = await request(server)
    //         .put(`${path}/${idVorhanden}`)
    //         .set('Authorization', `Bearer ${token}`)
    //         .set('If-Match', '"0"')
    //         .send(geaendertesKunde)
    //         .trustLocalhost();

    //     // then
    //     const { status, body } = response;
    //     expect(status).to.be.equal(HttpStatus.NO_CONTENT);
    //     expect(Object.entries(body)).to.be.empty;
    // });

    // test('Nicht-vorhandener Kunde aendern', async () => {
    //     // given: geaendertesKundeIdNichtVorhanden
    //     let response = await request(server)
    //         .post(`${loginPath}`)
    //         .set('Content-type', 'application/x-www-form-urlencoded')
    //         .send(loginDaten)
    //         .trustLocalhost();
    //     const { token } = response.body;

    //     // when
    //     response = await request(server)
    //         .put(`${path}/${idNichtVorhanden}`)
    //         .set('Authorization', `Bearer ${token}`)
    //         .set('If-Match', '"0"')
    //         .send(geaendertesKundeIdNichtVorhanden)
    //         .trustLocalhost();

    //     // then
    //     const { status, body } = response;
    //     expect(status).to.be.equal(HttpStatus.PRECONDITION_FAILED);
    //     expect(Object.entries(body)).to.be.empty;
    // });

    // test('Vorhandener Kunde aendern, aber mit ungueltigen Daten', async () => {
    //     // given: geaendertesKundeInvalid
    //     let response = await request(server)
    //         .post(`${loginPath}`)
    //         .set('Content-type', 'application/x-www-form-urlencoded')
    //         .send(loginDaten)
    //         .trustLocalhost();
    //     const { token } = response.body;

    //     // when
    //     response = await request(server)
    //         .put(`${path}/${idVorhanden}`)
    //         .set('Authorization', `Bearer ${token}`)
    //         .set('If-Match', '"0"')
    //         .send(geaendertesKundeInvalid)
    //         .trustLocalhost();

    //     // then
    //     const { status, body } = response;
    //     expect(status).to.be.equal(HttpStatus.BAD_REQUEST);
    //     const { kundenart, hausnummer, geschlecht, plz } = body;

    //     expect(kundenart).to.be.equal(
    //         'Die Kundenart muss Privatkunde oder Gewerbekunde sein.',
    //     );
    //     expect(hausnummer).to.endWith('eine gueltige Hausnummer.');
    //     expect(geschlecht).to.be.equal(
    //         'Das Geschlecht eines Kundens muss M oder W sein.',
    //     );
    //     expect(plz).to.endWith('eine gueltige PLZ-Nummer.');
    // });

    test('Vorhandener Kunde aendern, aber ohne Versionsnummer', async () => {
        // given: geaendertesKundeInvalid
        let response = await request(server)
            .post(`${loginPath}`)
            .set('Content-type', 'application/x-www-form-urlencoded')
            .send(loginDaten)
            .trustLocalhost();
        const { token } = response.body;

        // when
        response = await request(server)
            .put(`${path}/${idVorhanden}`)
            .set('Authorization', `Bearer ${token}`)
            .set('Accept', 'text/plain')
            .send(geaendertesKunde)
            .trustLocalhost();

        // then
        const { status, text } = response;
        expect(status).to.be.equal(HttpStatus.PRECONDITION_REQUIRED);
        expect(text).to.be.equal('Versionsnummer fehlt');
    });

    // test('Vorhandener Kunde aendern, aber mit alter Versionsnummer', async () => {
    //     // given: geaendertesKundeInvalid
    //     let response = await request(server)
    //         .post(`${loginPath}`)
    //         .set('Content-type', 'application/x-www-form-urlencoded')
    //         .send(loginDaten)
    //         .trustLocalhost();
    //     const { token } = response.body;

    //     // when
    //     response = await request(server)
    //         .put(`${path}/${idVorhanden}`)
    //         .set('Authorization', `Bearer ${token}`)
    //         .set('If-Match', '"-1"')
    //         .set('Accept', 'text/plain')
    //         .send(geaendertesKunde)
    //         .trustLocalhost();

    //     // then
    //     const { status, text } = response;
    //     expect(status).to.be.equal(HttpStatus.PRECONDITION_FAILED);
    //     expect(text).to.have.string('Die Versionsnummer');
    // });

    test('Vorhandener Kunde aendern, aber ohne Token', async () => {
        // given: geaendertesKunde

        // when
        const response = await request(server)
            .put(`${path}/${idVorhanden}`)
            .set('If-Match', '"0"')
            .send(geaendertesKunde)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.be.empty;
    });

    test('Vorhandener Kunde aendern, aber mit falschem Token', async () => {
        // given: geaendertesKunde
        const falscherToken = 'x';

        // when
        const response = await request(server)
            .put(`${path}/${idVorhanden}`)
            .set('Authorization', `Bearer ${falscherToken}`)
            .set('If-Match', '"0"')
            .send(geaendertesKunde)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.be.empty;
    });
});
