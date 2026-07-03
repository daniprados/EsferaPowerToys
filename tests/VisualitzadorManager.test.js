import { jest, describe, test, expect } from '@jest/globals';
import { VisualitzadorManager } from '../src/visualitzador/VisualitzadorManager.js';

describe('VisualitzadorManager', () => {
    test('hauria d’obrir el visualitzador agregat quan l’avaluació és agregat', async () => {
        const notesAlumnes = [{ idAlumne: '1', nom: 'Alumna', continguts: {} }];
        const dataProvider = {
            obtéDadesExportació: jest.fn().mockResolvedValue({ notesAlumnes }),
            obtéMaxAvaluacions: jest.fn().mockResolvedValue(3),
        };
        const modelBuilder = {
            construeixModel: jest.fn(() => ({ students: [{ id: '1' }] })),
        };
        const modal = {
            open: jest.fn(),
        };
        const manager = new VisualitzadorManager({ log: jest.fn(), error: jest.fn() }, dataProvider, modelBuilder, modal);

        await manager.obreVisualitzador('agregat');

        expect(dataProvider.obtéMaxAvaluacions).toHaveBeenCalledTimes(1);
        expect(modelBuilder.construeixModel).toHaveBeenCalledWith(notesAlumnes, 'agregat', 3);
        expect(modelBuilder.construeixModel).not.toHaveBeenCalledWith(notesAlumnes, 1, expect.anything());
        expect(modelBuilder.construeixModel).not.toHaveBeenCalledWith(notesAlumnes, NaN, expect.anything());
        expect(modal.open).toHaveBeenCalledWith([{ id: '1' }], 'Visualitzant: Totes les avaluacions (agregat)');
    });

    test('hauria d’obrir el visualitzador amb el context d’una avaluació numèrica', async () => {
        const notesAlumnes = [{ idAlumne: '1', nom: 'Alumna', continguts: {} }];
        const dataProvider = {
            obtéDadesExportació: jest.fn().mockResolvedValue({ notesAlumnes }),
            obtéMaxAvaluacions: jest.fn(),
        };
        const modelBuilder = {
            construeixModel: jest.fn(() => ({ students: [{ id: '1' }] })),
        };
        const modal = {
            open: jest.fn(),
        };
        const manager = new VisualitzadorManager({ log: jest.fn(), error: jest.fn() }, dataProvider, modelBuilder, modal);

        await manager.obreVisualitzador(2);

        expect(dataProvider.obtéMaxAvaluacions).not.toHaveBeenCalled();
        expect(modelBuilder.construeixModel).toHaveBeenCalledWith(notesAlumnes, 2, 0);
        expect(modal.open).toHaveBeenCalledWith([{ id: '1' }], 'Visualitzant: Avaluació 2');
    });
});
