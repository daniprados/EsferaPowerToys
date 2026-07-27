/**
 * Activa i actualitza els indicadors de població a la fitxa de l'alumne/a.
 */
export class PopulationFeatureManager {
    /**
     * @param {import('../PowerToysLogger.js').PowerToysLogger} logger
     * @param {import('../dataProviders/PopulationDataProvider.js').PopulationDataProvider} dataProvider
     * @param {import('./PopulationUIBuilder.js').PopulationUIBuilder} uiBuilder
     * @param {import('../ContainerUIBuilder.js').ContainerUIBuilder} containerBuilder
     */
    constructor(logger, dataProvider, uiBuilder, containerBuilder) {
        this.logger = logger;
        this.dataProvider = dataProvider;
        this.uiBuilder = uiBuilder;
        this.containerBuilder = containerBuilder;
        this.formSelector = 'form[name="alumneform"]';
        this.containerId = 'powertoys-population-box';
        this.activationPromise = null;
        this.calculationPromise = null;
    }

    async tryActivate() {
        const form = document.querySelector(this.formSelector);
        if (!form || document.getElementById(this.containerId)) return;
        if (this.activationPromise) return this.activationPromise;
        this.activationPromise = this.activa(form)
            .catch((error) => this.logger.error('PopulationFeatureManager → error activant indicadors', error))
            .finally(() => { this.activationPromise = null; });
        return this.activationPromise;
    }

    /**
     * Activa el panell una única vegada mentre el DOM s'està estabilitzant.
     * @param {HTMLFormElement} form
     * @returns {Promise<void>}
     */
    async activa(form) {
        const cursEscolar = await this.dataProvider.obtéCursActual();
        if (!cursEscolar || document.getElementById(this.containerId)) return;
        const dades = this.obtéCache(cursEscolar);
        this.render(form, cursEscolar, dades);
        if (!dades) await this.recalcula(form, cursEscolar);
    }

    obteClauCache(cursEscolar) {
        return `powertoys_population_${cursEscolar}`;
    }

    obtéCache(cursEscolar) {
        try { return JSON.parse(localStorage.getItem(this.obteClauCache(cursEscolar))) || null; }
        catch (error) { this.logger.warn('PopulationFeatureManager → cache invàlid', error); return null; }
    }

    render(form, cursEscolar, dades) {
        const panel = this.uiBuilder.createPanel(
            dades,
            () => this.recalcula(form, cursEscolar),
            () => this.descarregaCsv(dades),
        );
        this.containerBuilder.insertDiv(panel, form.closest('fieldset') || form);
    }

    async recalcula(form, cursEscolar) {
        if (this.calculationPromise) return this.calculationPromise;
        this.calculationPromise = this.dataProvider.calculaIndicadors(cursEscolar)
            .then((indicadors) => {
                const dades = { ...indicadors, calculatedAt: new Date().toISOString(), cursEscolar };
                localStorage.setItem(this.obteClauCache(cursEscolar), JSON.stringify(dades));
                this.render(form, cursEscolar, dades);
            })
            .catch((error) => this.logger.error('PopulationFeatureManager → error recalculant indicadors', error))
            .finally(() => { this.calculationPromise = null; });
        return this.calculationPromise;
    }

    descarregaCsv(dades) {
        if (!dades) return;
        const files = [['Estudi', 'Nivell', 'Al llarg del curs', 'Actualment', 'Baixes']];
        dades.estudis.forEach((estudi) => estudi.nivells.forEach((nivell) => files.push([
            estudi.estudi, nivell.nivell, nivell.totalCurs, nivell.altes, nivell.baixes,
        ])));
        const csv = files.map((fila) => fila.map(this.escapaCsv).join(';')).join('\r\n');
        const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url; link.download = `Esfera_Poblacio_${dades.cursEscolar.replace('/', '-')}.csv`;
        link.click(); URL.revokeObjectURL(url);
    }

    escapaCsv(valor) {
        return `"${String(valor).replaceAll('"', '""')}"`;
    }
}
