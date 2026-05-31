/**
 * Game campaign flow tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { Game } from '../src/core/Game.js';
import { LevelSystem } from '../src/systems/LevelSystem.js';

describe('Game campaign level flow', () => {
    let game;
    let bossEnemy;

    beforeEach(() => {
        vi.useFakeTimers();

        bossEnemy = {
            type: 'boss',
            position: new THREE.Vector3(0, 0, -424),
            points: 2500,
            destroy: vi.fn()
        };

        game = new Game();
        game.scene = {
            add: vi.fn(),
            remove: vi.fn()
        };
        game.player = {
            position: new THREE.Vector3(0, 1.7, 20),
            velocity: new THREE.Vector3(),
            rotation: new THREE.Euler(),
            health: 100,
            maxHealth: 100,
            stamina: 100,
            maxStamina: 100,
            getForwardDirection: vi.fn(() => new THREE.Vector3(0, 0, -1)),
            reset: vi.fn()
        };
        game.levelSystem = new LevelSystem();
        game.aiSystem = {
            spawnEnemy: vi.fn(() => bossEnemy),
            getEnemies: vi.fn(() => []),
            removeEnemy: vi.fn(),
            clearAllEnemies: vi.fn()
        };
        game.uiManager = {
            showNotification: vi.fn(),
            showDamageEffect: vi.fn()
        };
        game.audioSystem = {
            playSound: vi.fn()
        };
        game.particleSystem = {
            createDeathEffect: vi.fn(),
            createHitEffect: vi.fn()
        };
        game.createTombstone = vi.fn();
        game.companionCat = {
            teleportToPlayer: vi.fn()
        };
        game.inputManager = {
            lock: vi.fn(),
            unlock: vi.fn()
        };
        game.objectiveMarker = {
            setObjective: vi.fn(),
            update: vi.fn(),
            hide: vi.fn()
        };
    });

    it('moves from forest to the beach level instead of ending the game at the shrine', () => {
        game.player.position.set(0, 1.7, -160);

        game.checkGoal();

        expect(game.hasWon).toBe(false);
        expect(game.levelSystem.getCurrentLevel().id).toBe('sunset-beach');
        expect(game.uiManager.showNotification).toHaveBeenCalledWith('Level 2: Sunset Beach');
    });

    it('starts the final boss encounter with two teammate allies after the beach goal', () => {
        game.player.position.set(0, 1.7, -160);
        game.checkGoal();
        game.player.position.set(0, 1.7, -318);

        game.checkGoal();

        expect(game.levelSystem.getCurrentLevel().id).toBe('storm-reef');
        expect(game.allies).toHaveLength(2);
        expect(game.aiSystem.spawnEnemy).toHaveBeenCalledWith(
            'boss',
            expect.objectContaining({ z: -424 })
        );
        expect(game.bossBattleActive).toBe(true);
    });

    it('restores player health and stamina at level checkpoints', () => {
        game.player.health = 25;
        game.player.stamina = 8;
        game.player.position.set(0, 1.7, -160);

        game.checkGoal();

        expect(game.player.health).toBe(100);
        expect(game.player.stamina).toBe(100);
    });

    it('does not spawn path minions during the dedicated boss battle', () => {
        game.levelSystem.currentLevelIndex = 2;
        game.bossBattleActive = true;
        game.pathSpawnCooldown = 0;
        game.player.position.set(0, 1.7, -380);
        game.aiSystem.getEnemies.mockReturnValue([bossEnemy]);

        game.spawnPathEnemies();

        expect(game.aiSystem.spawnEnemy).not.toHaveBeenCalled();
    });

    it('does not spawn path minions after boss victory', () => {
        game.levelSystem.currentLevelIndex = 2;
        game.hasWon = true;
        game.bossBattleActive = false;
        game.pathSpawnCooldown = 0;
        game.player.position.set(0, 1.7, -380);
        game.aiSystem.getEnemies.mockReturnValue([]);

        game.spawnPathEnemies();

        expect(game.aiSystem.spawnEnemy).not.toHaveBeenCalled();
    });

    it('updates the objective marker when advancing to the beach gate', () => {
        game.player.position.set(0, 1.7, -160);

        game.checkGoal();

        expect(game.objectiveMarker.setObjective).toHaveBeenCalledWith(expect.objectContaining({
            levelId: 'sunset-beach',
            label: 'Reach the reef gate',
            color: '#ffd38a'
        }));
    });

    it('restarts from the current level checkpoint instead of the campaign start', () => {
        game.score = 700;
        game.player.position.set(0, 1.7, -160);
        game.checkGoal();
        game.score = 1200;
        game.player.position.set(14, 1.7, -260);

        game.restart();

        expect(game.levelSystem.getCurrentLevel().id).toBe('sunset-beach');
        expect(game.score).toBe(700);
        expect(game.player.position.z).toBeLessThan(-160);
        expect(game.player.position.z).toBeGreaterThan(-220);
        expect(game.aiSystem.clearAllEnemies).toHaveBeenCalled();
        expect(game.uiManager.showNotification).toHaveBeenCalledWith('Restarted Level 2: Sunset Beach');
    });

    it('marks campaign victory only when the final boss is defeated', () => {
        game.levelSystem.currentLevelIndex = 2;
        game.bossEnemy = bossEnemy;
        game.bossBattleActive = true;

        game.handleCombatResults({
            enemyDeaths: [
                {
                    enemy: bossEnemy,
                    position: bossEnemy.position.clone(),
                    points: bossEnemy.points
                }
            ],
            playerDamage: 0,
            hits: []
        });

        expect(game.levelSystem.isCampaignComplete()).toBe(true);
        expect(game.hasWon).toBe(true);
        expect(game.uiManager.showNotification).toHaveBeenCalledWith('VICTORY! Storm Shogun defeated!');
    });
});
