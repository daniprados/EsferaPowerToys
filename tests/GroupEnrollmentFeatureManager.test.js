import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { GroupEnrollmentFeatureManager } from '../src/excel/GroupEnrollmentFeatureManager.js';

describe('GroupEnrollmentFeatureManager', () => {
    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
    });

    test('insereix el panell davant del llistat de grups una sola vegada', () => {
        document.body.innerHTML = '<table data-st-table="gClasse.grupsList"></table>';
        const panel = document.createElement('div');
        panel.id = 'powertoys-group-export-box';
        const uiBuilder = { createPanel: jest.fn(() => panel) };
        const containerBuilder = { insertDiv: jest.fn((element, table) => table.before(element)) };
        const manager = new GroupEnrollmentFeatureManager({ log: jest.fn() }, uiBuilder, containerBuilder);

        manager.tryActivate();
        manager.tryActivate();

        expect(uiBuilder.createPanel).toHaveBeenCalledTimes(1);
        expect(containerBuilder.insertDiv).toHaveBeenCalledWith(panel, document.querySelector('table'));
    });

    test('no s’activa fora del llistat de grups', () => {
        const uiBuilder = { createPanel: jest.fn() };
        const manager = new GroupEnrollmentFeatureManager({ log: jest.fn() }, uiBuilder, { insertDiv: jest.fn() });

        manager.tryActivate();

        expect(uiBuilder.createPanel).not.toHaveBeenCalled();
    });
});
