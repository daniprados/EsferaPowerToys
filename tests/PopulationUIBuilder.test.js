import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { PopulationUIBuilder } from '../src/population/PopulationUIBuilder.js';

describe('PopulationUIBuilder', () => {
    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test' });
        global.window = dom.window;
        global.document = dom.window.document;
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
    });

    test('mostra els totals com a indicadors i els estudis en una taula llegible', () => {
        const containerBuilder = { createContainer: jest.fn((content) => content) };
        const builder = new PopulationUIBuilder({ log: jest.fn() }, containerBuilder);
        const panel = builder.createPanel({
            calculatedAt: '2026-07-20T00:00:00.000Z',
            totals: { totalCurs: 12, altes: 10, baixes: 2 },
            estudis: [{ estudi: 'ESO', totalCurs: 12, altes: 10, baixes: 2 }],
        }, jest.fn(), jest.fn());

        expect(panel.querySelectorAll('.powertoys-population-metric')).toHaveLength(3);
        expect(panel.querySelector('.powertoys-population-table-wrapper')).not.toBeNull();
        expect(panel.querySelector('.powertoys-population-table tbody').textContent).toContain('ESO');
        expect(containerBuilder.createContainer).toHaveBeenCalledWith(
            expect.anything(),
            'powertoys-population-box',
            null,
            'powertoys_population_collapsed',
            'powertoys-population-container',
        );
    });
});
