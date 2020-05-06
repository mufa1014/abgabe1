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

import { BuchArt, Verlag } from '../../../src/buch/entity';
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
const geaendertesBuch: object = {
    // isbn wird nicht geaendet
    titel: 'Geaendert',
    rating: 1,
    art: BuchArt.DRUCKAUSGABE,
    verlag: Verlag.FOO_VERLAG,
    preis: 33.33,
    rabatt: 0.033,
    lieferbar: true,
    datum: '2016-02-03',
    homepage: 'https://test.te',
    autoren: [{ nachname: 'Gamma', vorname: 'Claus' }],
    schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
};
const idVorhanden = '00000000-0000-0000-0000-000000000003';

const geaendertesBuchIdNichtVorhanden: object = {
    titel: 'Nichtvorhanden',
    rating: 1,
    art: BuchArt.DRUCKAUSGABE,
    verlag: Verlag.FOO_VERLAG,
    preis: 33.33,
    rabatt: 0.033,
    lieferbar: true,
    datum: '2016-02-03',
    autoren: [{ nachname: 'Gamma', vorname: 'Claus' }],
    schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
};
const idNichtVorhanden = '00000000-0000-0000-0000-000000000999';

const geaendertesBuchInvalid: object = {
    titel: 'Alpha',
    rating: -1,
    art: 'UNSICHTBAR',
    verlag: 'NO_VERLAG',
    preis: 0.01,
    rabatt: 0,
    lieferbar: true,
    datum: '2016-02-01',
    isbn: 'falsche-ISBN',
    autoren: [{ nachname: 'Test', vorname: 'Theo' }],
    schlagwoerter: [],
};

const loginDaten: object = {
    username: 'admin',
    password: 'p',
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
const path = PATHS.buecher;
const loginPath = PATHS.login;
let server: Server;

// Test-Suite
describe('PUT /buecher/:id', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => (server = await createTestserver()));

    afterAll(async () => {
        server.close();
        // "open handle error (TCPSERVERWRAP)" bei Supertest mit Jest vermeiden
        // https://github.com/visionmedia/supertest/issues/520
        await new Promise(resolve => setTimeout(() => resolve(), 1000)); // eslint-disable-line @typescript-eslint/no-magic-numbers
    });

    test('Vorhandenes Buch aendern', async () => {
        // given: geaendertesBuch
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
            .set('If-Match', '"0"')
            .send(geaendertesBuch)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.NO_CONTENT);
        expect(Object.entries(body)).to.be.empty;
    });

    test('Nicht-vorhandenes Buch aendern', async () => {
        // given: geaendertesBuchIdNichtVorhanden
        let response = await request(server)
            .post(`${loginPath}`)
            .set('Content-type', 'application/x-www-form-urlencoded')
            .send(loginDaten)
            .trustLocalhost();
        const { token } = response.body;

        // when
        response = await request(server)
            .put(`${path}/${idNichtVorhanden}`)
            .set('Authorization', `Bearer ${token}`)
            .set('If-Match', '"0"')
            .send(geaendertesBuchIdNichtVorhanden)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.PRECONDITION_FAILED);
        expect(Object.entries(body)).to.be.empty;
    });

    test('Vorhandenes Buch aendern, aber mit ungueltigen Daten', async () => {
        // given: geaendertesBuchInvalid
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
            .set('If-Match', '"0"')
            .send(geaendertesBuchInvalid)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.BAD_REQUEST);
        const { art, rating, verlag, isbn } = body;

        expect(art).to.be.equal(
            'Die Art eines Buches muss KINDLE oder DRUCKAUSGABE sein.',
        );
        expect(rating).to.endWith('eine gueltige Bewertung.');
        expect(verlag).to.be.equal(
            'Der Verlag eines Buches muss FOO_VERLAG oder BAR_VERLAG sein.',
        );
        expect(isbn).to.endWith('eine gueltige ISBN-Nummer.');
    });

    test('Vorhandenes Buch aendern, aber ohne Versionsnummer', async () => {
        // given: geaendertesBuchInvalid
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
            .send(geaendertesBuch)
            .trustLocalhost();

        // then
        const { status, text } = response;
        expect(status).to.be.equal(HttpStatus.PRECONDITION_REQUIRED);
        expect(text).to.be.equal('Versionsnummer fehlt');
    });

    test('Vorhandenes Buch aendern, aber mit alter Versionsnummer', async () => {
        // given: geaendertesBuchInvalid
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
            .set('If-Match', '"-1"')
            .set('Accept', 'text/plain')
            .send(geaendertesBuch)
            .trustLocalhost();

        // then
        const { status, text } = response;
        expect(status).to.be.equal(HttpStatus.PRECONDITION_FAILED);
        expect(text).to.have.string('Die Versionsnummer');
    });

    test('Vorhandenes Buch aendern, aber ohne Token', async () => {
        // given: geaendertesBuch

        // when
        const response = await request(server)
            .put(`${path}/${idVorhanden}`)
            .set('If-Match', '"0"')
            .send(geaendertesBuch)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.be.empty;
    });

    test('Vorhandenes Buch aendern, aber mit falschem Token', async () => {
        // given: geaendertesBuch
        const falscherToken = 'x';

        // when
        const response = await request(server)
            .put(`${path}/${idVorhanden}`)
            .set('Authorization', `Bearer ${falscherToken}`)
            .set('If-Match', '"0"')
            .send(geaendertesBuch)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.be.empty;
    });
});
