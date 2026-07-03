/**
 * Coordina l'obtenció de dades i l'obertura del visualitzador.
 */
export class VisualitzadorManager {
    constructor(logger, dataProvider, modelBuilder, modal) {
        this.logger = logger;
        this.dataProvider = dataProvider;
        this.modelBuilder = modelBuilder;
        this.modal = modal;
    }

    /**
     * Carrega les dades directament d'Esfer@ i obre el modal.
     */
    async obreVisualitzador(evaluation = 1) {
        this.logger.log('VisualitzadorManager → obreVisualitzador inici');

        try {
            const dadesExportació = await this.dataProvider.obtéDadesExportació();
            if (!dadesExportació) return;

            const isAgregat = evaluation === 'totes' || evaluation === 'agregat';
            const maxAvaluacions = isAgregat ? await this.dataProvider.obtéMaxAvaluacions() : 0;
            const model = this.modelBuilder.construeixModel(
                dadesExportació.notesAlumnes,
                isAgregat ? 'agregat' : evaluation,
                maxAvaluacions,
            );
            this.modal.open(model.students, this.obtéTextContextVisualització(evaluation, isAgregat));
        } catch (error) {
            this.logger.error('Error crític a VisualitzadorManager:', error);
        }
    }

    /**
     * Obté el text contextual que indica quines dades s'estan visualitzant.
     */
    obtéTextContextVisualització(evaluation, isAgregat) {
        return isAgregat
            ? 'Visualitzant: Totes les avaluacions (agregat)'
            : 'Visualitzant: Avaluació ' + evaluation;
    }
}
