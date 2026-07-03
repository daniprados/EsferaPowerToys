/**
 * Agrega notes de múltiples avaluacions mantenint la semàntica del full Agregat.
 */
export class NotesAggregationHelper {
    static MODE_AGREGAT = 'agregat';

    /**
     * Indica si el mode demanat correspon a l'agregació de totes les avaluacions.
     * @param {number|typeof NotesAggregationHelper.MODE_AGREGAT} evaluation
     * @returns {boolean}
     */
    ésModeAgregació(evaluation) {
        return evaluation === NotesAggregationHelper.MODE_AGREGAT;
    }

    /**
     * Obté les notes agregades de totes les avaluacions disponibles.
     * Els mòduls d'avaluacions anteriors es mantenen si no apareixen després,
     * i les avaluacions posteriors sobreescriuen el mateix codi de contingut.
     * @param {Object} alumne
     * @param {number} maxAvaluacions
     * @returns {Array<Object>}
     */
    obtéNotesAgregades(alumne, maxAvaluacions) {
        const mapNotes = new Map();
        const avaluacions = Array.isArray(alumne?.avaluacions) ? alumne.avaluacions : [];
        const codisAvaluacio = this.obtéCodisAvaluacio(avaluacions, maxAvaluacions);

        codisAvaluacio.forEach(codiAvaluacio => {
            const avaluacio = avaluacions.find(ava => ava?.codi === codiAvaluacio);
            const idAvaluacio = avaluacio?.id;

            if (idAvaluacio && Array.isArray(alumne?.continguts?.[idAvaluacio])) {
                const notes = alumne.continguts[idAvaluacio];
                notes.forEach(nota => {
                    if (!nota?.codi) return;
                    mapNotes.set(nota.codi, nota);
                });
            }
        });

        return Array.from(mapNotes.values());
    }

    /**
     * Calcula els codis FINAL_n a processar en ordre numèric estable.
     * @param {Array<Object>} avaluacions
     * @param {number} maxAvaluacions
     * @returns {Array<string>}
     */
    obtéCodisAvaluacio(avaluacions, maxAvaluacions) {
        const totalAvaluacions = Number(maxAvaluacions);
        if (Number.isFinite(totalAvaluacions) && totalAvaluacions > 0) {
            return Array.from(
                { length: Math.floor(totalAvaluacions) },
                (_, index) => `FINAL_${index + 1}`,
            );
        }

        return avaluacions
            .map(ava => this.obtéNúmeroAvaluacióFinal(ava?.codi))
            .filter(numero => numero !== null)
            .sort((a, b) => a - b)
            .map(numero => `FINAL_${numero}`);
    }

    /**
     * Extreu el número d'un codi FINAL_n vàlid.
     * @param {string} codi
     * @returns {number|null}
     */
    obtéNúmeroAvaluacióFinal(codi) {
        const match = typeof codi === 'string' ? codi.match(/^FINAL_(\d+)$/) : null;
        return match ? Number(match[1]) : null;
    }
}
