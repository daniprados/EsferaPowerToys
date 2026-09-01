/**
 * Obté el recompte d'alumnat de la pantalla de fitxa.
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
     * Agrupa les matrícules per estudi i nivell. Les baixes sense grup es consideren
     * altes errònies i es mantenen fora de tots els recomptes.
     * @param {Array<Object>} altes
     * @param {Array<Object>} baixes
     * @returns {Object}
     */
    agregaIndicadors(altes, baixes) {
        const baixesSenseGrup = baixes.filter((alumne) => alumne.grup === null);
        const baixesComputables = baixes.filter((alumne) => alumne.grup !== null);
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
        afegeix(baixesComputables, 'baixes');

        const normalitza = ({ altes, baixes, ...resta }) => ({
            ...resta,
            altes,
            baixes,
            totalCurs: altes + baixes,
            nivells: resta.nivells ? [...resta.nivells.values()].map(normalitza).sort((a, b) => String(a.nivell).localeCompare(String(b.nivell), 'ca')) : undefined,
        });
        const perEstudi = [...estudis.values()].map(normalitza).sort((a, b) => a.estudi.localeCompare(b.estudi, 'ca'));
        return {
            totals: {
                altes: altes.length,
                baixes: baixesComputables.length,
                totalCurs: altes.length + baixesComputables.length,
            },
            estudis: perEstudi,
            altesErronies: baixesSenseGrup.map((alumne) => ({
                nom: this.formataNomAlumne(alumne),
                estudi: alumne.ensenyament || 'Estudi sense especificar',
                nivell: alumne.nivell ?? 'Sense nivell',
            })),
        };
    }

    /**
     * Construeix un nom llegible conservant només els camps necessaris per al llistat.
     * @param {Object} alumne
     * @returns {string}
     */
    formataNomAlumne(alumne) {
        const cognoms = [alumne.cognom1, alumne.cognom2].filter(Boolean).join(' ');
        const nom = String(alumne.nom ?? '').trim();
        return [cognoms, nom].filter(Boolean).join(', ') || 'Alumne sense nom';
    }

    /**
     * @param {string} url
     * @returns {Promise<Object|Array|null>}
     */
    async fetchJson(url) {
        const token = this.normalitzaToken(sessionStorage.getItem('TOKEN'));
        const headers = {
            'FUNCIONALITAT-ORIGEN': '/matricula/fitxa/',
            ...this.obtéCapçaleresUsuari(),
        };
        if (token) headers.TOKEN = token;
        const resposta = await this.fetcher(url, { credentials: 'same-origin', headers });
        if (!resposta.ok) throw new Error(`Resposta HTTP ${resposta.status}`);
        return resposta.json();
    }

    /**
     * El token de la sessió pot estar serialitzat com una cadena JSON.
     * @param {string|null} token
     * @returns {string|null}
     */
    normalitzaToken(token) {
        if (!token) return null;
        let valor = token.trim();
        for (let intents = 0; intents < 5 && valor.startsWith('"') && valor.endsWith('"'); intents += 1) {
            try {
                const valorDeserialitzat = JSON.parse(valor);
                if (typeof valorDeserialitzat !== 'string') break;
                valor = valorDeserialitzat.trim();
            } catch (error) {
                this.logger.warn('PopulationDataProvider → token de sessió invàlid', error);
                break;
            }
        }
        return valor.replace(/^(?:\\?["'])+/, '').replace(/(?:\\?["'])+$/, '');
    }

    /**
     * Recupera el context de l'usuari que Esfer@ requereix a les peticions.
     * @returns {Object<string, string>}
     */
    obtéCapçaleresUsuari() {
        const capçaleres = {};
        const centre = this.llegeixJsonSessio('centre');
        const centres = this.llegeixJsonSessio('centres');
        const idCentre = centre?.id ?? centre?.value;
        const idRol = centres?.dadesRespRols?.[0]?.id;
        const usuari = centres?.usuari;
        const nomUsuari = usuari ? [usuari.nom, usuari.cognom1, usuari.cognom2].filter(Boolean).join(' ') : null;

        if (idCentre) capçaleres.USR_CENTRE = String(idCentre);
        if (idRol) capçaleres.USR_ROL = String(idRol);
        if (nomUsuari) capçaleres.USR_USERNAME_AWA = nomUsuari;
        return capçaleres;
    }

    /**
     * Llegeix un valor JSON de la sessió sense exposar-ne el contingut als registres.
     * @param {string} clau
     * @returns {Object|null}
     */
    llegeixJsonSessio(clau) {
        const valor = sessionStorage.getItem(clau);
        if (!valor) return null;
        try {
            return JSON.parse(valor);
        } catch (error) {
            this.logger.warn(`PopulationDataProvider → valor de sessió invàlid: ${clau}`, error);
            return null;
        }
    }
}
