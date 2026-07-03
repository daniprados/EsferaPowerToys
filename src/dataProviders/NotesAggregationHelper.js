/**
 * Agrega notes de múltiples avaluacions mantenint la semàntica del full Agregat.
 */
export class NotesAggregationHelper {
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

        for (let i = 1; i <= maxAvaluacions; i++) {
            let idAvaluacio = null;
            if (alumne.avaluacions && Array.isArray(alumne.avaluacions)) {
                const ava = alumne.avaluacions[i - 1];
                if (ava) idAvaluacio = ava.id;
            }

            if (idAvaluacio && alumne.continguts[idAvaluacio]) {
                const notes = alumne.continguts[idAvaluacio];
                notes.forEach(nota => {
                    if (!nota?.codi) return;
                    mapNotes.set(nota.codi, nota);
                });
            }
        }

        return Array.from(mapNotes.values());
    }
}
