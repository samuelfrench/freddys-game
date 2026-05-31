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
            getObjectiveStatus: () => ({
                label: 'Reach the reef gate',
                distance: 42,
                color: '#ffd38a'
            }),
            waveSystem: {
                getEnemiesRemaining: () => 3
            },
            allies: [{}, {}],
            bossEnemy: {
                name: 'Storm Shogun',
                health: 250,
                maxHealth: 500,
                telegraphActive: true,
                telegraphName: 'Storm Cleave'
            }
        };
        ui = new UIManager(game);
    });

    it('shows level name, enemy count, teammate count, and boss health', () => {
        ui.updateWaveInfo();

        expect(document.getElementById('wave-info').textContent).toBe('Level 2: Sunset Beach');
        expect(document.getElementById('enemy-count').textContent).toBe('Enemies: 3 | Team: 2 | Boss: 50%');
    });

    it('shows a clear objective waypoint with distance', () => {
        ui.update();

        expect(document.getElementById('objective-line').textContent).toBe('Objective: Reach the reef gate - 42m');
    });

    it('shows a dedicated boss health bar and telegraph warning', () => {
        ui.update();

        expect(document.getElementById('boss-panel').classList.contains('visible')).toBe(true);
        expect(document.getElementById('boss-name').textContent).toBe('Storm Shogun');
        expect(document.getElementById('boss-health-bar').style.width).toBe('50%');
        expect(document.getElementById('boss-health-value').textContent).toBe('250/500');
        expect(document.getElementById('boss-telegraph-status').textContent).toBe('Incoming: Storm Cleave');
    });
});
