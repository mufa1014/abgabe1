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

// REST-Schnittstelle testen: Supertest oder (primitiver!) request

// import dotenv from 'dotenv';
// const result = dotenv.config();
// if (result.error !== undefined) {
//     throw result.error;
// }
// console.info(`.env: ${JSON.stringify(result.parsed)}`);
// const dev = result?.parsed?.NODE_ENV?.startsWith('dev') ?? false;

import { HttpStatus } from '../../../src/shared';
import { PATHS } from '../../../src/app';
import type { KundeData } from '../../../src/kunde/entity/types';
import type { Server } from 'http';
import chai from 'chai';
import { createTestserver } from '../../createTestserver';
import request from 'supertest';

const { expect } = chai;

// startWith(), endWith()
import('chai-string').then(chaiString => chai.use(chaiString.default));

// -----------------------------------------------------------------------------
// T e s t s e r v e r   m i t   H T T P   u n d   R a n d o m   P o r t
// -----------------------------------------------------------------------------
const path = PATHS.kunden;
let server: Server;

// Test-Suite
describe('GET /kunden', () => {
    beforeAll(async () => (server = await createTestserver()));

    afterAll(async () => {
        server.close();
        // "open handle error (TCPSERVERWRAP)" bei Supertest mit Jest vermeiden
        // https://github.com/visionmedia/supertest/issues/520
        await new Promise(resolve => setTimeout(() => resolve(), 1000)); // eslint-disable-line @typescript-eslint/no-magic-numbers
    });

    test('Alle Kunden', async () => {
        // when
        const response = await request(server).get(path).trustLocalhost();

        // then
        const { status, header, body } = response;
        expect(status).to.be.equal(HttpStatus.OK);
        expect(header['content-type']).to.match(/json/iu);
        // https://jestjs.io/docs/en/expect
        // JSON-Array mit mind. 1 JSON-Objekt
        expect(body).not.to.be.empty;
    });

    test('Kunden mit einem Vornamen, der ein "a" enthaelt', async () => {
        // given
        const teilVorname = 'a';

        // when
        const response = await request(server)
            .get(`${path}?vorname=${teilVorname}`)
            .trustLocalhost();

        // then
        const { status, header, body } = response;
        expect(status).to.be.equal(HttpStatus.OK);
        expect(header['content-type']).to.match(/json/iu);
        // response.body ist ein JSON-Array mit mind. 1 JSON-Objekt
        expect(body).not.to.be.empty;

        // Jeder Kunde hat einen Vorname mit dem Teilstring 'a'
        body.map((kunde: KundeData) => kunde.vorname).forEach((vorname: string) =>
            expect(vorname).to.have.string(teilVorname),
        );
    });

    test('Keine Kunden mit einem Vorname, der "XX" enthaelt', async () => {
        // given
        const teilVorname = 'XX';

        // when
        const response = await request(server)
            .get(`${path}?vorname=${teilVorname}`)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.NOT_FOUND);
        // Leerer Rumpf
        expect(Object.entries(body)).to.be.empty;
    });

    test('Mind. 1 Kunde mit Kundenart "Privatkunde"', async () => {
        // given
        const schlagwort = 'Privatkunde';

        // when
        const response = await request(server)
            .get(`${path}?${schlagwort}=true`)
            .trustLocalhost();

        // then
        const { status, header, body } = response;
        expect(status).to.be.equal(HttpStatus.OK);
        expect(header['content-type']).to.match(/json/iu);
        // JSON-Array mit mind. 1 JSON-Objekt
        expect(body).not.to.be.empty;

        // Jedes Kunde hat im Array der Schlagwoerter "javascript"
        body.map(
            (kunde: KundeData) => kunde.kundenart,
        ).forEach((s: Array<string>) =>
            expect(s).to.include(schlagwort.toUpperCase()),
        );
    });

    test('Keine Kunden mit der Kundenart "Subunternehmer"', async () => {
        // given
        const schlagwort = 'Subunternehmer';

        // when
        const response = await request(server)
            .get(`${path}?${schlagwort}=true`)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.NOT_FOUND);
        // Leerer Rumpf
        expect(Object.entries(body)).to.be.empty;
    });
});
