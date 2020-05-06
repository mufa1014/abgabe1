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
import type { Buch } from '../../../src/buch/entity/types';
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
const neuesBuch: Buch = {
    titel: 'Neu',
    rating: 1,
    art: BuchArt.DRUCKAUSGABE,
    verlag: Verlag.FOO_VERLAG,
    preis: 99.99,
    rabatt: 0.099,
    lieferbar: true,
    datum: '2016-02-28',
    isbn: '0-0070-0644-6',
    homepage: 'https://test.de/',
    schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
    autoren: [{ nachname: 'Test', vorname: 'Theo' }],
};
const neuesBuchInvalid: object = {
    titel: 'Blabla',
    rating: -1,
    art: 'UNSICHTBAR',
    verlag: 'NO_VERLAG',
    preis: 0,
    rabatt: 0,
    lieferbar: true,
    datum: '2016-02-01',
    isbn: 'falsche-ISBN',
    autoren: [{ nachname: 'Test', vorname: 'Theo' }],
    schlagwoerter: [],
};
const neuesBuchTitelExistiert: Buch = {
    titel: 'Alpha',
    rating: 1,
    art: BuchArt.DRUCKAUSGABE,
    verlag: Verlag.FOO_VERLAG,
    preis: 99.99,
    rabatt: 0.099,
    lieferbar: true,
    datum: '2016-02-28',
    isbn: '0-0070-9732-8',
    autoren: [{ nachname: 'Test', vorname: 'Theo' }],
    schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
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
describe('POST /buecher', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => (server = await createTestserver()));

    afterAll(async () => {
        server.close();
        // "open handle error (TCPSERVERWRAP)" bei Supertest mit Jest vermeiden
        // https://github.com/visionmedia/supertest/issues/520
        await new Promise(resolve => setTimeout(() => resolve(), 1000)); // eslint-disable-line @typescript-eslint/no-magic-numbers
    });

    test('Neues Buch', async () => {
        // given: neuesBuch
        let response = await request(server)
            .post(`${loginPath}`)
            .set('Content-type', 'application/x-www-form-urlencoded')
            .send(loginDaten)
            .trustLocalhost();
        const { token } = response.body;

        // when
        response = await request(server)
            .post(path)
            .set('Authorization', `Bearer ${token}`)
            .send(neuesBuch)
            .trustLocalhost();

        // then
        const { status, header } = response;
        expect(status).to.be.equal(HttpStatus.CREATED);

        const { location } = header;
        expect(location).to.exist;
        expect(typeof location === 'string').to.be.true;
        expect(location).not.to.be.empty;

        // UUID: Muster von HEX-Ziffern
        const indexLastSlash: number = location.lastIndexOf('/');
        const idStr = location.slice(indexLastSlash + 1);

        expect(idStr).to.match(
            // eslint-disable-next-line max-len
            /[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-[\dA-Fa-f]{4}-[\dA-Fa-f]{4}-[\dA-Fa-f]{12}/u,
        );
    });

    test('Neues Buch mit ungueltigen Daten', async () => {
        // given: neuesBuchInvalid
        let response = await request(server)
            .post(`${loginPath}`)
            .set('Content-type', 'application/x-www-form-urlencoded')
            .send(loginDaten)
            .trustLocalhost();
        const { token } = response.body;

        // when
        response = await request(server)
            .post(path)
            .set('Authorization', `Bearer ${token}`)
            .send(neuesBuchInvalid)
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

    test('Neues Buch, aber der Titel existiert bereits', async () => {
        // given: neuesBuchInvalid
        let response = await request(server)
            .post(`${loginPath}`)
            .set('Content-type', 'application/x-www-form-urlencoded')
            .send(loginDaten)
            .trustLocalhost();
        const { token } = response.body;

        // when
        response = await request(server)
            .post(path)
            .set('Authorization', `Bearer ${token}`)
            .send(neuesBuchTitelExistiert)
            .trustLocalhost();

        // then
        const { status, text } = response;
        expect(status).to.be.equal(HttpStatus.BAD_REQUEST);
        expect(text).has.string('Titel');
    });

    test('Neues Buch, aber ohne Token', async () => {
        // given: neuesBuch

        // when
        const response = await request(server)
            .post(path)
            .send(neuesBuch)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.be.empty;
    });

    test('Neues Buch, aber mit falschem Token', async () => {
        // given: neuesBuch
        const falscherToken = 'x';

        // when
        const response = await request(server)
            .post(path)
            .set('Authorization', `Bearer ${falscherToken}`)
            .send(neuesBuch)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.be.empty;
    });

    test.todo('Test mit abgelaufenem Token');
});
