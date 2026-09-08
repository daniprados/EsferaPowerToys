/**
 * Coordina la consulta dels grups seleccionats i la descàrrega del llibre de matrícules.
 */
export class GroupEnrollmentExportManager {
    /**
     * @param {import('../PowerToysLogger.js').PowerToysLogger} logger
     * @param {import('../dataProviders/GroupEnrollmentDataProvider.js').GroupEnrollmentDataProvider} dataProvider
     * @param {import('./GroupEnrollmentWorkbookBuilder.js').GroupEnrollmentWorkbookBuilder} workbookBuilder
     */
    constructor(logger, dataProvider, workbookBuilder) {
        this.logger = logger;
        this.dataProvider = dataProvider;
        this.workbookBuilder = workbookBuilder;
    }

    /**
     * @param {HTMLTableElement} table
     * @param {(completed: number, total: number) => void} onProgress
     * @returns {Promise<number>}
     */
    async descarregaGrupsSeleccionats(table, onProgress = () => {}) {
        const grups = this.dataProvider.obtéGrupsSeleccionats(table);
        if (grups.length === 0) {
            throw new Error('Selecciona com a mínim un grup de cicle formatiu (CF).');
        }

        let completats = 0;
        const dadesGrups = new Array(grups.length);
        let properIndex = 0;
        const worker = async () => {
            while (properIndex < grups.length) {
                const index = properIndex;
                properIndex += 1;
                dadesGrups[index] = await this.dataProvider.obtéDadesGrup(grups[index]);
                completats += 1;
                onProgress(completats, grups.length);
            }
        };
        await Promise.all(Array.from({ length: Math.min(3, grups.length) }, () => worker()));

        const workbook = this.workbookBuilder.construeixWorkbook(dadesGrups);
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Esfera_Matricules_CF_${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
        this.logger.log(`GroupEnrollmentExportManager → ${grups.length} grups descarregats`);
        return grups.length;
    }
}
