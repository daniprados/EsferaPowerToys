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
                        idRalc: 700002, nom: 'Alumna', cognom1: 'Primer', cognom2: 'Un',
                        contingutsDocentsGrupDTO: [
                            { idPare: null, codiContingutDocent: 'C056_AG10', descripcio: 'C056_AG10-Català/Aranès Professional (GM) ¬(C056_AG10)' },
                            { idPare: 'N1', codiContingutDocent: '0437_AG11_01RA', descripcio: 'RA 1' },
                        ],
                    },
                    {
                        idRalc: 700004, nom: 'Alumne', cognom1: 'Segon', cognom2: 'Dos',
                        contingutsDocentsGrupDTO: [
                            { idPare: null, codiContingutDocent: '0438_AG11', descripcio: '0438_AG11-Xarxes (GS) ¬(0438_AG11)' },
                        ],
                    },
                ],
            },
            { codi: 'GAJ2C', alumnes: [] },
        ]);

        expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['GAJ1C', 'GAJ2C']);
        const sheet = workbook.getWorksheet('GAJ1C');
        expect(sheet.getRow(1).values.slice(1)).toEqual([
            'Idalu', 'Cognom1', 'Cognom2', 'Nom',
            'C056 Català/Aranès Professional', '0438 Xarxes',
        ]);
        expect(sheet.getRow(2).values.slice(1)).toEqual([700002, 'Primer', 'Un', 'Alumna', 'X', '']);
        expect(sheet.getRow(3).values.slice(1)).toEqual([700004, 'Segon', 'Dos', 'Alumne', '', 'X']);
        expect(sheet.views).toEqual([{ state: 'frozen', xSplit: 4, ySplit: 1 }]);
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
