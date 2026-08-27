import { NotaValueHelper } from '../dataProviders/NotaValueHelper.js';
import { NotesAggregationHelper } from '../dataProviders/NotesAggregationHelper.js';

/**
 * Construeix el llibre Excel de notes a partir de dades normalitzades d'Esfer@.
 */
export class ExcelNotesWorkbookBuilder {
    constructor(excelJS = (typeof window !== 'undefined' ? window.ExcelJS : null), notaValueHelper = new NotaValueHelper(), notesAggregationHelper = new NotesAggregationHelper()) {
        this.excelJS = excelJS;
        this.notaValueHelper = notaValueHelper;
        this.notesAggregationHelper = notesAggregationHelper;
    }

    /**
     * Construeix el llibre Excel amb capçaleres, dades i estils per a una sola avaluació.
     * @param {Array<Object>} dadesAlumnes
     * @param {number|typeof NotesAggregationHelper.MODE_AGREGAT} evaluation
     * @returns {any}
     */
    construeixWorkbookNotes(dadesAlumnes, evaluation, maxAvaluacions = 0) {
        const workbook = new this.excelJS.Workbook();
        this.afegeixFullAvaluacio(workbook, dadesAlumnes, evaluation, 'Notes', maxAvaluacions);
        this.afegeixFullNotesFlat(workbook, dadesAlumnes, evaluation, maxAvaluacions);
        this.afegeixFullResumModuls(workbook, dadesAlumnes, evaluation, maxAvaluacions);
        this.afegeixFullResumAvaluacio(workbook, dadesAlumnes, maxAvaluacions);
        return workbook;
    }

    /**
     * Construeix un llibre Excel amb totes les avaluacions i un full agregat.
     * @param {Array<Object>} dadesAlumnes
     * @param {number} maxAvaluacions
     * @returns {any}
     */
    construeixWorkbookTotesLesAvaluacions(dadesAlumnes, maxAvaluacions) {
        const workbook = new this.excelJS.Workbook();

        for (let i = 1; i <= maxAvaluacions; i++) {
            this.afegeixFullAvaluacio(workbook, dadesAlumnes, i, `Av ${i}`);
        }

        this.afegeixFullAvaluacio(workbook, dadesAlumnes, NotesAggregationHelper.MODE_AGREGAT, 'Agregat', maxAvaluacions);
        this.afegeixFullNotesFlat(workbook, dadesAlumnes, NotesAggregationHelper.MODE_AGREGAT, maxAvaluacions);
        this.afegeixFullResumModuls(workbook, dadesAlumnes, NotesAggregationHelper.MODE_AGREGAT, maxAvaluacions);
        this.afegeixFullResumAvaluacio(workbook, dadesAlumnes, maxAvaluacions);

        return workbook;
    }

    /**
     * Afegeix un full d'avaluació al workbook.
     */
    afegeixFullAvaluacio(workbook, dadesAlumnes, evaluation, sheetName, maxAvaluacions = 0) {
        const { header1, header2, files, spansModuls } = this.construeixTaulaNotes(dadesAlumnes, evaluation, maxAvaluacions);

        const worksheet = workbook.addWorksheet(sheetName);
        worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];

        worksheet.addRow(header1);
        worksheet.addRow(header2);
        files.forEach(fila => worksheet.addRow(fila));

        worksheet.getRows(1, 2).forEach(row => {
            row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.alignment = { vertical: 'middle', horizontal: 'center' };
            row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: row.number === 1 ? 'FF1D4ED8' : 'FF2563EB' },
            };
        });

        spansModuls.forEach(({ start, end }) => {
            if (end > start) {
                worksheet.mergeCells(1, start, 1, end);
            }
        });

        const borderFi = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };

        const borderIniciModul = {
            ...borderFi,
            left: { style: 'medium', color: { argb: 'FF64748B' } },
        };

        const borderFinalModul = {
            ...borderFi,
            right: { style: 'medium', color: { argb: 'FF64748B' } },
        };

        const columnesIniciModul = new Set(spansModuls.map(({ start }) => start));
        const columnesFinalModul = new Set(spansModuls.map(({ end }) => end));

        for (let colNumber = 3; colNumber <= worksheet.columnCount; colNumber++) {
            worksheet.getRow(2).getCell(colNumber).alignment = { vertical: 'middle', horizontal: 'right' };
        }

        const headers2 = worksheet.getRow(2).values;

        for (let rowNumber = 3; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            for (let colNumber = 3; colNumber <= worksheet.columnCount; colNumber++) {
                const cell = row.getCell(colNumber);
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                cell.border = this.obtéBorderNota(colNumber, columnesIniciModul, columnesFinalModul, borderFi, borderIniciModul, borderFinalModul);

                const isConvocatoria = headers2[colNumber] === 'n. convocatoria';
                const isProvisional = headers2[colNumber] === 'provisional';
                const isCodiModul = headers2[colNumber - 1] === 'n. convocatoria';

                if (isConvocatoria || isCodiModul || isProvisional) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF1F5F9' }, // slate-100 lleuger
                    };
                }

                this.aplicaEstilNota(cell);
            }
        }

        columnesIniciModul.forEach(colNumber => {
            for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
                const cell = worksheet.getRow(rowNumber).getCell(colNumber);
                cell.font = { ...(cell.font || {}), bold: true };
            }
        });

        this.ajustaAmpladesColumnes(worksheet);
        return worksheet;
    }

    /**
     * Afegeix el resum d'estats de la darrera avaluació disponible de cada alumne.
     */
    afegeixFullResumAvaluacio(workbook, dadesAlumnes, maxAvaluacions = 0) {
        const worksheet = workbook.addWorksheet('Resum avaluació');
        const alumnes = this.obtéAlumnesValids(dadesAlumnes);
        const detalls = alumnes.map(alumne => {
            const avaluacio = this.obtéDarreraAvaluacioAmbEstat(alumne?.avaluacions, maxAvaluacions);
            const codiEstat = String(avaluacio?.estat ?? '').trim();
            return {
                idAlumne: alumne.idAlumne ?? alumne.idMatricula ?? '',
                nom: alumne.nom ?? '',
                avaluacio: avaluacio?.codi ?? '',
                codiEstat,
                estat: this.obtéNomEstatAvaluacio(codiEstat),
            };
        });
        const comptadors = new Map();

        detalls.forEach(detall => {
            const clau = detall.codiEstat || '';
            comptadors.set(clau, (comptadors.get(clau) ?? 0) + 1);
        });

        worksheet.addRow([
            'Estat', 'Codi', 'Alumnes', 'Percentatge', '',
            'idAlumne', 'Alumne', 'Darrera avaluació', 'Codi estat', 'Estat',
        ]);

        const codisOrdenats = Array.from(comptadors.keys()).sort((codiA, codiB) => {
            const ordre = ['CF_TITOL', 'CF_SUPERA', 'CF_REP', 'CF_SEG_AVAL', ''];
            const posicioA = ordre.indexOf(codiA);
            const posicioB = ordre.indexOf(codiB);
            if (posicioA !== -1 || posicioB !== -1) {
                return (posicioA === -1 ? ordre.length : posicioA) - (posicioB === -1 ? ordre.length : posicioB);
            }
            return codiA.localeCompare(codiB);
        });
        const totalAlumnes = detalls.length;
        const totalFiles = Math.max(codisOrdenats.length, detalls.length);

        for (let index = 0; index < totalFiles; index++) {
            const codiEstat = codisOrdenats[index];
            const detall = detalls[index];
            const recompte = codiEstat === undefined ? undefined : comptadors.get(codiEstat);
            worksheet.addRow([
                codiEstat === undefined ? undefined : this.obtéNomEstatAvaluacio(codiEstat),
                codiEstat === undefined ? undefined : codiEstat,
                recompte,
                recompte === undefined || totalAlumnes === 0 ? undefined : recompte / totalAlumnes,
                '',
                detall?.idAlumne,
                detall?.nom,
                detall?.avaluacio,
                detall?.codiEstat,
                detall?.estat,
            ]);
        }

        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        worksheet.autoFilter = { from: { row: 1, column: 6 }, to: { row: Math.max(1, detalls.length + 1), column: 10 } };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
        for (let rowNumber = 2; rowNumber <= codisOrdenats.length + 1; rowNumber++) {
            worksheet.getRow(rowNumber).getCell(4).numFmt = '0.0%';
        }
        [28, 16, 12, 14, 3, 16, 32, 20, 18, 32].forEach((width, index) => {
            worksheet.getColumn(index + 1).width = width;
        });

        return worksheet;
    }

    /**
     * Obté l'avaluació més recent amb un estat informat, encara que sigui la primera.
     * Si cap avaluació té estat, conserva la darrera disponible per mostrar-la al detall.
     */
    obtéDarreraAvaluacioAmbEstat(avaluacions, maxAvaluacions = 0) {
        const finals = this.notesAggregationHelper.obtéAvaluacionsFinals(
            Array.isArray(avaluacions) ? avaluacions : [],
            maxAvaluacions,
        );
        return [...finals]
            .reverse()
            .find(avaluacio => String(avaluacio?.estat ?? '').trim() !== '')
            ?? finals.at(-1)
            ?? null;
    }

    /**
     * Tradueix els codis de conseqüència d'Esfer@ a etiquetes llegibles.
     */
    obtéNomEstatAvaluacio(codiEstat) {
        const noms = {
            CF_SUPERA: 'Accedeix al curs següent',
            CF_REP: 'Roman al mateix curs',
            CF_SEG_AVAL: 'Pendent de la següent avaluació',
            CF_TITOL: 'Obté el títol del Cicle Formatiu',
        };
        const codi = String(codiEstat ?? '').trim();
        return noms[codi] ?? (codi || 'No informat');
    }

    /**
     * Afegeix una pestanya normalitzada amb una fila per nota.
     */
    afegeixFullNotesFlat(workbook, dadesAlumnes, evaluation, maxAvaluacions = 0) {
        const suffix = this.notesAggregationHelper.ésModeAgregació(evaluation) ? ' (Agregat)' : '';
        const worksheet = workbook.addWorksheet(`Notes Flat${suffix}`);
        worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];

        const header = ['idAlumne', 'nom Alumne', 'Codi Mòdul', 'Nom Mòdul', 'Codi', 'Nom', 'Tipus', 'Subtipus', 'Nota'];
        worksheet.addRow(header);

        this.obtéAlumnesValids(dadesAlumnes).forEach(alumne => {
            const notes = this.notesAggregationHelper.ésModeAgregació(evaluation)
                ? this.obtéNotesAgregades(alumne, maxAvaluacions)
                : this.obtéNotesAvaluacioSeleccionada(alumne, evaluation);

            if (!Array.isArray(notes)) return;

            const modulsPerCodi = new Map(
                notes
                    .filter(contingut => contingut?.codi && String(contingut.jerarquia) === '2')
                    .map(contingut => [contingut.codi, contingut]),
            );

            notes.forEach(contingut => {
                if (!contingut?.codi) return;

                const codiModul = this.obtéCodiModul(contingut.codi);
                const tipusNota = this.obtéTipusNotaFlat(contingut.codi, codiModul);
                const modul = contingut.codi === codiModul ? contingut : modulsPerCodi.get(codiModul);

                worksheet.addRow([
                    alumne.idAlumne ?? '',
                    alumne.nom ?? '',
                    codiModul,
                    modul?.nom ?? '',
                    contingut.codi,
                    contingut.nom ?? '',
                    tipusNota.tipus,
                    tipusNota.subtipus,
                    this.obtéValorNota(contingut),
                ]);
            });
        });

        worksheet.getRow(1).font = { bold: true };
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: header.length },
        };

        const notaColumn = header.indexOf('Nota') + 1;
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            this.aplicaEstilNotaAFila(worksheet.getRow(rowNumber), notaColumn, header.length);
        }

        this.ajustaAmpladesColumnesFlat(worksheet);
    }

    /**
     * Afegeix el resum de resultats per mòdul de l'avaluació exportada.
     */
    afegeixFullResumModuls(workbook, dadesAlumnes, evaluation, maxAvaluacions = 0) {
        const suffix = this.notesAggregationHelper.ésModeAgregació(evaluation) ? ' (Agregat)' : '';
        const worksheet = workbook.addWorksheet(`Resum mòduls${suffix}`);
        const header = [
            'Codi mòdul', 'Mòdul',
            '1a convocatòria: avaluats', '1a convocatòria: aprovats', '1a convocatòria: percentatge',
            '2a convocatòria: avaluats', '2a convocatòria: aprovats', '2a convocatòria: percentatge',
            'Total: matriculats', 'Total: aprovats', 'Total: percentatge',
        ];
        worksheet.addRow(header);

        const moduls = new Map();
        this.obtéAlumnesValids(dadesAlumnes).forEach(alumne => {
            const notes = this.filtraContingutsExportables(
                this.obtéNotesPerAvaluacio(alumne, evaluation, maxAvaluacions),
            );
            notes.filter(nota => String(nota?.jerarquia) === '2' && nota?.codi).forEach(modul => {
                if (!moduls.has(modul.codi)) moduls.set(modul.codi, modul.nom ?? '');
            });
        });

        Array.from(moduls.entries())
            .sort(([codiA], [codiB]) => codiA.localeCompare(codiB))
            .forEach(([codiModul, nomModul]) => {
                const resum = {
                    primeraAvaluats: 0,
                    primeraAprovats: 0,
                    segonaAvaluats: 0,
                    segonaAprovats: 0,
                    matriculats: 0,
                };

                this.obtéAlumnesValids(dadesAlumnes).forEach(alumne => {
                    const notes = this.filtraContingutsExportables(
                        this.obtéNotesPerAvaluacio(alumne, evaluation, maxAvaluacions),
                    );
                    const modul = notes.find(nota => nota?.codi === codiModul && String(nota.jerarquia) === '2');
                    if (!modul) return;

                    resum.matriculats++;
                    resum.primeraAvaluats++;

                    const ésSegonaConvocatoria = this.ésSegonaConvocatoriaModul(
                        alumne,
                        evaluation,
                        maxAvaluacions,
                        notes,
                        codiModul,
                        modul,
                    );

                    if (ésSegonaConvocatoria) {
                        if (!this.ésNoPresentat(modul)) {
                            resum.segonaAvaluats++;
                            if (this.ésModulAprovat(notes, codiModul, modul)) resum.segonaAprovats++;
                        }
                    } else if (this.ésModulAprovat(notes, codiModul, modul)) {
                        resum.primeraAprovats++;
                    }
                });

                const totalAprovats = resum.primeraAprovats + resum.segonaAprovats;
                worksheet.addRow([
                    codiModul,
                    nomModul,
                    resum.primeraAvaluats,
                    resum.primeraAprovats,
                    this.calculaPercentatge(resum.primeraAprovats, resum.primeraAvaluats),
                    resum.segonaAvaluats,
                    resum.segonaAprovats,
                    this.calculaPercentatge(resum.segonaAprovats, resum.segonaAvaluats),
                    resum.matriculats,
                    totalAprovats,
                    this.calculaPercentatge(totalAprovats, resum.matriculats),
                ]);
            });

        const capçalera = worksheet.getRow(1);
        capçalera.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        capçalera.alignment = { vertical: 'middle', horizontal: 'center' };
        capçalera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
        worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.length } };
        [5, 8, 11].forEach(colNumber => {
            for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
                worksheet.getRow(rowNumber).getCell(colNumber).numFmt = '0.0%';
            }
        });
        this.ajustaAmpladesColumnesFlat(worksheet);
        return worksheet;
    }

    /**
     * Determina si un mòdul amb estada en empresa està aprovat comprovant
     * exclusivament que tots els RA ordinaris estiguin superats.
     */
    ésAprovatPerEstadaEnEmpresa(notes, codiModul) {
        const contingutsModul = notes.filter(nota => nota?.codi === codiModul || String(nota?.codi ?? '').startsWith(`${codiModul}_`));
        const estades = contingutsModul.filter(nota => this.ésEstadaEnEmpresa(nota));
        const ras = this.obtéRasModul(contingutsModul);

        return estades.length > 0
            && ras.length > 0
            && ras.every(nota => this.notaValueHelper.ésResultatSuperat(this.obtéValorNota(nota)));
    }

    /**
     * Determina si el mòdul està superat. Qualsevol RA suspès invalida el mòdul,
     * encara que Esfer@ presenti una nota numèrica al mòdul.
     */
    ésModulAprovat(notes, codiModul, modul) {
        const contingutsModul = notes.filter(nota => nota?.codi === codiModul || String(nota?.codi ?? '').startsWith(`${codiModul}_`));
        const ras = this.obtéRasModul(contingutsModul);

        if (contingutsModul.some(nota => this.ésEstadaEnEmpresa(nota))) {
            return this.ésAprovatPerEstadaEnEmpresa(notes, codiModul);
        }

        if (ras.some(nota => !this.notaValueHelper.ésResultatSuperat(this.obtéValorNota(nota)))) return false;
        return this.notaValueHelper.ésResultatSuperat(this.obtéValorNota(modul));
    }

    /**
     * Determina si el resultat s'ha de comptar a la segona convocatòria.
     * En els mòduls amb estada, Esfer@ pot mantenir la convocatòria 1 i la nota
     * del mòdul en PQ encara que els RA ordinaris no quedin superats fins a l'F2.
     */
    ésSegonaConvocatoriaModul(alumne, evaluation, maxAvaluacions, notes, codiModul, modul) {
        const contingutsModul = notes.filter(nota => nota?.codi === codiModul || String(nota?.codi ?? '').startsWith(`${codiModul}_`));
        const téEstada = contingutsModul.some(nota => this.ésEstadaEnEmpresa(nota));
        if (!téEstada) return String(modul?.convocatoria) === '2';

        const notesPrimera = this.filtraContingutsExportables(this.obtéNotesAgregades(alumne, 1));
        const modulPrimera = notesPrimera.find(nota => nota?.codi === codiModul && String(nota.jerarquia) === '2');
        if (modulPrimera && this.ésModulAprovat(notesPrimera, codiModul, modulPrimera)) return false;

        // Conservem el comportament històric si només hi ha una avaluació
        // disponible però Esfer@ ja marca explícitament la segona convocatòria.
        if (String(modul?.convocatoria) === '2') return true;

        const numeroAvaluacio = this.notesAggregationHelper.ésModeAgregació(evaluation)
            ? Number(maxAvaluacions)
            : Number(evaluation);
        if (!Number.isFinite(numeroAvaluacio) || numeroAvaluacio < 2) return false;

        const avaluacioSegona = this.notesAggregationHelper.obtéAvaluacióFinal(alumne?.avaluacions, 2);
        const notesSegona = this.filtraContingutsExportables(alumne?.continguts?.[avaluacioSegona?.id]);

        return notesSegona.some(nota => nota?.codi === codiModul || String(nota?.codi ?? '').startsWith(`${codiModul}_`));
    }

    /**
     * Obté els RA del mòdul excloent el contingut d'estada en empresa.
     */
    obtéRasModul(contingutsModul) {
        return contingutsModul.filter(nota => /RA$/.test(nota?.codi ?? '') && !this.ésEstadaEnEmpresa(nota));
    }

    /**
     * Identifica el contingut corresponent a l'estada en empresa.
     */
    ésEstadaEnEmpresa(nota) {
        const codi = String(nota?.codi ?? '');
        const nom = String(nota?.nom ?? '');
        return /_\d*EM$/i.test(codi) || /estada.*empresa|empresa.*estada/i.test(nom);
    }

    /**
     * Determina si el mòdul figura com a no presentat a la convocatòria.
     */
    ésNoPresentat(modul) {
        return String(this.obtéValorNota(modul)).trim().toUpperCase() === 'NP';
    }

    /**
     * Calcula un percentatge evitant divisions per zero.
     */
    calculaPercentatge(numerador, denominador) {
        return denominador > 0 ? numerador / denominador : 0;
    }

    /**
     * Aplica l'estil de nota aprovada a tota la fila plana, clonant els objectes d'estil per cel·la.
     */
    aplicaEstilNotaAFila(row, notaColumn, columnCount) {
        const notaCell = row.getCell(notaColumn);
        if (!this.aplicaEstilNota(notaCell)) return;

        for (let colNumber = 1; colNumber <= columnCount; colNumber++) {
            const cell = row.getCell(colNumber);
            cell.fill = this.clonaEstil(notaCell.fill);
            cell.font = this.clonaEstil(notaCell.font);
        }
    }

    /**
     * Clona estructures simples d'estil d'ExcelJS per evitar compartir referències mutables.
     */
    clonaEstil(style) {
        if (!style) return style;
        return JSON.parse(JSON.stringify(style));
    }

    /**
     * Deriva el codi del mòdul eliminant només sufixos RA/EM coneguts.
     */
    obtéCodiModul(codi) {
        return String(codi).replace(/_\d{2}(?:RA|EM)$/, '');
    }

    /**
     * Deriva el tipus i subtipus per a la pestanya plana.
     */
    obtéTipusNotaFlat(codi, codiModul) {
        if (codi === codiModul) {
            return { tipus: 'MP', subtipus: 'MP' };
        }

        const match = String(codi).match(/_(\d{2})(RA|EM)$/);
        return {
            tipus: match?.[2] ?? '',
            subtipus: match?.[1] ?? '',
        };
    }

    /**
     * Ajusta amplades de la pestanya plana segons el contingut.
     */
    ajustaAmpladesColumnesFlat(worksheet) {
        worksheet.columns.forEach(column => {
            const maxLength = Math.max(
                10,
                ...column.values.slice(1).map(value => String(value ?? '').length),
            );
            column.width = Math.min(maxLength + 2, 45);
        });
    }

    /**
     * Retorna el border de la cel·la marcant visualment l'inici i final de cada mòdul.
     */
    obtéBorderNota(colNumber, columnesIniciModul, columnesFinalModul, borderFi, borderIniciModul, borderFinalModul) {
        if (columnesIniciModul.has(colNumber) && columnesFinalModul.has(colNumber)) {
            return {
                ...borderFi,
                left: borderIniciModul.left,
                right: borderFinalModul.right,
            };
        }

        if (columnesIniciModul.has(colNumber)) return borderIniciModul;
        if (columnesFinalModul.has(colNumber)) return borderFinalModul;
        return borderFi;
    }

    /**
     * Aplica l'estil compartit per a notes aprovades.
     */
    aplicaEstilNota(cell) {
        if (!this.ésNotaAprovada(cell.value)) return false;

        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' },
        };
        cell.font = { ...(cell.font || {}), color: { argb: 'FF006100' } };
        return true;
    }

    /**
     * Ajusta amplades sense comptar la capçalera fusionada, que faria massa amples les columnes de notes.
     */
    ajustaAmpladesColumnes(worksheet) {
        worksheet.columns.forEach((column, index) => {
            if (index === 0) {
                column.width = 16;
                return;
            }

            const values = column.values.slice(index === 1 ? 1 : 2);
            const maxLength = Math.max(
                index === 1 ? 18 : 6,
                ...values.map(value => String(value ?? '').length),
            );

            column.width = index === 1
                ? Math.min(maxLength + 2, 40)
                : Math.min(maxLength + 1, 14);
        });
    }

    /**
     * Prepara la taula de notes mantenint l'estructura original d'exportació.
     * @param {Array<Object>} dadesAlumnes
     * @param {number|typeof NotesAggregationHelper.MODE_AGREGAT} evaluation
     * @param {number} maxAvaluacions
     */
    construeixTaulaNotes(dadesAlumnes, evaluation, maxAvaluacions = 0) {
        // Filtra alumnes que no tinguin notes, per exemple si hi ha hagut error.
        const alumnesValids = this.obtéAlumnesValids(dadesAlumnes);

        const moduls = new Map();

        alumnesValids.forEach(alumne => {
            const notesSenseFiltrar = this.notesAggregationHelper.ésModeAgregació(evaluation)
                ? this.obtéNotesAgregades(alumne, maxAvaluacions)
                : this.obtéNotesAvaluacioSeleccionada(alumne, evaluation);
            const notes = this.filtraContingutsExportables(notesSenseFiltrar);

            if (!notes || !Array.isArray(notes)) return;
            notes.forEach(mod => {
                if (!mod || !mod.codi) return;
                if (!moduls.has(mod.codi)) {
                    moduls.set(mod.codi, {
                        nom: mod.nom || mod.codi || 'Sense nom',
                        jerarquia: mod.jerarquia || '0',
                    });
                }
            });
        });

        const modulsArray = Array.from(moduls.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        const header1 = ['', ''];
        const header2 = ['idAlumne', 'nom'];
        const spansModuls = [];
        let spanActual = null;

        modulsArray.forEach(([codi, info]) => {
            const columnIndex = header2.length + 1;
            if (info.jerarquia == '2') {
                if (spanActual) {
                    spanActual.end = columnIndex - 1;
                    spansModuls.push(spanActual);
                }
                spanActual = { start: columnIndex, end: columnIndex };
                header1.push(info.nom);
                header2.push("n. convocatoria");

                header1.push("");
                header2.push(codi);

                header1.push('');
                header2.push("provisional");
            } else {
                header1.push('');
                header2.push(codi);
            }
        });

        if (spanActual) {
            spanActual.end = header2.length;
            spansModuls.push(spanActual);
        }

        header1.push('Estat');
        header2.push('Estat');

        const files = alumnesValids.map(alumne => {
            const notesSenseFiltrar = this.notesAggregationHelper.ésModeAgregació(evaluation)
                ? this.obtéNotesAgregades(alumne, maxAvaluacions)
                : this.obtéNotesAvaluacioSeleccionada(alumne, evaluation);
            const notes = this.filtraContingutsExportables(notesSenseFiltrar);

            const fila = [alumne.idAlumne ?? '', alumne.nom ?? ''];
            modulsArray.forEach(([codi, info]) => {
                let modData = null;
                if (Array.isArray(notes)) {
                    modData = notes.find(m => m.codi == codi);
                }

                try {
                    if (info.jerarquia == '2') {
                        fila.push(modData?.convocatoria ?? undefined);
                    }
                    fila.push(this.obtéValorNota(modData));

                    //nota provisional just després de la final
                    if (info.jerarquia == '2') {
                        fila.push(modData?.provisional ?? undefined);
                    }
                } catch {
                    if (info.jerarquia == '2') {
                        fila.push('', '', '');
                    } else {
                        fila.push('');
                    }
                }
            });
            fila.push(this.obtéEstatAvaluacio(alumne, evaluation, maxAvaluacions));
            return fila;
        });

        return { header1, header2, files, spansModuls };
    }

    /**
     * Filtra alumnes que tenen continguts de notes.
     */
    obtéAlumnesValids(dadesAlumnes) {
        return dadesAlumnes.filter(a => a && a.continguts);
    }

    /**
     * Obté les notes de l'avaluació seleccionada amb el mateix fallback històric.
     */
    obtéNotesAvaluacioSeleccionada(alumne, evaluation) {
        const avaluacio = this.notesAggregationHelper.obtéAvaluacióFinal(alumne?.avaluacions, evaluation);
        const idAvaluacio = avaluacio?.id;

        if (idAvaluacio && alumne.continguts[idAvaluacio]) {
            return alumne.continguts[idAvaluacio];
        }

        const notesValues = Object.values(alumne.continguts);
        return notesValues.at(-2) || notesValues.at(-1) || [];
    }

    /**
     * Obté les notes agregades de totes les avaluacions.
     * Si un mòdul apareix en més d'una avaluació, es conserva la darrera.
     */
    obtéNotesAgregades(alumne, maxAvaluacions) {
        return this.notesAggregationHelper.obtéNotesAgregades(alumne, maxAvaluacions);
    }

    /**
     * Exclou files de resum global que no corresponen a mòduls ni resultats d'aprenentatge.
     */
    filtraContingutsExportables(notes) {
        const codisExclosos = new Set(['QFINAL', 'QUNIVERSITAT']);
        return Array.isArray(notes)
            ? notes.filter(nota => !codisExclosos.has(String(nota?.codi ?? '').trim().toUpperCase()))
            : [];
    }

    /**
     * Resol les notes corresponents al mode d'exportació actual.
     */
    obtéNotesPerAvaluacio(alumne, evaluation, maxAvaluacions) {
        return this.notesAggregationHelper.ésModeAgregació(evaluation)
            ? this.obtéNotesAgregades(alumne, maxAvaluacions)
            : this.obtéNotesAvaluacioSeleccionada(alumne, evaluation);
    }

    /**
     * Obté l'estat (conseq) de l'avaluació. En l'agregat conserva el de la darrera avaluació disponible.
     */
    obtéEstatAvaluacio(alumne, evaluation, maxAvaluacions = 0) {
        const avaluacions = Array.isArray(alumne?.avaluacions) ? alumne.avaluacions : [];
        if (this.notesAggregationHelper.ésModeAgregació(evaluation)) {
            const darreraAvaluacio = [...avaluacions]
                .sort((a, b) => this.obtéNúmeroAvaluació(a?.codi) - this.obtéNúmeroAvaluació(b?.codi))
                .at(-1);
            return darreraAvaluacio?.estat ?? '';
        }

        return this.notesAggregationHelper.obtéAvaluacióFinal(avaluacions, evaluation)?.estat ?? '';
    }

    /**
     * Extreu el número d'una avaluació FINAL_n per ordenar-ne l'estat.
     */
    obtéNúmeroAvaluació(codi) {
        return this.notesAggregationHelper.obtéNúmeroAvaluacióFinal(codi) ?? 0;
    }


    /**
     * Normalitza una nota de contingut exactament igual que el full Notes.
     */
    obtéValorNota(contingut) {
        return this.notaValueHelper.obtéValorContingut(contingut);
    }

    /**
     * Converteix les notes numèriques a número i preserva els codis textuals.
     */
    normalitzaValorNota(valor) {
        return this.notaValueHelper.normalitzaValorNota(valor);
    }

    /**
     * Determina si una cel·la conté una nota aprovada.
     */
    ésNotaAprovada(valor) {
        return this.notaValueHelper.ésNotaNumericaAprovada(valor);
    }
}
