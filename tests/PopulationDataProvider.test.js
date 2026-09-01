import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { PopulationDataProvider } from '../src/dataProviders/PopulationDataProvider.js';

describe('PopulationDataProvider', () => {
    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test' });
        global.window = dom.window;
        global.document = dom.window.document;
        global.sessionStorage = dom.window.sessionStorage;
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
        delete global.sessionStorage;
    });

    test('calcula els recomptes globals, per estudi i per nivell', () => {
        const provider = new PopulationDataProvider({ log: jest.fn() }, jest.fn());
        const dades = provider.agregaIndicadors(
            [
                { id_ensenyament: '1', ensenyament: 'ESO', nivell: 1 },
                { id_ensenyament: '1', ensenyament: 'ESO', nivell: 2 },
            ],
            [{ id_ensenyament: '1', ensenyament: 'ESO', nivell: 1 }],
        );

        expect(dades.totals).toEqual({ altes: 2, baixes: 1, totalCurs: 3 });
        expect(dades.estudis).toHaveLength(1);
        expect(dades.estudis[0]).toMatchObject({ estudi: 'ESO', altes: 2, baixes: 1, totalCurs: 3 });
        expect(dades.estudis[0].nivells).toEqual(expect.arrayContaining([
            expect.objectContaining({ nivell: 1, altes: 1, baixes: 1, totalCurs: 2 }),
            expect.objectContaining({ nivell: 2, altes: 1, baixes: 0, totalCurs: 1 }),
        ]));
    });

    test('exclou dels indicadors les baixes sense grup i les retorna com a altes errònies', () => {
        const provider = new PopulationDataProvider({ log: jest.fn() }, jest.fn());

        const dades = provider.agregaIndicadors(
            [{ id_ensenyament: '1', ensenyament: 'ESO', nivell: 1, grup: '1A' }],
            [
                { id_ensenyament: '1', ensenyament: 'ESO', nivell: 1, grup: '1A' },
                {
                    id_ensenyament: '1', ensenyament: 'ESO', nivell: 1, grup: null,
                    nom: 'Ada', cognom1: 'Lovelace', cognom2: 'Byron',
                },
            ],
        );

        expect(dades.totals).toEqual({ altes: 1, baixes: 1, totalCurs: 2 });
        expect(dades.estudis[0]).toMatchObject({ altes: 1, baixes: 1, totalCurs: 2 });
        expect(dades.altesErronies).toBe(1);
    });

    test('fa una cerca separada per a altes i baixes amb el curs indicat', async () => {
        sessionStorage.setItem('TOKEN', '"token-de-prova"');
        sessionStorage.setItem('centre', JSON.stringify({ id: 54715, value: 'un-altre-centre' }));
        sessionStorage.setItem('centres', JSON.stringify({
            dadesRespRols: [{ id: 5 }],
            usuari: { nom: 'Ada', cognom1: 'Lovelace', cognom2: null },
        }));
        const fetcher = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => [{ id_ensenyament: '1', ensenyament: 'ESO', nivell: 1 }] })
            .mockResolvedValueOnce({ ok: true, json: async () => [] });
        const provider = new PopulationDataProvider({ log: jest.fn() }, fetcher);

        const dades = await provider.calculaIndicadors('2026/2027');

        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(fetcher.mock.calls[0][0]).toContain('cursEscolar=2026%2F2027');
        expect(fetcher.mock.calls[0][0]).toContain('estatsMatricula=ALTA');
        expect(fetcher.mock.calls[1][0]).toContain('estatsMatricula=BAIXA');
        expect(fetcher.mock.calls[0][1]).toEqual(expect.objectContaining({
            credentials: 'same-origin',
            headers: {
                'FUNCIONALITAT-ORIGEN': '/matricula/fitxa/',
                TOKEN: 'token-de-prova',
                USR_CENTRE: '54715',
                USR_ROL: '5',
                USR_USERNAME_AWA: 'Ada Lovelace',
            },
        }));
        expect(dades.totals.totalCurs).toBe(1);
    });

    test('elimina la serialització JSON del token abans d’enviar-lo', () => {
        const provider = new PopulationDataProvider({ log: jest.fn(), warn: jest.fn() }, jest.fn());

        expect(provider.normalitzaToken('"token-de-prova"')).toBe('token-de-prova');
        expect(provider.normalitzaToken(JSON.stringify(JSON.stringify('token-de-prova')))).toBe('token-de-prova');
        expect(provider.normalitzaToken('\\"token-de-prova\\"')).toBe('token-de-prova');
        expect(provider.normalitzaToken('token-de-prova')).toBe('token-de-prova');
    });

    test('llegeix el curs actual del cercador abans de consultar l’API', async () => {
        document.body.innerHTML = '<span id="cursEscolar"><span class="ng-binding">2026/2027</span></span>';
        const fetcher = jest.fn();
        const provider = new PopulationDataProvider({ log: jest.fn() }, fetcher);

        await expect(provider.obtéCursActual()).resolves.toBe('2026/2027');
        expect(fetcher).not.toHaveBeenCalled();
    });
});
