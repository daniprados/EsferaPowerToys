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
        const avaluacionsFinals = this.obtéAvaluacionsFinals(avaluacions, maxAvaluacions);

        avaluacionsFinals.forEach(avaluacio => {
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
     * Obté les avaluacions finals disponibles en ordre numèric estable.
     * Admet tant els codis interns FINAL_n com la forma abreujada Fn.
     * @param {Array<Object>} avaluacions
     * @param {number} maxAvaluacions
     * @returns {Array<Object>}
     */
    obtéAvaluacionsFinals(avaluacions, maxAvaluacions) {
        const totalAvaluacions = Number(maxAvaluacions);
        const maxim = Number.isFinite(totalAvaluacions) && totalAvaluacions > 0
            ? Math.floor(totalAvaluacions)
            : null;

        return avaluacions
            .map((avaluacio, index) => ({
                avaluacio,
                index,
                numero: this.obtéNúmeroAvaluacióFinal(avaluacio?.codi),
            }))
            .filter(item => item.numero !== null && (maxim === null || item.numero <= maxim))
            .sort((a, b) => a.numero - b.numero || a.index - b.index)
            .map(item => item.avaluacio);
    }

    /**
     * Obté una avaluació final pel seu número, independentment de la posició a l'array.
     * Manté el fallback posicional per a dades antigues sense codi reconeixible.
     * @param {Array<Object>} avaluacions
     * @param {number} numeroAvaluacio
     * @returns {Object|null}
     */
    obtéAvaluacióFinal(avaluacions, numeroAvaluacio) {
        const numero = Number(numeroAvaluacio);
        if (!Array.isArray(avaluacions) || !Number.isInteger(numero) || numero < 1) return null;

        return this.obtéAvaluacionsFinals(avaluacions)
            .find(avaluacio => this.obtéNúmeroAvaluacióFinal(avaluacio?.codi) === numero)
            ?? avaluacions[numero - 1]
            ?? null;
    }

    /**
     * Obté la darrera avaluació final disponible.
     * @param {Array<Object>} avaluacions
     * @param {number} maxAvaluacions
     * @returns {Object|null}
     */
    obtéDarreraAvaluacióFinal(avaluacions, maxAvaluacions) {
        if (!Array.isArray(avaluacions)) return null;
        return this.obtéAvaluacionsFinals(avaluacions, maxAvaluacions).at(-1) ?? null;
    }

    /**
     * Extreu el número d'un codi FINAL_n o Fn vàlid.
     * @param {string} codi
     * @returns {number|null}
     */
    obtéNúmeroAvaluacióFinal(codi) {
        const match = typeof codi === 'string' ? codi.trim().match(/^(?:FINAL_|F)(\d+)$/i) : null;
        return match ? Number(match[1]) : null;
    }
}
