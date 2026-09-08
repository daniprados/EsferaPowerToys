import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { GroupEnrollmentDataProvider } from '../src/dataProviders/GroupEnrollmentDataProvider.js';

describe('GroupEnrollmentDataProvider', () => {
    let logger;

    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body><table></table></body></html>', { url: 'https://example.test' });
        global.window = dom.window;
        global.document = dom.window.document;
        global.sessionStorage = dom.window.sessionStorage;
        logger = { log: jest.fn(), warn: jest.fn() };
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
        delete global.sessionStorage;
    });

    test('retorna únicament els grups CF seleccionats de la col·lecció Angular', () => {
        const grups = [
            { id: 10, codiGrup: 'GAJ1C', descGrup: 'CFPM AG11 - GAJ1C', selected: true },
            { id: 11, codiGrup: 'ESO1A', descGrup: 'ESO - 1A', selected: true },
            { id: 12, codiGrup: 'GAJ1D', descGrup: 'CFPM AG11 - GAJ1D', selected: false },
        ];
        window.angular = { element: jest.fn(() => ({ scope: () => ({ gClasse: { grupsList_src: grups } }) })) };
        const provider = new GroupEnrollmentDataProvider(logger, jest.fn());

        expect(provider.obtéGrupsSeleccionats(document.querySelector('table'))).toEqual([
            { id: 10, codi: 'GAJ1C', nom: 'CFPM AG11 - GAJ1C' },
        ]);
    });

    test('pot recuperar la selecció des de les files visibles', () => {
        document.body.innerHTML = `
            <table><tbody>
                <tr id="cf"><td><input type="checkbox" checked></td></tr>
                <tr id="eso"><td><input type="checkbox" checked></td></tr>
            </tbody></table>`;
        const files = {
            cf: { idGrupClasse: 21, codiEnsenyament: 'CFGS', codiGrup: 'DAM1A' },
            eso: { idGrupClasse: 22, codiEnsenyament: 'ESO', codiGrup: 'ESO1A' },
        };
        window.angular = { element: jest.fn((element) => ({ scope: () => element.tagName === 'TABLE' ? {} : { row: files[element.id] } })) };
        const provider = new GroupEnrollmentDataProvider(logger, jest.fn());

        expect(provider.obtéGrupsSeleccionats(document.querySelector('table'))).toEqual([
            { id: 21, codi: 'DAM1A', nom: 'DAM1A' },
        ]);
    });

    test('consulta l’API amb l’identificador del grup i conserva només matrícules actives', async () => {
        sessionStorage.setItem('TOKEN', '"token"');
        const fetcher = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ result: [
                { nomCerca: 'Alumna activa', estatMatricula: 'ALTA' },
                { nomCerca: 'Alumna baixa', estatMatricula: 'BAIXA' },
            ] }),
        });
        const provider = new GroupEnrollmentDataProvider(logger, fetcher);

        const resultat = await provider.obtéDadesGrup({ id: 3747229, codi: 'GAJ1C', nom: 'Grup' });

        expect(fetcher.mock.calls[0][0]).toBe('/bfgh/AppJava/bfgh_ga_docencia/services/alumnegrupdto?idGrup=3747229');
        expect(fetcher.mock.calls[0][1]).toEqual(expect.objectContaining({
            credentials: 'same-origin',
            headers: expect.objectContaining({ TOKEN: 'token', 'FUNCIONALITAT-ORIGEN': '/docencia/grupsclasse/' }),
        }));
        expect(resultat.alumnes.map((alumne) => alumne.nomCerca)).toEqual(['Alumna activa']);
    });
});
