/**
 * Construeix el panell d'exportació de matrícules del llistat de grups.
 */
export class GroupEnrollmentUIBuilder {
    /**
     * @param {import('../PowerToysLogger.js').PowerToysLogger} logger
     * @param {import('../ContainerUIBuilder.js').ContainerUIBuilder} containerBuilder
     * @param {(table: HTMLTableElement, onProgress: Function) => Promise<number>} onDownload
     */
    constructor(logger, containerBuilder, onDownload) {
        this.logger = logger;
        this.containerBuilder = containerBuilder;
        this.onDownload = onDownload;
    }

    /**
     * @param {HTMLTableElement} table
     * @param {string} id
     * @returns {HTMLElement}
     */
    createPanel(table, id) {
        const content = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = 'PowerToys - Matrícules dels grups CF';
        const instructions = document.createElement('p');
        instructions.textContent = 'Marca els grups amb les caselles del llistat i descarrega un Excel amb un full per grup.';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-primary btn-sm';
        button.textContent = 'Descarrega els grups seleccionats';
        const status = document.createElement('span');
        status.className = 'powertoys-group-export-status';
        status.setAttribute('role', 'status');
        content.append(title, instructions, button, status);

        button.addEventListener('click', async () => {
            button.disabled = true;
            status.classList.remove('powertoys-group-export-status--error');
            status.textContent = 'Preparant la descàrrega…';
            try {
                const total = await this.onDownload(table, (completed, count) => {
                    status.textContent = `Carregant grups: ${completed}/${count}`;
                });
                status.textContent = `${total} ${total === 1 ? 'grup descarregat' : 'grups descarregats'}.`;
            } catch (error) {
                status.textContent = error?.message || 'No s’ha pogut generar l’Excel.';
                status.classList.add('powertoys-group-export-status--error');
                this.logger.error('GroupEnrollmentUIBuilder → error exportant grups', error);
            } finally {
                button.disabled = false;
            }
        });

        return this.containerBuilder.createContainer(content, id, null, 'powertoys_group_export_collapsed');
    }
}
