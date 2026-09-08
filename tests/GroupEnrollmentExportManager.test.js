import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { GroupEnrollmentExportManager } from '../src/excel/GroupEnrollmentExportManager.js';

describe('GroupEnrollmentExportManager', () => {
    let originalBlob;
    let originalUrl;

    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body><table></table></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
        originalBlob = global.Blob;
        originalUrl = global.URL;
        global.Blob = jest.fn();
        global.URL = { createObjectURL: jest.fn(() => 'blob:test'), revokeObjectURL: jest.fn() };
        jest.spyOn(dom.window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        global.Blob = originalBlob;
        global.URL = originalUrl;
        delete global.window;
        delete global.document;
    });

    test('consulta els grups seleccionats, informa del progrés i descarrega el llibre', async () => {
        const grups = [{ id: 1, codi: 'CF1' }, { id: 2, codi: 'CF2' }];
        const dataProvider = {
            obtéGrupsSeleccionats: jest.fn(() => grups),
            obtéDadesGrup: jest.fn(async (grup) => ({ ...grup, alumnes: [] })),
        };
        const workbook = { xlsx: { writeBuffer: jest.fn().mockResolvedValue(new Uint8Array([1])) } };
        const workbookBuilder = { construeixWorkbook: jest.fn(() => workbook) };
        const manager = new GroupEnrollmentExportManager({ log: jest.fn() }, dataProvider, workbookBuilder);
        const progress = jest.fn();

        await expect(manager.descarregaGrupsSeleccionats(document.querySelector('table'), progress)).resolves.toBe(2);

        expect(dataProvider.obtéDadesGrup).toHaveBeenCalledTimes(2);
        expect(progress).toHaveBeenCalledTimes(2);
        expect(progress).toHaveBeenLastCalledWith(2, 2);
        expect(workbookBuilder.construeixWorkbook).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 }),
        ]));
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });

    test('no consulta l’API si no hi ha cap grup CF seleccionat', async () => {
        const dataProvider = { obtéGrupsSeleccionats: jest.fn(() => []), obtéDadesGrup: jest.fn() };
        const manager = new GroupEnrollmentExportManager({ log: jest.fn() }, dataProvider, {});

        await expect(manager.descarregaGrupsSeleccionats(document.querySelector('table')))
            .rejects.toThrow('Selecciona com a mínim un grup');
        expect(dataProvider.obtéDadesGrup).not.toHaveBeenCalled();
    });
});
