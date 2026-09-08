/**
 * Construeix un llibre de matrícules amb un full per grup classe.
 */
export class GroupEnrollmentWorkbookBuilder {
    constructor(logger, excelJS = (typeof window !== 'undefined' ? window.ExcelJS : null)) {
        this.logger = logger;
        this.excelJS = excelJS;
    }

    /**
     * @param {Array<Object>} grups
     * @returns {any}
     */
    construeixWorkbook(grups) {
        const workbook = new this.excelJS.Workbook();
        const nomsUtilitzats = new Set();
        grups.forEach((grup) => this.afegeixFullGrup(workbook, grup, nomsUtilitzats));
        this.logger.log(`GroupEnrollmentWorkbookBuilder → ${grups.length} fulls creats`);
        return workbook;
    }

    /**
     * @param {any} workbook
     * @param {Object} grup
     * @param {Set<string>} nomsUtilitzats
     */
    afegeixFullGrup(workbook, grup, nomsUtilitzats) {
        const alumnes = Array.isArray(grup?.alumnes) ? grup.alumnes : [];
        const moduls = this.obtéModuls(alumnes);
        const worksheet = workbook.addWorksheet(this.creaNomFull(grup?.codi || grup?.nom, nomsUtilitzats));
        const headers = ['Alumne', ...moduls.map((modul) => this.obtéEtiquetaModul(modul))];

        worksheet.addRow(headers);
        alumnes.forEach((alumne) => {
            const codisAlumne = new Set(this.obtéContingutsPrincipals(alumne).map((modul) => modul.codiContingutDocent));
            worksheet.addRow([
                this.obtéNomAlumne(alumne),
                ...moduls.map((modul) => codisAlumne.has(modul.codiContingutDocent) ? 'X' : ''),
            ]);
        });

        worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
        worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, headers.length) } };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        worksheet.getColumn(1).width = 38;
        for (let column = 2; column <= headers.length; column += 1) {
            worksheet.getColumn(column).width = 24;
            for (let row = 2; row <= worksheet.rowCount; row += 1) {
                worksheet.getRow(row).getCell(column).alignment = { horizontal: 'center' };
            }
        }
        return worksheet;
    }

    /**
     * Uneix els mòduls principals presents al grup i conserva l'ordre de l'API.
     * @param {Array<Object>} alumnes
     * @returns {Array<Object>}
     */
    obtéModuls(alumnes) {
        const moduls = new Map();
        alumnes.forEach((alumne) => this.obtéContingutsPrincipals(alumne).forEach((modul) => {
            const codi = String(modul?.codiContingutDocent ?? '').trim();
            if (codi && !moduls.has(codi)) moduls.set(codi, modul);
        }));
        return [...moduls.values()];
    }

    obtéContingutsPrincipals(alumne) {
        return (Array.isArray(alumne?.contingutsDocentsGrupDTO) ? alumne.contingutsDocentsGrupDTO : [])
            .filter((contingut) => contingut?.idPare === null && contingut?.codiContingutDocent);
    }

    obtéEtiquetaModul(modul) {
        const codi = String(modul?.codiContingutDocent ?? '').trim();
        const descripcio = String(modul?.descripcio ?? '').trim();
        return descripcio ? `${codi} - ${descripcio}` : codi;
    }

    obtéNomAlumne(alumne) {
        return String(alumne?.nomCerca ?? [alumne?.nom, alumne?.cognom1, alumne?.cognom2].filter(Boolean).join(' ')).trim();
    }

    /**
     * Excel limita els noms de full a 31 caràcters i en prohibeix alguns símbols.
     */
    creaNomFull(nom, nomsUtilitzats) {
        const base = String(nom || 'Grup').replace(/[\\/*?:[\]]/g, '-').trim().slice(0, 31) || 'Grup';
        let candidat = base;
        let sufix = 2;
        while (nomsUtilitzats.has(candidat.toLocaleLowerCase('ca'))) {
            const textSufix = ` (${sufix})`;
            candidat = `${base.slice(0, 31 - textSufix.length)}${textSufix}`;
            sufix += 1;
        }
        nomsUtilitzats.add(candidat.toLocaleLowerCase('ca'));
        return candidat;
    }
}
