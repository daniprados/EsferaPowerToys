import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { PowerToysController } from '../src/PowerToysController.js';

describe('PowerToysController', () => {
    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><head></head><body><main id="mainView"></main></body></html>', {
            url: 'https://example.test',
        });
        dom.window.fetch = jest.fn();
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.sessionStorage = dom.window.sessionStorage;
        global.MutationObserver = dom.window.MutationObserver;
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.window;
        delete global.document;
        delete global.localStorage;
        delete global.sessionStorage;
        delete global.MutationObserver;
    });

    test('comprova el DOM immediatament sense esperar una mutació posterior', () => {
        const reinicialitza = jest
            .spyOn(PowerToysController.prototype, 'reinicialitza')
            .mockImplementation(() => {});

        const controller = new PowerToysController();

        expect(reinicialitza).toHaveBeenCalledTimes(1);
        controller.observer.disconnect();
    });
});
