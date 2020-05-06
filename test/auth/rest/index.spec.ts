/* eslint-disable max-lines,max-lines-per-function,no-underscore-dangle */

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

import { HttpStatus } from '../../../src/shared';
import { PATHS } from '../../../src/app';
import type { Server } from 'http';
import { createTestserver } from '../../createTestserver';
import { expect } from 'chai';
import request from 'supertest';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const passwordKorrekt: object = {
    username: 'admin',
    password: 'p',
};

const passwordFalsch: object = {
    username: 'admin',
    password: 'FALSCH',
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------

let server: Server;
const loginPath = PATHS.login;

// Test-Suite
describe('REST-Schnittstelle /login', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => (server = await createTestserver()));

    afterAll(async () => {
        server.close();
        // "open handle error (TCPSERVERWRAP)" bei Supertest mit Jest vermeiden
        // https://github.com/visionmedia/supertest/issues/520
        await new Promise(resolve => setTimeout(() => resolve(), 500)); // eslint-disable-line @typescript-eslint/no-magic-numbers
    });

    test('Login mit korrektem Passwort', async () => {
        const response = await request(server)
            .post(`${loginPath}`)
            .set('Content-type', 'application/x-www-form-urlencoded')
            .send(passwordKorrekt)
            .trustLocalhost();

        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.OK);
        expect(body.token as string).to.match(/.+\..+\..+/u);
    });

    test('Login mit falschem Passwort', async () => {
        const response = await request(server)
            .post(`${loginPath}`)
            .set('Content-type', 'application/x-www-form-urlencoded')
            .send(passwordFalsch)
            .trustLocalhost();

        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.have.lengthOf(0);
    });

    test('Login ohne Benutzerkennung', async () => {
        const response = await request(server)
            .post(`${loginPath}`)
            .set('Content-type', 'application/x-www-form-urlencoded')
            .send({})
            .trustLocalhost();

        const { status, body } = response;
        expect(status).to.be.equal(HttpStatus.UNAUTHORIZED);
        expect(Object.entries(body)).to.have.lengthOf(0);
    });
});
