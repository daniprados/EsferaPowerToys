import { JSDOM } from 'jsdom';
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { ExcelUIBuilder } from '../src/excel/ExcelUIBuilder.js';

describe('ExcelUIBuilder', () => {
    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
    });

    test('hauria d’afegir el botó de visualització amb la mateixa avaluació seleccionada', async () => {
        const onDownload = jest.fn();
        const onVisualize = jest.fn();
        const containerBuilder = {
            createContainer: jest.fn((content) => content),
        };
        const builder = new ExcelUIBuilder({ log: jest.fn() }, onDownload, containerBuilder, onVisualize);

        const panel = await builder.createPanel(document.createElement('table'));
        const select = panel.querySelector('#powertoys-evaluation-select');
        select.value = '2';
        select.dispatchEvent(new window.Event('change'));
        panel.querySelector('#btn-visualitzar-dades').click();
        panel.querySelector('#btn-descargar-xlsx').click();

        expect(panel.querySelector('#btn-visualitzar-dades').textContent).toBe('Visualització avaluació 2');
        expect(panel.querySelector('#powertoys-evaluation-select').classList.contains('powertoy-excel-evaluation-select')).toBe(true);
        expect(panel.querySelector('#btn-descargar-xlsx').classList.contains('powertoy-excel-download-button')).toBe(true);
        expect(panel.querySelector('#btn-visualitzar-dades').classList.contains('powertoy-excel-visualize-button')).toBe(true);
        expect(onVisualize).toHaveBeenCalledWith(2);
        expect(onDownload).toHaveBeenCalledWith(2);
    });

    test('hauria d’activar la descàrrega de totes les avaluacions quan se selecciona totes', async () => {
        const onDownload = jest.fn();
        const onDownloadAll = jest.fn();
        const containerBuilder = {
            createContainer: jest.fn((content) => content),
        };
        const builder = new ExcelUIBuilder({ log: jest.fn() }, onDownload, containerBuilder, null, null, onDownloadAll);

        const panel = await builder.createPanel(document.createElement('table'));
        panel.querySelector('#powertoys-evaluation-select').value = 'totes';
        panel.querySelector('#btn-descargar-xlsx').click();

        expect(onDownloadAll).toHaveBeenCalledTimes(1);
        expect(onDownload).not.toHaveBeenCalled();
    });

    test('hauria de no fallar si falta el callback de totes les avaluacions', async () => {
        const onDownload = jest.fn();
        const containerBuilder = {
            createContainer: jest.fn((content) => content),
        };
        const builder = new ExcelUIBuilder({ log: jest.fn() }, onDownload, containerBuilder);

        const panel = await builder.createPanel(document.createElement('table'));
        panel.querySelector('#powertoys-evaluation-select').value = 'totes';

        expect(() => panel.querySelector('#btn-descargar-xlsx').click()).not.toThrow();
        expect(onDownload).not.toHaveBeenCalled();
    });

    test('hauria d’enviar totes al visualitzador quan se seleccionen totes les avaluacions', async () => {
        const onVisualize = jest.fn();
        const containerBuilder = {
            createContainer: jest.fn((content) => content),
        };
        const builder = new ExcelUIBuilder({ log: jest.fn() }, jest.fn(), containerBuilder, onVisualize);

        const panel = await builder.createPanel(document.createElement('table'));
        panel.querySelector('#powertoys-evaluation-select').value = 'totes';
        panel.querySelector('#btn-visualitzar-dades').click();

        expect(onVisualize).toHaveBeenCalledWith('totes');
        expect(onVisualize).not.toHaveBeenCalledWith(1);
        expect(onVisualize).not.toHaveBeenCalledWith(NaN);
    });

    test('hauria de mostrar el text inicial de descàrrega i visualització per a totes', async () => {
        const containerBuilder = {
            createContainer: jest.fn((content) => content),
        };
        const builder = new ExcelUIBuilder({ log: jest.fn() }, jest.fn(), containerBuilder, jest.fn());

        const panel = await builder.createPanel(document.createElement('table'));

        expect(panel.querySelector('#btn-descargar-xlsx').textContent).toBe('Descarregar Excel totes les avaluacions (agregat)');
        expect(panel.querySelector('#btn-visualitzar-dades').textContent).toBe('Visualització agregats');
    });

    test('hauria de canviar el text dels botons per a totes i restaurar-lo per avaluació numèrica', async () => {
        const containerBuilder = {
            createContainer: jest.fn((content) => content),
        };
        const builder = new ExcelUIBuilder({ log: jest.fn() }, jest.fn(), containerBuilder, jest.fn());

        const panel = await builder.createPanel(document.createElement('table'));
        const select = panel.querySelector('#powertoys-evaluation-select');
        const downloadButton = panel.querySelector('#btn-descargar-xlsx');
        const visualizeButton = panel.querySelector('#btn-visualitzar-dades');

        expect(downloadButton.textContent).toBe('Descarregar Excel totes les avaluacions (agregat)');
        expect(visualizeButton.textContent).toBe('Visualització agregats');

        select.value = '2';
        select.dispatchEvent(new window.Event('change'));
        expect(downloadButton.textContent).toBe('Descarregar Excel avaluació 2');
        expect(visualizeButton.textContent).toBe('Visualització avaluació 2');

        select.value = 'totes';
        select.dispatchEvent(new window.Event('change'));
        expect(downloadButton.textContent).toBe('Descarregar Excel totes les avaluacions (agregat)');
        expect(visualizeButton.textContent).toBe('Visualització agregats');
    });
});
