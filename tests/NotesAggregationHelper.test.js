import { describe, test, expect } from '@jest/globals';
import { NotesAggregationHelper } from '../src/dataProviders/NotesAggregationHelper.js';

describe('NotesAggregationHelper', () => {
    const helper = new NotesAggregationHelper();

    const creaAlumne = () => ({
        avaluacions: [
            { codi: 'FINAL_1', id: 'ava1' },
            { codi: 'FINAL_2', id: 'ava2' },
            { codi: 'FINAL_3', id: 'ava3' },
        ],
        continguts: {
            ava1: [
                { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A6' },
                { codi: 'M02', nom: 'Mòdul 2 antic', jerarquia: '2', qualitativa: 'A4' },
                null,
                { nom: 'Sense codi', jerarquia: '2', qualitativa: 'A7' },
            ],
            ava2: [
                { codi: 'M02', nom: 'Mòdul 2 nou', jerarquia: '2', qualitativa: 'A8' },
            ],
            ava3: null,
        },
    });

    test('hauria de mantenir notes anteriors i sobreescriure pel mateix codi amb valors posteriors', () => {
        const notes = helper.obtéNotesAgregades(creaAlumne(), 3);

        expect(notes.map(nota => nota.codi)).toEqual(['M01', 'M02']);
        expect(notes.find(nota => nota.codi === 'M01').qualitativa).toBe('A6');
        expect(notes.find(nota => nota.codi === 'M02')).toMatchObject({ nom: 'Mòdul 2 nou', qualitativa: 'A8' });
    });

    test('hauria d’ignorar continguts nuls o sense codi sense fallar', () => {
        expect(() => helper.obtéNotesAgregades(creaAlumne(), 3)).not.toThrow();
        expect(helper.obtéNotesAgregades(creaAlumne(), 3)).toHaveLength(2);
    });

    test('hauria de resoldre avaluacions per codi FINAL_n encara que vinguin desordenades', () => {
        const alumne = {
            avaluacions: [
                { codi: 'FINAL_2', id: 'ava2' },
                { codi: 'FINAL_1', id: 'ava1' },
            ],
            continguts: {
                ava1: [
                    { codi: 'M01', nom: 'Mòdul 1 antic', jerarquia: '2', qualitativa: 'A5' },
                    { codi: 'M02', nom: 'Mòdul 2', jerarquia: '2', qualitativa: 'A6' },
                ],
                ava2: [
                    { codi: 'M01', nom: 'Mòdul 1 nou', jerarquia: '2', qualitativa: 'A9' },
                ],
            },
        };

        const notes = helper.obtéNotesAgregades(alumne, 2);

        expect(notes.map(nota => nota.codi)).toEqual(['M01', 'M02']);
        expect(notes.find(nota => nota.codi === 'M01')).toMatchObject({ nom: 'Mòdul 1 nou', qualitativa: 'A9' });
    });

    test('hauria d’usar els codis FINAL_n en ordre numèric si maxAvaluacions no és vàlid', () => {
        const alumne = {
            avaluacions: [
                { codi: 'FINAL_2', id: 'ava2' },
                { codi: 'PARCIAL_1', id: 'parcial1' },
                { codi: 'FINAL_1', id: 'ava1' },
            ],
            continguts: {
                ava1: [
                    { codi: 'M01', nom: 'Mòdul 1 antic', jerarquia: '2', qualitativa: 'A5' },
                ],
                ava2: [
                    { codi: 'M01', nom: 'Mòdul 1 nou', jerarquia: '2', qualitativa: 'A9' },
                ],
                parcial1: [
                    { codi: 'M02', nom: 'No hauria d’entrar', jerarquia: '2', qualitativa: 'A10' },
                ],
            },
        };

        const notes = helper.obtéNotesAgregades(alumne, undefined);

        expect(notes.map(nota => nota.codi)).toEqual(['M01']);
        expect(notes[0]).toMatchObject({ nom: 'Mòdul 1 nou', qualitativa: 'A9' });
    });

    test('hauria de reconèixer només el mode agregat canònic', () => {
        expect(NotesAggregationHelper.MODE_AGREGAT).toBe('agregat');
        expect(helper.ésModeAgregació('agregat')).toBe(true);
        expect(helper.ésModeAgregació('Agregat')).toBe(false);
        expect(helper.ésModeAgregació(2)).toBe(false);
    });
});
