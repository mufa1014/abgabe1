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
import type { BuchData } from '../../../src/buch/entity/types';
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
const path = PATHS.buecher;
let server: Server;

// Test-Suite
describe('GET /buecher', () => {
    beforeAll(async () => (server = await createTestserver()));

    afterAll(async () => {
        server.close();
        // "open handle error (TCPSERVERWRAP)" bei Supertest mit Jest vermeiden
        // https://github.com/visionmedia/supertest/issues/520
        await new Promise(resolve => setTimeout(() => resolve(), 1000)); // eslint-disable-line @typescript-eslint/no-magic-numbers
    });

    test('Alle Buecher', async () => {
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

    test('Buecher mit einem Titel, der ein "a" enthaelt', async () => {
        // given
        const teilTitel = 'a';

        // when
        const response = await request(server)
            .get(`${path}?titel=${teilTitel}`)
            .trustLocalhost();

        // then
        const { status, header, body } = response;
        expect(status).to.be.equal(HttpStatus.OK);
        expect(header['content-type']).to.match(/json/iu);
        // response.body ist ein JSON-Array mit mind. 1 JSON-Objekt
        expect(body).not.to.be.empty;

        // Jedes Buch hat einen Titel mit dem Teilstring 'a'
        body.map((buch: BuchData) => buch.titel).forEach((titel: string) =>
            expect(titel).to.have.string(teilTitel),
        );
    });

    test('Keine Buecher mit einem Titel, der "XX" enthaelt', async () => {
        // given
        const teilTitel = 'XX';

        // when
        const response = await request(server)
            .get(`${path}?titel=${teilTitel}`)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.NOT_FOUND);
        // Leerer Rumpf
        expect(Object.entries(body)).to.be.empty;
    });

    test('Mind. 1 Buch mit dem Schlagwort "javascript"', async () => {
        // given
        const schlagwort = 'javascript';

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

        // Jedes Buch hat im Array der Schlagwoerter "javascript"
        body.map(
            (buch: BuchData) => buch.schlagwoerter,
        ).forEach((s: Array<string>) =>
            expect(s).to.include(schlagwort.toUpperCase()),
        );
    });

    test('Keine Buecher mit dem Schlagwort "csharp"', async () => {
        // given
        const schlagwort = 'csharp';

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
