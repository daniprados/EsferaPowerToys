import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import ExcelJS from 'exceljs';
import { ExcelNotesWorkbookBuilder } from '../src/excel/ExcelNotesWorkbookBuilder.js';

describe('ExcelNotesWorkbookBuilder', () => {
    let builder;

    const creaDadesAlumnes = () => ([
        {
            idAlumne: '1',
            nom: 'Alumna',
            avaluacions: [
                { codi: 'FINAL_1', id: 'ava1' },
                { codi: 'FINAL_2', id: 'ava2' },
            ],
            continguts: {
                ava1: [
                    { codi: 'M03', nom: 'Mòdul 3', jerarquia: '2', qualitativa: 'A8', convocatoria: '1' },
                    { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A6' },
                    { codi: 'M02', nom: 'RA 2', jerarquia: '3', qualitativa: 'A4' },
                    { codi: 'M04', nom: 'Mòdul 4', jerarquia: '2', qualitativa: 'NA', convocatoria: '2' },
                ],
                ava2: [
                    { codi: 'M05', nom: 'Mòdul 5', jerarquia: '2', qualitativa: 'A9', convocatoria: '1' },
                    { codi: 'M06', nom: 'Mòdul 6', jerarquia: '2', qualitativa: 'PDT' },
                    { codi: 'M07', nom: 'Mòdul 7', jerarquia: '2', qualitativa: 'PDT', provisional: 8 },
                ],
            },
        },
    ]);

    const creaWorksheet = (dadesAlumnes = creaDadesAlumnes(), evaluation = 1) => {
        const workbook = builder.construeixWorkbookNotes(dadesAlumnes, evaluation);
        return workbook.getWorksheet('Notes');
    };

    const creaWorkbook = (dadesAlumnes = creaDadesAlumnes(), evaluation = 1) => (
        builder.construeixWorkbookNotes(dadesAlumnes, evaluation)
    );

    const obtéFiles = worksheet => {
        const files = [];
        worksheet.eachRow(row => files.push(row.values.slice(1)));
        return files;
    };

    beforeEach(() => {
        builder = new ExcelNotesWorkbookBuilder(ExcelJS);
    });

    test('hauria de congelar les dues primeres files i columnes', () => {
        const worksheet = creaWorksheet();

        expect(worksheet.views).toEqual([{ state: 'frozen', xSplit: 2, ySplit: 2 }]);
    });

    test('hauria de crear les pestanyes Notes i Notes Flat', () => {
        const workbook = creaWorkbook();

        expect(workbook.worksheets.map(worksheet => worksheet.name)).toEqual(['Notes', 'Notes Flat', 'Resum mòduls', 'Resum avaluació']);
    });

    test('hauria de crear les pestanyes de totes les avaluacions en ordre', () => {
        const workbook = builder.construeixWorkbookTotesLesAvaluacions(creaDadesAlumnes(), 2);

        expect(workbook.worksheets.map(worksheet => worksheet.name)).toEqual(['Av 1', 'Av 2', 'Agregat', 'Notes Flat (Agregat)', 'Resum mòduls (Agregat)', 'Resum avaluació']);
    });

    test('hauria de resumir l’estat de la darrera avaluació disponible de cada alumne', () => {
        const worksheet = creaWorkbook([
            {
                idAlumne: '1', nom: 'Promociona',
                avaluacions: [{ codi: 'F2', id: 'ava2', estat: 'CF_SUPERA' }, { codi: 'F1', id: 'ava1', estat: 'CF_REP' }],
                continguts: { ava1: [], ava2: [] },
            },
            {
                idAlumne: '2', nom: 'Roman',
                avaluacions: [{ codi: 'FINAL_1', id: 'ava1', estat: 'CF_REP' }],
                continguts: { ava1: [] },
            },
            {
                idAlumne: '3', nom: 'Pendent',
                avaluacions: [{ codi: 'FINAL_2', id: 'ava2', estat: 'CF_SEG_AVAL' }],
                continguts: { ava2: [] },
            },
            {
                idAlumne: '4', nom: 'Sense estat',
                avaluacions: [{ codi: 'FINAL_2', id: 'ava2', estat: '' }],
                continguts: { ava2: [] },
            },
            {
                idAlumne: '5', nom: 'Titula',
                avaluacions: [
                    { codi: 'FINAL_2', id: 'ava2', estat: '' },
                    { codi: 'FINAL_1', id: 'ava1', estat: 'CF_TITOL' },
                ],
                continguts: { ava1: [], ava2: [] },
            },
        ]).getWorksheet('Resum avaluació');

        expect(worksheet.getRow(1).values.slice(1)).toEqual([
            'Estat', 'Codi', 'Alumnes', 'Percentatge', '',
            'idAlumne', 'Alumne', 'Darrera avaluació', 'Codi estat', 'Estat',
        ]);
        expect(worksheet.getRow(2).values.slice(1, 5)).toEqual(['Obté el títol del Cicle Formatiu', 'CF_TITOL', 1, 1 / 5]);
        expect(worksheet.getRow(3).values.slice(1, 5)).toEqual(['Accedeix al curs següent', 'CF_SUPERA', 1, 1 / 5]);
        expect(worksheet.getRow(4).values.slice(1, 5)).toEqual(['Roman al mateix curs', 'CF_REP', 1, 1 / 5]);
        expect(worksheet.getRow(5).values.slice(1, 5)).toEqual(['Pendent de la següent avaluació', 'CF_SEG_AVAL', 1, 1 / 5]);
        expect(worksheet.getRow(6).values.slice(1, 5)).toEqual(['No informat', '', 1, 1 / 5]);
        expect(worksheet.getRow(2).values.slice(6)).toEqual(['1', 'Promociona', 'F2', 'CF_SUPERA', 'Accedeix al curs següent']);
        expect(worksheet.getRow(6).values.slice(6)).toEqual(['5', 'Titula', 'FINAL_1', 'CF_TITOL', 'Obté el títol del Cicle Formatiu']);
        expect(worksheet.getCell('D2').numFmt).toBe('0.0%');
    });

    test('hauria d’afegir l’estat de l’avaluació al final del full Notes', () => {
        const worksheet = creaWorkbook([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [{ codi: 'FINAL_1', id: 'ava1', estat: 'CF_TITOL' }],
                continguts: { ava1: [{ codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A8' }] },
            },
        ]).getWorksheet('Notes');

        expect(worksheet.getCell('F1').value).toBe('Estat');
        expect(worksheet.getCell('F2').value).toBe('Estat');
        expect(worksheet.getCell('F3').value).toBe('CF_TITOL');
    });

    test('hauria de resumir les dues convocatòries i aprovar el mòdul amb estada si tots els altres RA estan superats', () => {
        const worksheet = creaWorkbook([
            {
                idAlumne: '1', nom: 'Alumna 1', avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: { ava1: [
                    { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'PQ', convocatoria: '2' },
                    { codi: 'M01_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A7' },
                    { codi: 'M01_02EM', nom: 'Estada en empresa', jerarquia: '3', qualitativa: 'PDT' },
                    { codi: 'M01_03RA', nom: 'RA 2', jerarquia: '3', qualitativa: 'PDT' },
                ] },
            },
            {
                idAlumne: '2', nom: 'Alumna 2', avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: { ava1: [
                    { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A6', convocatoria: '2' },
                    { codi: 'M01_03RA', nom: 'RA 2', jerarquia: '3', qualitativa: 'A6' },
                ] },
            },
            {
                idAlumne: '3', nom: 'Alumna 3', avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: { ava1: [
                    { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A4' },
                ] },
            },
            {
                idAlumne: '4', nom: 'Alumna 4', avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: { ava1: [
                    { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A8' },
                    { codi: 'M01_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'PDT' },
                    { codi: 'M01_03RA', nom: 'RA 2', jerarquia: '3', qualitativa: 'NA' },
                    { codi: 'M01_02RA', nom: 'Estada en empresa', jerarquia: '3', qualitativa: 'PQ' },
                ] },
            },
            {
                idAlumne: '5', nom: 'Alumna 5', avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: { ava1: [
                    { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'NA', convocatoria: '1' },
                    { codi: 'M01_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A7' },
                    { codi: 'M01_02EM', nom: 'Formació pràctica', jerarquia: '3', qualitativa: 'PDT' },
                ] },
            },
            {
                idAlumne: '6', nom: 'Alumna 6', avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: { ava1: [
                    { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'NP', convocatoria: '2' },
                ] },
            },
        ]).getWorksheet('Resum mòduls');

        expect(worksheet.getRow(1).values.slice(1)).toEqual([
            'Codi mòdul', 'Mòdul',
            '1a convocatòria: avaluats', '1a convocatòria: aprovats', '1a convocatòria: percentatge',
            '2a convocatòria: avaluats', '2a convocatòria: aprovats', '2a convocatòria: percentatge',
            'Total: matriculats', 'Total: aprovats', 'Total: percentatge',
        ]);
        expect(worksheet.getRow(2).values.slice(1)).toEqual([
            'M01', 'Mòdul 1',
            6, 1, 1 / 6,
            2, 1, 1 / 2,
            6, 2, 1 / 3,
        ]);
        expect(worksheet.getCell('E2').numFmt).toBe('0.0%');
    });

    test('no hauria d’aprovar un mòdul sense nota final si no conté cap estada en empresa', () => {
        const worksheet = creaWorkbook([
            {
                idAlumne: '1', nom: 'Amb estada', avaluacions: [{ codi: 'F1', id: 'ava1' }],
                continguts: { ava1: [
                    { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: '' },
                    { codi: 'M01_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A7' },
                    { codi: 'M01_01EM', nom: 'Pràctiques', jerarquia: '3', qualitativa: '' },
                ] },
            },
            {
                idAlumne: '2', nom: 'Sense estada', avaluacions: [{ codi: 'F1', id: 'ava1' }],
                continguts: { ava1: [
                    { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: '' },
                    { codi: 'M01_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A7' },
                ] },
            },
        ]).getWorksheet('Resum mòduls');

        expect(worksheet.getRow(2).values.slice(1)).toEqual([
            'M01', 'Mòdul 1',
            2, 1, 1 / 2,
            0, 0, 0,
            2, 1, 1 / 2,
        ]);
    });

    test('hauria d’agregar mantenint mòduls d’avaluacions anteriors quan falten a les posteriors', () => {
        const workbook = builder.construeixWorkbookTotesLesAvaluacions([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [
                    { codi: 'FINAL_1', id: 'ava1' },
                    { codi: 'FINAL_2', id: 'ava2' },
                ],
                continguts: {
                    ava1: [
                        { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A6' },
                        { codi: 'M02', nom: 'Mòdul 2', jerarquia: '2', qualitativa: 'A5' },
                        null,
                        { nom: 'Sense codi', jerarquia: '2', qualitativa: 'A7' },
                    ],
                    ava2: [
                        { codi: 'M02', nom: 'Mòdul 2', jerarquia: '2', qualitativa: 'A8' },
                    ],
                },
            },
        ], 2);
        const worksheet = workbook.getWorksheet('Agregat');

        expect(worksheet.getRow(2).values.slice(1)).toEqual(['idAlumne', 'nom', 'n. convocatoria', 'M01', 'provisional', 'n. convocatoria', 'M02', 'provisional', 'Estat']);
        expect(worksheet.getRow(3).values.slice(1)).toEqual(['1', 'Alumna', undefined, 6, undefined, undefined, 8, undefined, '']);
    });

    test('hauria d’obtenir l’estat de la darrera avaluació final dins del màxim agregat', () => {
        const worksheet = builder.construeixWorkbookNotes([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [
                    { codi: 'FINAL_3', id: 'ava3', estat: 'CF_TITOL' },
                    { codi: 'ALTRE', id: 'altra', estat: 'ESTAT_NO_FINAL' },
                    { codi: 'FINAL_1', id: 'ava1', estat: 'CF_REP' },
                    { codi: 'FINAL_2', id: 'ava2', estat: 'CF_SUPERA' },
                ],
                continguts: { ava1: [], ava2: [], ava3: [], altra: [] },
            },
        ], 'agregat', 2).getWorksheet('Notes');

        expect(worksheet.getRow(3).values.at(-1)).toBe('CF_SUPERA');
    });

    test('hauria d’usar l’última entrada original si no hi ha cap avaluació final reconeguda', () => {
        const worksheet = builder.construeixWorkbookNotes([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [
                    { codi: 'INICIAL', id: 'inicial', estat: 'CF_REP' },
                    { codi: 'EXTRAORDINARIA', id: 'extra', estat: 'CF_TITOL' },
                ],
                continguts: { inicial: [], extra: [] },
            },
        ], 'agregat', 2).getWorksheet('Notes');

        expect(worksheet.getRow(3).values.at(-1)).toBe('CF_TITOL');
    });

    test('hauria de comptar a segona un mòdul amb estada superat a F2 encara que Esfer@ mantingui la convocatòria 1', () => {
        const dadesAlumnes = [
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [
                    { codi: 'FINAL_1', id: 'ava1' },
                    { codi: 'FINAL_2', id: 'ava2' },
                ],
                continguts: {
                    ava1: [
                        { codi: '0485_ICC0', nom: 'Programació', jerarquia: '2', qualitativa: 'PQ', convocatoria: '1' },
                        { codi: '0485_ICC0_01EM', nom: "Estada a l'empresa", jerarquia: '3', qualitativa: 'PDT' },
                        { codi: '0485_ICC0_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A5' },
                        { codi: '0485_ICC0_02RA', nom: 'RA 2', jerarquia: '3', qualitativa: 'NA' },
                        { codi: '0485_ICC0_04RA', nom: 'RA 4', jerarquia: '3', qualitativa: 'NA' },
                        { codi: '0485_ICC0_07RA', nom: 'RA 7', jerarquia: '3', qualitativa: 'NA' },
                    ],
                    ava2: [
                        { codi: '0485_ICC0', nom: 'Programació', jerarquia: '2', qualitativa: 'PQ', convocatoria: '1' },
                        { codi: '0485_ICC0_01EM', nom: "Estada a l'empresa", jerarquia: '3', qualitativa: 'PDT' },
                        { codi: '0485_ICC0_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A5' },
                        { codi: '0485_ICC0_02RA', nom: 'RA 2', jerarquia: '3', qualitativa: 'A8' },
                        { codi: '0485_ICC0_04RA', nom: 'RA 4', jerarquia: '3', qualitativa: 'A8' },
                        { codi: '0485_ICC0_07RA', nom: 'RA 7', jerarquia: '3', qualitativa: 'A8' },
                    ],
                },
            },
            {
                idAlumne: '2',
                nom: 'Alumne encara no aprovat',
                avaluacions: [
                    { codi: 'FINAL_1', id: 'ava1' },
                    { codi: 'FINAL_2', id: 'ava2' },
                ],
                continguts: {
                    ava1: [
                        { codi: '0485_ICC0', nom: 'Programació', jerarquia: '2', qualitativa: 'PQ', convocatoria: '1' },
                        { codi: '0485_ICC0_01EM', nom: "Estada a l'empresa", jerarquia: '3', qualitativa: 'PDT' },
                        { codi: '0485_ICC0_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'NA' },
                    ],
                    ava2: [
                        { codi: '0485_ICC0', nom: 'Programació', jerarquia: '2', qualitativa: 'PQ', convocatoria: '1' },
                        { codi: '0485_ICC0_01EM', nom: "Estada a l'empresa", jerarquia: '3', qualitativa: 'PDT' },
                        { codi: '0485_ICC0_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'NA' },
                    ],
                },
            },
            {
                idAlumne: '3',
                nom: 'Alumne aprovat a F1',
                avaluacions: [
                    { codi: 'FINAL_1', id: 'ava1' },
                    { codi: 'FINAL_2', id: 'ava2' },
                ],
                continguts: {
                    ava1: [
                        { codi: '0485_ICC0', nom: 'Programació', jerarquia: '2', qualitativa: 'PQ', convocatoria: '2' },
                        { codi: '0485_ICC0_01EM', nom: "Estada a l'empresa", jerarquia: '3', qualitativa: 'PDT' },
                        { codi: '0485_ICC0_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A5' },
                    ],
                    ava2: [
                        { codi: '0485_ICC0', nom: 'Programació', jerarquia: '2', qualitativa: 'PQ', convocatoria: '2' },
                        { codi: '0485_ICC0_01EM', nom: "Estada a l'empresa", jerarquia: '3', qualitativa: 'PDT' },
                        { codi: '0485_ICC0_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A5' },
                    ],
                },
            },
        ];
        const workbook = builder.construeixWorkbookTotesLesAvaluacions(dadesAlumnes, 2);
        const resumEsperat = [
            '0485_ICC0', 'Programació',
            3, 1, 1 / 3,
            2, 1, 1 / 2,
            3, 2, 2 / 3,
        ];

        expect(workbook.getWorksheet('Resum mòduls (Agregat)').getRow(2).values.slice(1)).toEqual(resumEsperat);
        expect(builder.construeixWorkbookNotes(dadesAlumnes, 2).getWorksheet('Resum mòduls').getRow(2).values.slice(1)).toEqual(resumEsperat);
    });

    test('hauria d’aplicar l’agregació només amb el mode agregat canònic', () => {
        const worksheet = builder.construeixWorkbookNotes([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [
                    { codi: 'FINAL_1', id: 'ava1' },
                    { codi: 'FINAL_2', id: 'ava2' },
                ],
                continguts: {
                    ava1: [
                        { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A6' },
                        { codi: 'M02', nom: 'Mòdul 2', jerarquia: '2', qualitativa: 'A5' },
                    ],
                    ava2: [
                        { codi: 'M02', nom: 'Mòdul 2', jerarquia: '2', qualitativa: 'A9' },
                    ],
                },
            },
        ], 'agregat', 2).getWorksheet('Notes');

        expect(worksheet.getRow(2).values.slice(1)).toEqual(['idAlumne', 'nom', 'n. convocatoria', 'M01', 'provisional', 'n. convocatoria', 'M02', 'provisional', 'Estat']);
        expect(worksheet.getRow(3).values.slice(1)).toEqual(['1', 'Alumna', undefined, 6, undefined, undefined, 9, undefined, '']);
    });

    test('hauria d’usar el helper compartit per resoldre l’agregació canònica', () => {
        const notesAgregades = [{ codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A7' }];
        const aggregationHelper = {
            ésModeAgregació: jest.fn(evaluation => evaluation === 'agregat'),
            obtéNotesAgregades: jest.fn(() => notesAgregades),
            obtéAvaluacionsFinals: jest.fn(() => []),
        };
        builder = new ExcelNotesWorkbookBuilder(ExcelJS, undefined, aggregationHelper);

        const worksheet = builder.construeixWorkbookNotes([
            { idAlumne: '1', nom: 'Alumna', continguts: {}, avaluacions: [] },
        ], 'agregat', 2).getWorksheet('Notes');

        expect(aggregationHelper.ésModeAgregació).toHaveBeenCalledWith('agregat');
        expect(aggregationHelper.obtéNotesAgregades).toHaveBeenCalledWith(expect.any(Object), 2);
        expect(worksheet.getRow(3).values.slice(1)).toEqual(['1', 'Alumna', undefined, 7, undefined, '']);
    });

    test('hauria de generar la capçalera exacta de Notes Flat', () => {
        const worksheet = creaWorkbook().getWorksheet('Notes Flat');

        expect(worksheet.getRow(1).values.slice(1)).toEqual([
            'idAlumne',
            'nom Alumne',
            'Codi Mòdul',
            'Nom Mòdul',
            'Codi',
            'Nom',
            'Tipus',
            'Subtipus',
            'Nota',
        ]);
    });

    test('hauria de generar files planes per MP, RA i EM amb el mòdul pare', () => {
        const worksheet = creaWorkbook([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: {
                    ava1: [
                        { codi: '0484_ICC0', nom: 'Bases de dades', jerarquia: '2', qualitativa: 'A8' },
                        { codi: '0484_ICC0_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A6' },
                        { codi: '0484_ICC0_01EM', nom: 'EM 1', jerarquia: '4', qualitativa: 'A5' },
                    ],
                },
            },
        ]).getWorksheet('Notes Flat');

        expect(obtéFiles(worksheet).slice(1)).toEqual([
            ['1', 'Alumna', '0484_ICC0', 'Bases de dades', '0484_ICC0', 'Bases de dades', 'MP', 'MP', 8],
            ['1', 'Alumna', '0484_ICC0', 'Bases de dades', '0484_ICC0_01RA', 'RA 1', 'RA', '01', 6],
            ['1', 'Alumna', '0484_ICC0', 'Bases de dades', '0484_ICC0_01EM', 'EM 1', 'EM', '01', 5],
        ]);
    });

    test('hauria de posar Subtipus MP per les files de mòdul professional', () => {
        const worksheet = creaWorkbook().getWorksheet('Notes Flat');

        const filaModul = worksheet.getRow(2).values.slice(1);

        expect(filaModul[6]).toBe('MP');
        expect(filaModul[7]).toBe('MP');
    });

    test('hauria d’activar autofilter a totes les columnes de Notes Flat', () => {
        const worksheet = creaWorkbook().getWorksheet('Notes Flat');

        expect(worksheet.autoFilter).toEqual({
            from: { row: 1, column: 1 },
            to: { row: 1, column: 9 },
        });
    });

    test('hauria de congelar les dues primeres columnes i la capçalera de Notes Flat', () => {
        const worksheet = creaWorkbook().getWorksheet('Notes Flat');

        expect(worksheet.views).toEqual([{ state: 'frozen', xSplit: 2, ySplit: 1 }]);
    });

    test('hauria de deixar buit el nom del mòdul pare si el contingut RA no té el mòdul disponible', () => {
        const worksheet = creaWorkbook([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: {
                    ava1: [
                        { codi: '0484_ICC0_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A7' },
                    ],
                },
            },
        ]).getWorksheet('Notes Flat');

        expect(worksheet.getRow(2).values.slice(1)).toEqual([
            '1', 'Alumna', '0484_ICC0', '', '0484_ICC0_01RA', 'RA 1', 'RA', '01', 7,
        ]);
    });

    test('hauria de normalitzar les notes de Notes Flat igual que Notes', () => {
        const workbook = creaWorkbook([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: {
                    ava1: [
                        { codi: '0484_ICC0', nom: 'Bases de dades', jerarquia: '2', quantitativa: '7,5', qualitativa: 'A8' },
                        { codi: '0484_ICC0_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A8' },
                    ],
                },
            },
        ]);

        expect(workbook.getWorksheet('Notes').getCell('D3').value).toBe(7.5);
        expect(workbook.getWorksheet('Notes Flat').getRow(2).getCell(9).value).toBe(7.5);
        expect(workbook.getWorksheet('Notes Flat').getRow(3).getCell(9).value).toBe(8);
    });

    test('hauria d’usar el helper compartit per obtenir i classificar notes', () => {
        const helper = {
            obtéValorContingut: jest.fn(() => 6),
            ésNotaNumericaAprovada: jest.fn(() => true),
            ésResultatSuperat: jest.fn(() => true),
        };
        builder = new ExcelNotesWorkbookBuilder(ExcelJS, helper);

        const worksheet = creaWorksheet([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: { ava1: [{ codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A6' }] },
            },
        ]);

        expect(worksheet.getCell('D3').value).toBe(6);
        expect(helper.obtéValorContingut).toHaveBeenCalled();
        expect(helper.ésNotaNumericaAprovada).toHaveBeenCalledWith(6);
    });

    test('hauria d’usar les notes de l’avaluació seleccionada', () => {
        const worksheet = creaWorksheet(creaDadesAlumnes(), 2);

        expect(worksheet.getRow(2).values.slice(1)).toEqual(['idAlumne', 'nom', 'n. convocatoria', 'M05', 'provisional', 'n. convocatoria', 'M06', 'provisional', 'n. convocatoria', 'M07', 'provisional', 'Estat']);
        expect(worksheet.getRow(3).values.slice(1)).toEqual(['1', 'Alumna', '1', 9, undefined, undefined, 'PDT', undefined, undefined, 'PDT', 8, '']);
    });

    test('hauria de seleccionar F2 pel codi encara que les avaluacions vinguin desordenades', () => {
        const worksheet = creaWorksheet([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [
                    { codi: 'F2', id: 'ava2', estat: 'CF_TITOL' },
                    { codi: 'F1', id: 'ava1', estat: 'CF_SEG_AVAL' },
                ],
                continguts: {
                    ava1: [{ codi: 'M01', nom: 'Primera', jerarquia: '2', qualitativa: 'A5' }],
                    ava2: [{ codi: 'M02', nom: 'Segona', jerarquia: '2', qualitativa: 'A9' }],
                },
            },
        ], 2);

        expect(worksheet.getRow(2).values.slice(1)).toEqual(['idAlumne', 'nom', 'n. convocatoria', 'M02', 'provisional', 'Estat']);
        expect(worksheet.getRow(3).values.slice(1)).toEqual(['1', 'Alumna', undefined, 9, undefined, 'CF_TITOL']);
    });

    test('hauria de generar les columnes en ordre determinista per codi de contingut', () => {
        const worksheet = creaWorksheet();

        expect(worksheet.getRow(2).values.slice(1)).toEqual(['idAlumne', 'nom', 'n. convocatoria', 'M01', 'provisional', 'M02', 'n. convocatoria', 'M03', 'provisional', 'n. convocatoria', 'M04', 'provisional', 'Estat']);
        expect(worksheet.getRow(3).values.slice(1)).toEqual(['1', 'Alumna', undefined, 6, undefined, 4, '1', 8, undefined, '2', 'NA', undefined, '']);
    });

    test('hauria d’excloure QFINAL i QUNIVERSITAT de Notes i Resum mòduls però conservar-los a Notes Flat', () => {
        const workbook = creaWorkbook([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: {
                    ava1: [
                        { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: 'A7' },
                        { codi: 'QFINAL', nom: "Qualificació final de l'ensenyament", jerarquia: '2', quantitativa: '7' },
                        { codi: 'QUNIVERSITAT', nom: "Qualificació d'accés a la universitat", jerarquia: '2', quantitativa: '8' },
                    ],
                },
            },
        ]);
        const codisNotes = workbook.getWorksheet('Notes').getRow(2).values.slice(1);
        const codisFlat = obtéFiles(workbook.getWorksheet('Notes Flat')).slice(1).map(fila => fila[4]);
        const codisResum = obtéFiles(workbook.getWorksheet('Resum mòduls')).slice(1).map(fila => fila[0]);

        expect(codisNotes).toContain('M01');
        expect(codisNotes).not.toContain('QFINAL');
        expect(codisNotes).not.toContain('QUNIVERSITAT');
        expect(codisFlat).toEqual(['M01', 'QFINAL', 'QUNIVERSITAT']);
        expect(codisResum).toEqual(['M01']);
    });

    test('hauria de pintar de verd només les notes numèriques iguals o superiors a cinc', () => {
        const worksheet = creaWorksheet();

        expect(worksheet.getCell('D3').fill.fgColor.argb).toBe('FFC6EFCE'); // M01=6
        expect(worksheet.getCell('F3').fill).toBeUndefined(); // M02=4
        expect(worksheet.getCell('H3').fill.fgColor.argb).toBe('FFC6EFCE'); // M03=8
        expect(worksheet.getCell('K3').fill.fgColor.argb).toBe('FFF1F5F9'); // M04=NA (default background)
    });

    test('hauria d’aplicar a Notes Flat els mateixos colors de nota aprovada que a Notes', () => {
        const workbook = creaWorkbook();
        const notes = workbook.getWorksheet('Notes');
        const notesFlat = workbook.getWorksheet('Notes Flat');

        expect(notesFlat.getRow(2).getCell(9).fill.fgColor.argb).toBe(notes.getCell('H3').fill.fgColor.argb); // A8 aprovada
        expect(notesFlat.getRow(2).getCell(9).font.color.argb).toBe(notes.getCell('H3').font.color.argb);
        expect(notesFlat.getRow(3).getCell(9).fill.fgColor.argb).toBe(notes.getCell('D3').fill.fgColor.argb); // A6 aprovada
        expect(notesFlat.getRow(4).getCell(9).fill).toBeUndefined(); // A4 suspesa
        expect(notesFlat.getRow(5).getCell(9).fill).toBeUndefined(); // NA no numèrica
    });

    test('hauria d’aplicar el color de nota aprovada a tota la fila de Notes Flat', () => {
        const worksheet = creaWorkbook().getWorksheet('Notes Flat');
        const filaAprovada = worksheet.getRow(2);

        for (let colNumber = 1; colNumber <= 9; colNumber++) {
            expect(filaAprovada.getCell(colNumber).fill.fgColor.argb).toBe('FFC6EFCE');
            expect(filaAprovada.getCell(colNumber).font.color.argb).toBe('FF006100');
        }
    });

    test('hauria de mantenir sense estil les files suspeses o textuals de Notes Flat', () => {
        const worksheet = creaWorkbook().getWorksheet('Notes Flat');

        for (const rowNumber of [4, 5]) {
            for (let colNumber = 1; colNumber <= 9; colNumber++) {
                expect(worksheet.getRow(rowNumber).getCell(colNumber).fill).toBeUndefined();
                expect(worksheet.getRow(rowNumber).getCell(colNumber).font).toBeUndefined();
            }
        }
    });

    test('hauria de considerar les cadenes numèriques com a notes per aplicar estils', () => {
        const worksheet = creaWorksheet([
            {
                idAlumne: '1',
                nom: 'Alumna',
                avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: {
                    ava1: [
                        { codi: 'M01', nom: 'Mòdul 1', jerarquia: '2', qualitativa: '5' },
                    ],
                },
            },
        ]);

        expect(worksheet.getCell('D3').value).toBe('5');
        expect(worksheet.getCell('D3').fill.fgColor.argb).toBe('FFC6EFCE');
    });

    test('hauria de fusionar capçaleres de mòdul només en trams contigus', () => {
        const worksheet = creaWorksheet();

        expect(worksheet.getCell('C1').value).toBe('Mòdul 1');
        expect(worksheet.getCell('D1').value).toBe('Mòdul 1');
        expect(worksheet.getCell('E1').value).toBe('Mòdul 1');
        expect(worksheet.getCell('F1').value).toBe('Mòdul 1');
        
        expect(worksheet.getCell('G1').value).toBe('Mòdul 3');
        expect(worksheet.getCell('H1').value).toBe('Mòdul 3');
        expect(worksheet.getCell('I1').value).toBe('Mòdul 3');
        
        expect(worksheet.getCell('J1').value).toBe('Mòdul 4');
        expect(worksheet.getCell('K1').value).toBe('Mòdul 4');
        expect(worksheet.getCell('L1').value).toBe('Mòdul 4');
    });

    test('hauria de posar en negreta la primera columna de cada mòdul', () => {
        const worksheet = creaWorksheet();

        expect(worksheet.getCell('C2').font.bold).toBe(true);
        expect(worksheet.getCell('C3').font.bold).toBe(true);
        expect(worksheet.getCell('D2').font.bold).toBe(true);
        expect(worksheet.getCell('D3').font?.bold).toBeUndefined();
    });

    test('hauria de posar border a les notes i marcar els límits dels mòduls', () => {
        const worksheet = creaWorksheet();

        // M01 span: C a F
        expect(worksheet.getCell('C3').border.left.style).toBe('medium');
        expect(worksheet.getCell('C3').border.right.style).toBe('thin');
        expect(worksheet.getCell('D3').border.right.style).toBe('thin');
        expect(worksheet.getCell('F3').border.right.style).toBe('medium');

        // M03 span: G a I
        expect(worksheet.getCell('G3').border.left.style).toBe('medium');
        expect(worksheet.getCell('G3').border.right.style).toBe('thin');
        expect(worksheet.getCell('I3').border.right.style).toBe('medium');
    });

    test('hauria d’alinear a la dreta les notes i les capçaleres de RA', () => {
        const worksheet = creaWorksheet();

        expect(worksheet.getCell('A2').alignment.horizontal).toBe('center');
        expect(worksheet.getCell('B2').alignment.horizontal).toBe('center');
        expect(worksheet.getCell('C2').alignment.horizontal).toBe('right');
        expect(worksheet.getCell('D2').alignment.horizontal).toBe('right');
        expect(worksheet.getCell('C3').alignment.horizontal).toBe('right');
        expect(worksheet.getCell('D3').alignment.horizontal).toBe('right');
        expect(worksheet.getCell('B3').alignment).toBeUndefined();
    });

    test('hauria de mantenir estretes les columnes de notes encara que la capçalera del mòdul sigui llarga', () => {
        const worksheet = creaWorksheet([
            {
                idAlumne: '1',
                nom: 'Alumna amb un nom una mica llarg',
                avaluacions: [{ codi: 'FINAL_1', id: 'ava1' }],
                continguts: {
                    ava1: [
                        { codi: '0485_ICC0', nom: 'Programació amb un nom de mòdul molt llarg', jerarquia: '2', qualitativa: 'A7' },
                        { codi: '0485_ICC0_01RA', nom: 'RA 1', jerarquia: '3', qualitativa: 'A6' },
                    ],
                },
            },
        ]);

        expect(worksheet.getColumn(1).width).toBe(16);
        expect(worksheet.getColumn(2).width).toBeGreaterThan(18);
        expect(worksheet.getColumn(3).width).toBeLessThanOrEqual(14);
        expect(worksheet.getColumn(4).width).toBeLessThanOrEqual(14);
    });
});
