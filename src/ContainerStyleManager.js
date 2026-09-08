/**
 * Gestiona els estils compartits dels contenidors i efectes comuns de PowerToys.
 */
export class ContainerStyleManager {
    /**
     * @param {import('./PowerToysLogger.js').PowerToysLogger} logger
     */
    constructor(logger) {
        this.logger = logger;
        this.injectStyles();
    }

    /**
     * Injecta els estils compartits una sola vegada.
     * @returns {void}
     */
    injectStyles() {
        if (document.getElementById('powertoy-container-styles')) return;

        const style = document.createElement('style');
        style.id = 'powertoy-container-styles';
        style.textContent = `
            .powertoy-container {
                margin-bottom: 20px;
                padding: 30px 10px 10px 10px;
                border: 1px solid #ccc;
                background-color: #f9f9f9;
                position: relative;
                overflow: auto;
                max-height: 20em;
            }

            .powertoy-toggle-button {
                position: absolute;
                top: 5px;
                right: 5px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
            }

            .powertoy-content-wrapper--collapsed {
                display: none;
            }

            .powertoy-instructions {
                font-size: 0.85em;
                margin-top: 8px;
                color: #555;
            }

            .powertoy-version {
                text-align: right;
                font-size: 0.8em;
                margin-top: 8px;
                color: #666;
            }

            .powertoy-version-link {
                text-decoration: none;
            }

            .powertoy-scroll-highlight {
                transition: background-color 0.5s ease;
            }

            .powertoy-scroll-highlight.powertoy-scroll-highlight--active {
                background-color: #ffffcc !important;
            }

            .powertoys-population-container {
                max-height: none;
                overflow: visible;
                padding: 30px 16px 12px;
            }

            .powertoys-population-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 14px;
            }

            .powertoys-population-totals {
                display: grid;
                grid-template-columns: repeat(4, minmax(130px, 1fr));
                gap: 10px;
                margin-bottom: 16px;
            }

            .powertoys-population-metric {
                border-left: 4px solid #337ab7;
                background: #fff;
                padding: 9px 12px;
            }

            .powertoys-population-metric-label {
                display: block;
                color: #555;
                font-size: 0.85em;
            }

            .powertoys-population-metric-value {
                display: block;
                font-size: 1.65em;
                font-weight: bold;
                line-height: 1.1;
            }

            .powertoys-population-table-wrapper {
                overflow-x: auto;
            }

            .powertoys-population-table {
                background: #fff;
                margin-bottom: 8px;
            }

            .powertoys-population-table th:not(:first-child),
            .powertoys-population-table td:not(:first-child) {
                text-align: center;
                white-space: nowrap;
            }

            .powertoys-population-table td:first-child {
                font-weight: 600;
            }

            .powertoys-population-status {
                color: #666;
                font-size: 0.9em;
                margin-bottom: 0;
            }

            .powertoys-group-export-status {
                display: inline-block;
                margin-left: 10px;
                color: #555;
            }

            .powertoys-group-export-status--error {
                color: #a94442;
                font-weight: 600;
            }

            @media (max-width: 600px) {
                .powertoys-population-totals {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(style);
        this.logger.log('ContainerStyleManager → estils injectats');
    }
}
