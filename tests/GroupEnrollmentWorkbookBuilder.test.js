import ExcelJS from 'exceljs';
import { jest } from '@jest/globals';
import { GroupEnrollmentWorkbookBuilder } from '../src/excel/GroupEnrollmentWorkbookBuilder.js';

describe('GroupEnrollmentWorkbookBuilder', () => {
    test('crea un full per grup amb alumnes, mòduls principals i marques X', () => {
        const builder = new GroupEnrollmentWorkbookBuilder({ log: jest.fn() }, ExcelJS);
        const workbook = builder.construeixWorkbook([
            {
                codi: 'GAJ1C',
                alumnes: [
                    {
                        nomCerca: 'Alumna Un',
                        contingutsDocentsGrupDTO: [
                            { idPare: null, codiContingutDocent: '0437_AG11', descripcio: 'Mòdul 1' },
                            { idPare: 'N1', codiContingutDocent: '0437_AG11_01RA', descripcio: 'RA 1' },
                        ],
                    },
                    {
                        nom: 'Alumne', cognom1: 'Dos',
                        contingutsDocentsGrupDTO: [
                            { idPare: null, codiContingutDocent: '0438_AG11', descripcio: 'Mòdul 2' },
                        ],
                    },
                ],
            },
            { codi: 'GAJ2C', alumnes: [] },
        ]);

        expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['GAJ1C', 'GAJ2C']);
        const sheet = workbook.getWorksheet('GAJ1C');
        expect(sheet.getRow(1).values.slice(1)).toEqual(['Alumne', '0437_AG11 - Mòdul 1', '0438_AG11 - Mòdul 2']);
        expect(sheet.getRow(2).values.slice(1)).toEqual(['Alumna Un', 'X', '']);
        expect(sheet.getRow(3).values.slice(1)).toEqual(['Alumne Dos', '', 'X']);
        expect(sheet.views).toEqual([{ state: 'frozen', xSplit: 1, ySplit: 1 }]);
    });

    test('genera noms de full vàlids i únics', () => {
        const builder = new GroupEnrollmentWorkbookBuilder({ log: jest.fn() }, ExcelJS);
        const workbook = builder.construeixWorkbook([
            { codi: 'CF/Grup:molt llarg que supera trenta-un caràcters', alumnes: [] },
            { codi: 'CF/Grup:molt llarg que supera trenta-un caràcters', alumnes: [] },
        ]);

        expect(workbook.worksheets[0].name).toHaveLength(31);
        expect(workbook.worksheets[0].name).not.toMatch(/[\\/*?:[\]]/);
        expect(workbook.worksheets[1].name).not.toBe(workbook.worksheets[0].name);
    });
});
