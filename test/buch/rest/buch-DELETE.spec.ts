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

/* globals describe, expect, test, beforeAll, beforeEach, afterAll */

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
const id = '00000000-0000-0000-0000-000000000005';

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
describe('DELETE /buecher', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => (server = await createTestserver()));

    afterAll(async () => {
        server.close();
        // "open handle error (TCPSERVERWRAP)" bei Supertest mit Jest vermeiden
        // https://github.com/visionmedia/supertest/issues/520
        await new Promise(resolve => setTimeout(() => resolve(), 1000)); // eslint-disable-line @typescript-eslint/no-magic-numbers
    });

    test('Vorhandenes Buch loeschen', async () => {
        // given: idDeleteVorhanden
        let response = await request(server)
            .post(`${loginPath}`)
            .set('Content-type', 'application/x-www-form-urlencoded')
            .send(loginDaten)
            .trustLocalhost();
        const { token } = response.body;

        // when
        response = await request(server)
            .delete(`${path}/${id}`)
            .set('Authorization', `Bearer ${token}`)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.NO_CONTENT);
        expect(Object.entries(body)).to.be.empty;
    });

    test('Buch loeschen, aber ohne Token', async () => {
        // given: idDeleteVorhanden

        // when
        const response = await request(server)
            .delete(`${path}/${id}`)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.be.empty;
    });

    test('Buch loeschen, aber mit falschem Token', async () => {
        // given: geaendertesBuch
        const falscherToken = 'x';

        // when
        const response = await request(server)
            .delete(`${path}/${id}`)
            .set('Authorization', `Bearer ${falscherToken}`)
            .trustLocalhost();

        // then
        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.be.empty;
    });
});
