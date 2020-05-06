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

import { Schema, model } from 'mongoose';
import { autoIndex, optimistic } from '../../shared';

// Eine Collection in MongoDB besteht aus Dokumenten im BSON-Format

// Mongoose ist von Valeri Karpov, der auch den Begriff "MEAN-Stack" gepraegt hat:
// http://thecodebarbarian.com/2013/04/29//easy-web-prototyping-with-mongodb-and-nodejs
// Ein Schema in Mongoose definiert die Struktur und Methoden fuer die
// Dokumente in einer Collection.
// Ein Property im Schema definiert eine Property fuer jedes Dokument.
// Ein Schematyp (String, Number, Boolean, Date, Array, ObjectId) legt den Typ
// der Property fest.
// Objection.js ist ein alternatives Werkzeug für ORM:
// http://vincit.github.io/objection.js

// https://mongoosejs.com/docs/schematypes.html
export const kundeSchema = new Schema(
    {
        // MongoDB erstellt implizit einen Index fuer _id
        _id: { type: String },
        vorname: { type: String, required: true, unique: false },
        nachname: { type: String, required: true },
        kundenart: { type: String, enum: ['Privatkunde', 'Gewerbekunde'] },
        geschlecht: {
            type: String,
            required: true,
            enum: ['M', 'W'],
        },
        hausnummer: { type: Number, required: true },
        plz: Number,
        aktiv: Boolean,
        registrierungsdatum: Date,
        strasse: { type: String, required: true, unique: true },
        zusatzinfo: String,
        bestellungen: [Schema.Types.Mixed],
    },
    {
        toJSON: { getters: true, virtuals: false },
        // createdAt und updatedAt als automatisch gepflegte Felder
        timestamps: true,
        autoIndex,
    },
);

// Optimistische Synchronisation durch das Feld __v fuer die Versionsnummer
kundeSchema.plugin(optimistic);

// Methoden zum Schema hinzufuegen, damit sie spaeter beim Model (s.u.)
// verfuegbar sind, was aber bei kunde.check() zu eines TS-Syntaxfehler fuehrt:
// schema.methods.check = () => {...}
// schema.statics.findByVorname =
//     (vorname: string, cb: Function) =>
//         return this.find({vorname: vorname}, cb)

// Ein Model ist ein uebersetztes Schema und stellt die CRUD-Operationen fuer
// die Dokumente bereit, d.h. das Pattern "Active Record" wird realisiert.
// Name des Models = Name der Collection
export const KundeModel = model('Kunde', kundeSchema);
