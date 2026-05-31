/**
 * UI level display tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UIManager } from '../src/systems/UIManager.js';

describe('UIManager level HUD', () => {
    let ui;
    let game;

    beforeEach(() => {
        game = {
            score: 0,
            wave: 2,
            player: {
                health: 100,
                maxHealth: 100,
                stamina: 100,
                maxStamina: 100,
                abilities: {
                    slash: { staminaCost: 10 },
                    spin: { staminaCost: 25 },
                    dash: { staminaCost: 15 },
                    fireBlast: { staminaCost: 35 }
                },
                getAbilityCooldowns: () => ({
                    slash: { ready: true, current: 0 },
                    spin: { ready: true, current: 0 },
                    dash: { ready: true, current: 0 },
                    fireBlast: { ready: true, current: 0 }
                })
            },
            levelSystem: {
                getLevelNumber: () => 2,
                getCurrentLevel: () => ({ title: 'Sunset Beach' })
            },
            waveSystem: {
                getEnemiesRemaining: () => 3
            },
            allies: [{}, {}],
            bossEnemy: {
                health: 250,
                maxHealth: 500
            }
        };
        ui = new UIManager(game);
    });

    it('shows level name, enemy count, teammate count, and boss health', () => {
        ui.updateWaveInfo();

        expect(document.getElementById('wave-info').textContent).toBe('Level 2: Sunset Beach');
        expect(document.getElementById('enemy-count').textContent).toBe('Enemies: 3 | Team: 2 | Boss: 50%');
    });
});
