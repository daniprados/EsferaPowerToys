import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { PopulationFeatureManager } from '../src/population/PopulationFeatureManager.js';

describe('PopulationFeatureManager', () => {
    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body><fieldset><form name="alumneform"></form></fieldset></body></html>', { url: 'https://example.test' });
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
        delete global.localStorage;
    });

    test('mostra les dades desades sense tornar a consultar l’API', async () => {
        localStorage.setItem('powertoys_population_v2_2026/2027', JSON.stringify({
            cursEscolar: '2026/2027', calculatedAt: '2026-07-20T00:00:00.000Z',
            totals: { altes: 10, baixes: 2, totalCurs: 12 }, estudis: [],
        }));
        const dataProvider = { obtéCursActual: jest.fn().mockResolvedValue('2026/2027'), calculaIndicadors: jest.fn() };
        const panel = document.createElement('div'); panel.id = 'powertoys-population-box';
        const uiBuilder = { createPanel: jest.fn(() => panel) };
        const containerBuilder = { insertDiv: jest.fn((element, before) => before.before(element)) };
        const manager = new PopulationFeatureManager({ warn: jest.fn(), error: jest.fn() }, dataProvider, uiBuilder, containerBuilder);

        await manager.tryActivate();

        expect(dataProvider.calculaIndicadors).not.toHaveBeenCalled();
        expect(uiBuilder.createPanel).toHaveBeenCalledWith(expect.objectContaining({ totals: expect.objectContaining({ altes: 10 }) }), expect.any(Function), expect.any(Function));
        expect(document.body.firstElementChild.id).toBe('powertoys-population-box');
    });

    test('desa només els indicadors agregats després de recalcular', async () => {
        const dataProvider = {
            obtéCursActual: jest.fn().mockResolvedValue('2026/2027'),
            calculaIndicadors: jest.fn().mockResolvedValue({ totals: { altes: 1, baixes: 1, totalCurs: 2 }, estudis: [] }),
        };
        const uiBuilder = { createPanel: jest.fn(() => { const panel = document.createElement('div'); panel.id = 'powertoys-population-box'; return panel; }) };
        const containerBuilder = { insertDiv: jest.fn((element, before) => before.before(element)) };
        const manager = new PopulationFeatureManager({ warn: jest.fn(), error: jest.fn() }, dataProvider, uiBuilder, containerBuilder);

        await manager.tryActivate();

        expect(dataProvider.calculaIndicadors).toHaveBeenCalledWith('2026/2027');
        expect(JSON.parse(localStorage.getItem('powertoys_population_v2_2026/2027'))).toMatchObject({
            cursEscolar: '2026/2027', totals: { altes: 1, baixes: 1, totalCurs: 2 },
        });
    });
});
