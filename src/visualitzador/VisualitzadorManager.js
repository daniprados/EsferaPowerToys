import { NotesAggregationHelper } from '../dataProviders/NotesAggregationHelper.js';

/**
 * Coordina l'obtenció de dades i l'obertura del visualitzador.
 */
export class VisualitzadorManager {
    constructor(logger, dataProvider, modelBuilder, modal, notesAggregationHelper = new NotesAggregationHelper()) {
        this.logger = logger;
        this.dataProvider = dataProvider;
        this.modelBuilder = modelBuilder;
        this.modal = modal;
        this.notesAggregationHelper = notesAggregationHelper;
    }

    /**
     * Carrega les dades directament d'Esfer@ i obre el modal.
     * @param {number|typeof NotesAggregationHelper.MODE_AGREGAT} evaluation
     */
    async obreVisualitzador(evaluation = 1) {
        this.logger.log('VisualitzadorManager → obreVisualitzador inici');

        try {
            const dadesExportació = await this.dataProvider.obtéDadesExportació();
            if (!dadesExportació) return;

            const isAgregat = this.notesAggregationHelper.ésModeAgregació(evaluation);
            const maxAvaluacions = isAgregat ? await this.dataProvider.obtéMaxAvaluacions() : 0;
            const model = this.modelBuilder.construeixModel(
                dadesExportació.notesAlumnes,
                evaluation,
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
