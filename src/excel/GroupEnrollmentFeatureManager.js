/**
 * Activa l'exportació de matrícules a la pantalla del llistat de grups.
 */
export class GroupEnrollmentFeatureManager {
    /**
     * @param {import('../PowerToysLogger.js').PowerToysLogger} logger
     * @param {import('./GroupEnrollmentUIBuilder.js').GroupEnrollmentUIBuilder} uiBuilder
     * @param {import('../ContainerUIBuilder.js').ContainerUIBuilder} containerBuilder
     */
    constructor(logger, uiBuilder, containerBuilder) {
        this.logger = logger;
        this.uiBuilder = uiBuilder;
        this.containerBuilder = containerBuilder;
        this.tableSelector = 'table[data-st-table="gClasse.grupsList"]';
        this.containerId = 'powertoys-group-export-box';
    }

    tryActivate() {
        const table = document.querySelector(this.tableSelector);
        if (!table || document.getElementById(this.containerId)) return;
        const panel = this.uiBuilder.createPanel(table, this.containerId);
        this.containerBuilder.insertDiv(panel, table);
        this.logger.log('GroupEnrollmentFeatureManager → panell inserit correctament');
    }
}
