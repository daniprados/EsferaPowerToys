/**
 * Obté els grups seleccionats al llistat de docència i les seves matrícules.
 */
export class GroupEnrollmentDataProvider {
    /**
     * @param {import('../PowerToysLogger.js').PowerToysLogger} logger
     * @param {typeof fetch} fetcher
     */
    constructor(logger, fetcher = window.fetch.bind(window)) {
        this.logger = logger;
        this.fetcher = fetcher;
        this.apiBaseUrl = '/bfgh/AppJava/bfgh_ga_docencia/services';
    }

    /**
     * Recupera els grups CF marcats amb les caselles del llistat.
     * @param {HTMLTableElement} table
     * @returns {Array<{id: number, codi: string, nom: string}>}
     */
    obtéGrupsSeleccionats(table) {
        const grupsAngular = this.obtéGrupsAngular(table);
        const seleccionats = grupsAngular.length > 0
            ? grupsAngular.filter((grup) => grup?.selected === true)
            : this.obtéGrupsSeleccionatsDelDom(table);

        const grups = seleccionats
            .filter((grup) => this.ésCicleFormatiu(grup))
            .map((grup) => this.normalitzaGrup(grup))
            .filter(Boolean);

        return [...new Map(grups.map((grup) => [grup.id, grup])).values()];
    }

    /**
     * Obté la col·lecció completa vinculada a Smart Table.
     * @param {HTMLTableElement} table
     * @returns {Array<Object>}
     */
    obtéGrupsAngular(table) {
        if (!window.angular || !table) return [];
        try {
            const scope = window.angular.element(table).scope();
            const grups = scope?.gClasse?.grupsList_src ?? scope?.gClasse?.grupsList;
            return Array.isArray(grups) ? grups : [];
        } catch (error) {
            this.logger.warn('GroupEnrollmentDataProvider → no s’han pogut llegir els grups Angular', error);
            return [];
        }
    }

    /**
     * Llegeix les files marcades quan la col·lecció del controlador no és accessible.
     * @param {HTMLTableElement} table
     * @returns {Array<Object>}
     */
    obtéGrupsSeleccionatsDelDom(table) {
        if (!window.angular || !table) return [];
        return [...table.querySelectorAll('tbody tr')]
            .filter((row) => row.querySelector('input[type="checkbox"]')?.checked)
            .map((row) => {
                try {
                    return window.angular.element(row).scope()?.row ?? null;
                } catch (error) {
                    this.logger.warn('GroupEnrollmentDataProvider → no s’ha pogut llegir una fila Angular', error);
                    return null;
                }
            })
            .filter(Boolean);
    }

    /**
     * Limita aquesta primera versió als ensenyaments de cicles formatius.
     * @param {Object} grup
     * @returns {boolean}
     */
    ésCicleFormatiu(grup) {
        return [
            grup?.codiEnsenyament,
            grup?.descEnsenyament,
            grup?.descGrup,
            grup?.codiGrup,
            grup?.codi,
        ].some((valor) => String(valor ?? '').trim().toUpperCase().startsWith('CF'));
    }

    /**
     * Adapta els possibles noms de propietat d'Esfer@ al model d'exportació.
     * @param {Object} grup
     * @returns {{id: number, codi: string, nom: string}|null}
     */
    normalitzaGrup(grup) {
        const id = Number(grup?.idGrupClasse ?? grup?.id ?? grup?.idGrup);
        if (!Number.isInteger(id) || id <= 0) return null;

        const codi = this.obtéCodiCurtGrup(grup, id);
        const nom = String(grup?.descGrup ?? grup?.nomGrup ?? codi).trim();
        return { id, codi, nom };
    }

    /**
     * Extreu el codi curt que apareix al final de la descripció del grup.
     * @param {Object} grup
     * @param {number} id
     * @returns {string}
     */
    obtéCodiCurtGrup(grup, id) {
        const descripcio = String(grup?.descGrup ?? grup?.nomGrup ?? '').trim();
        const parts = descripcio.split(/\s+-\s+/);
        if (parts.length > 1 && parts.at(-1).trim()) return parts.at(-1).trim();
        return String(grup?.codiGrup ?? grup?.codi ?? descripcio ?? id).trim() || String(id);
    }

    /**
     * Consulta l'alumnat i els continguts docents d'un grup classe.
     * @param {{id: number, codi: string, nom: string}} grup
     * @returns {Promise<Object>}
     */
    async obtéDadesGrup(grup) {
        const resposta = await this.fetchJson(`${this.apiBaseUrl}/alumnegrupdto?idGrup=${encodeURIComponent(grup.id)}`);
        return {
            ...grup,
            alumnes: Array.isArray(resposta?.result)
                ? resposta.result.filter((alumne) => !alumne?.estatMatricula || alumne.estatMatricula === 'ALTA')
                : [],
        };
    }

    /**
     * @param {string} url
     * @returns {Promise<Object|null>}
     */
    async fetchJson(url) {
        const token = this.normalitzaToken(sessionStorage.getItem('TOKEN'));
        const headers = {
            'FUNCIONALITAT-ORIGEN': '/docencia/grupsclasse/',
            ...this.obtéCapçaleresUsuari(),
        };
        if (token) headers.TOKEN = token;

        const resposta = await this.fetcher(url, { credentials: 'same-origin', headers });
        if (!resposta.ok) throw new Error(`Resposta HTTP ${resposta.status}`);
        return resposta.json();
    }

    normalitzaToken(token) {
        if (!token) return null;
        let valor = token.trim();
        for (let intents = 0; intents < 5 && valor.startsWith('"') && valor.endsWith('"'); intents += 1) {
            try {
                const deserialitzat = JSON.parse(valor);
                if (typeof deserialitzat !== 'string') break;
                valor = deserialitzat.trim();
            } catch (error) {
                this.logger.warn('GroupEnrollmentDataProvider → token de sessió invàlid', error);
                break;
            }
        }
        return valor.replace(/^(?:\\?["'])+/, '').replace(/(?:\\?["'])+$/, '');
    }

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

    llegeixJsonSessio(clau) {
        const valor = sessionStorage.getItem(clau);
        if (!valor) return null;
        try {
            return JSON.parse(valor);
        } catch (error) {
            this.logger.warn(`GroupEnrollmentDataProvider → valor de sessió invàlid: ${clau}`, error);
            return null;
        }
    }
}
