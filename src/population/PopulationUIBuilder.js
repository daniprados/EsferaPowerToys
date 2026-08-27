/**
 * Construeix la interfície dels indicadors de població del centre.
 */
export class PopulationUIBuilder {
    /**
     * @param {import('../PowerToysLogger.js').PowerToysLogger} logger
     * @param {import('../ContainerUIBuilder.js').ContainerUIBuilder} containerBuilder
     */
    constructor(logger, containerBuilder) {
        this.logger = logger;
        this.containerBuilder = containerBuilder;
    }

    /**
     * @param {Object|null} dades
     * @param {Function} onRecalcula
     * @param {Function} onDescarregaCsv
     * @returns {HTMLElement}
     */
    createPanel(dades, onRecalcula, onDescarregaCsv) {
        const content = document.createElement('div');
        const title = document.createElement('h4');
        title.textContent = 'Indicadors de població';
        content.appendChild(title);

        const controls = document.createElement('div');
        controls.className = 'powertoys-population-controls';
        const recalcula = this.createButton('Recalcula', 'btn btn-primary btn-sm', onRecalcula);
        const csv = this.createButton('Baixa CSV', 'btn btn-default btn-sm', onDescarregaCsv);
        csv.disabled = !dades;
        controls.append(recalcula, csv);
        content.appendChild(controls);

        if (!dades) {
            const missatge = document.createElement('p');
            missatge.className = 'powertoys-population-status';
            missatge.textContent = 'Encara no hi ha cap recompte desat.';
            content.appendChild(missatge);
        } else {
            content.appendChild(this.createSummary(dades));
            content.appendChild(this.createStudyTable(dades.estudis));
            const data = new Date(dades.calculatedAt);
            const dies = Math.floor((Date.now() - data.getTime()) / 86400000);
            const actualitzat = document.createElement('p');
            actualitzat.className = 'powertoys-population-status';
            actualitzat.textContent = `Calculat fa ${dies} ${dies === 1 ? 'dia' : 'dies'} (${data.toLocaleDateString('ca-ES')}).`;
            content.appendChild(actualitzat);
        }

        return this.containerBuilder.createContainer(
            content,
            'powertoys-population-box',
            null,
            'powertoys_population_collapsed',
            'powertoys-population-container',
        );
    }

    createSummary(dades) {
        const summary = document.createElement('div');
        summary.className = 'powertoys-population-totals';
        [
            ['Al llarg del curs', dades.totals.totalCurs],
            ['Actualment', dades.totals.altes],
            ['Baixes', dades.totals.baixes],
        ].forEach(([label, value]) => {
            const metric = document.createElement('div');
            metric.className = 'powertoys-population-metric';
            const metricLabel = document.createElement('span');
            metricLabel.className = 'powertoys-population-metric-label';
            metricLabel.textContent = label;
            const metricValue = document.createElement('span');
            metricValue.className = 'powertoys-population-metric-value';
            metricValue.textContent = String(value);
            metric.append(metricLabel, metricValue);
            summary.appendChild(metric);
        });
        return summary;
    }

    createStudyTable(estudis) {
        const wrapper = document.createElement('div');
        wrapper.className = 'powertoys-population-table-wrapper';
        const table = document.createElement('table');
        table.className = 'table table-striped table-condensed powertoys-population-table';
        const capcalera = table.createTHead().insertRow();
        ['Estudi', 'Al llarg del curs', 'Actualment', 'Baixes'].forEach((text) => {
            const th = document.createElement('th'); th.textContent = text; capcalera.appendChild(th);
        });
        const body = table.createTBody();
        estudis.forEach((estudi) => {
            const row = body.insertRow();
            [estudi.estudi, estudi.totalCurs, estudi.altes, estudi.baixes].forEach((valor) => {
                const cell = row.insertCell(); cell.textContent = String(valor);
            });
        });
        wrapper.appendChild(table);
        return wrapper;
    }

    createButton(text, className, action) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = className; button.textContent = text;
        button.addEventListener('click', action);
        return button;
    }
}
