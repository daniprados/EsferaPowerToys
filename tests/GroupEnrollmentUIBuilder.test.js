import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { GroupEnrollmentUIBuilder } from '../src/excel/GroupEnrollmentUIBuilder.js';

describe('GroupEnrollmentUIBuilder', () => {
    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body><table></table></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
    });

    test('descarrega els grups marcats i mostra el progrés', async () => {
        const table = document.querySelector('table');
        const onDownload = jest.fn(async (receivedTable, onProgress) => {
            expect(receivedTable).toBe(table);
            onProgress(1, 2);
            onProgress(2, 2);
            return 2;
        });
        const builder = new GroupEnrollmentUIBuilder(
            { log: jest.fn(), error: jest.fn() },
            { createContainer: jest.fn((content) => content) },
            onDownload,
        );
        const panel = builder.createPanel(table, 'panel');

        panel.querySelector('button').click();
        await Promise.resolve();
        await Promise.resolve();

        expect(onDownload).toHaveBeenCalledTimes(1);
        expect(panel.querySelector('[role="status"]').textContent).toBe('2 grups descarregats.');
        expect(panel.querySelector('button').disabled).toBe(false);
    });

    test('mostra l’error quan no s’ha seleccionat cap grup', async () => {
        const builder = new GroupEnrollmentUIBuilder(
            { log: jest.fn(), error: jest.fn() },
            { createContainer: jest.fn((content) => content) },
            jest.fn().mockRejectedValue(new Error('Selecciona un grup CF.')),
        );
        const panel = builder.createPanel(document.querySelector('table'), 'panel');

        panel.querySelector('button').click();
        await Promise.resolve();
        await Promise.resolve();

        expect(panel.querySelector('[role="status"]').textContent).toBe('Selecciona un grup CF.');
        expect(panel.querySelector('[role="status"]').classList.contains('powertoys-group-export-status--error')).toBe(true);
    });
});
