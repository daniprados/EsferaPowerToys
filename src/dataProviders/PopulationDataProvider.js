/**
 * Obté el recompte d'alumnat de la pantalla de fitxa, sense desar dades personals.
 */
export class PopulationDataProvider {
    /**
     * @param {import('../PowerToysLogger.js').PowerToysLogger} logger
     * @param {typeof fetch} fetcher
     */
    constructor(logger, fetcher = window.fetch.bind(window)) {
        this.logger = logger;
        this.fetcher = fetcher;
        this.apiBaseUrl = '/bfgh/AppJava';
    }

    /**
     * Obté el curs vigent a partir del cercador, evitant una petició innecessària.
     * @returns {Promise<string|null>}
     */
    async obtéCursActual() {
        const cursCercador = document.querySelector('#cursEscolar .ng-binding')?.textContent?.trim();
        if (cursCercador) return cursCercador;

        const resposta = await this.fetchJson(`${this.apiBaseUrl}/bfgh_configuracions/services/parametreCentre/cursMatricula`);
        return resposta?.valor || null;
    }

    /**
     * Calcula els indicadors totals i per estudi/nivell del curs indicat.
     * @param {string} cursEscolar
     * @returns {Promise<Object>}
     */
    async calculaIndicadors(cursEscolar) {
        const [altes, baixes] = await Promise.all([
            this.cercaAlumnes(cursEscolar, 'ALTA'),
            this.cercaAlumnes(cursEscolar, 'BAIXA'),
        ]);

        return this.agregaIndicadors(altes, baixes);
    }

    /**
     * Cerca totes les matrícules d'un estat sense aplicar filtres addicionals.
     * @param {string} cursEscolar
     * @param {'ALTA'|'BAIXA'} estat
     * @returns {Promise<Array<Object>>}
     */
    async cercaAlumnes(cursEscolar, estat) {
        const params = new URLSearchParams({
            cognom1: '', cognom2: '', cursEscolar, estatsMatricula: estat, grup: '',
            idEnsenyament: '', id_ralc: '', nivell: '', nom: '', numeroDocument: '', tipusDocument: '',
        });
        const resposta = await this.fetchJson(`${this.apiBaseUrl}/bfgh_ga_matricula/services/registrecercaalumne/cerca/alumnes?${params}`);
        return Array.isArray(resposta) ? resposta : [];
    }

    /**
     * Agrupa les matrícules per estudi i nivell, descartant qualsevol dada personal.
     * @param {Array<Object>} altes
     * @param {Array<Object>} baixes
     * @returns {Object}
     */
    agregaIndicadors(altes, baixes) {
        const estudis = new Map();
        const afegeix = (alumnes, camp) => alumnes.forEach((alumne) => {
            const id = String(alumne.id_ensenyament ?? 'sense-estudi');
            const nom = alumne.ensenyament || 'Estudi sense especificar';
            const nivell = alumne.nivell ?? 'Sense nivell';
            if (!estudis.has(id)) estudis.set(id, { id, estudi: nom, altes: 0, baixes: 0, nivells: new Map() });
            const estudi = estudis.get(id);
            estudi[camp] += 1;
            if (!estudi.nivells.has(nivell)) estudi.nivells.set(nivell, { nivell, altes: 0, baixes: 0 });
            estudi.nivells.get(nivell)[camp] += 1;
        });
        afegeix(altes, 'altes');
        afegeix(baixes, 'baixes');

        const normalitza = ({ altes, baixes, ...resta }) => ({
            ...resta,
            altes,
            baixes,
            totalCurs: altes + baixes,
            nivells: resta.nivells ? [...resta.nivells.values()].map(normalitza).sort((a, b) => String(a.nivell).localeCompare(String(b.nivell), 'ca')) : undefined,
        });
        const perEstudi = [...estudis.values()].map(normalitza).sort((a, b) => a.estudi.localeCompare(b.estudi, 'ca'));
        return {
            totals: { altes: altes.length, baixes: baixes.length, totalCurs: altes.length + baixes.length },
            estudis: perEstudi,
        };
    }

    /**
     * @param {string} url
     * @returns {Promise<Object|Array|null>}
     */
    async fetchJson(url) {
        const resposta = await this.fetcher(url, { credentials: 'same-origin' });
        if (!resposta.ok) throw new Error(`Resposta HTTP ${resposta.status}`);
        return resposta.json();
    }
}
