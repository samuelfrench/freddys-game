/**
 * Combat System Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { CombatSystem } from '../src/systems/CombatSystem.js';

describe('CombatSystem', () => {
    let combatSystem;
    let mockPlayer;
    let mockAISystem;
    let mockEnemy;

    beforeEach(() => {
        mockPlayer = {
            position: new THREE.Vector3(0, 1, 0),
            isAttacking: false,
            attackCooldown: 0,
            attackDuration: 0.3,
            attackDamage: 25,
            comboCount: 1,
            abilities: {
                slash: { cooldown: 0, maxCooldown: 1, damage: 35 },
                spin: { cooldown: 0, maxCooldown: 5, damage: 50 },
                dash: { cooldown: 0, maxCooldown: 3 },
                fireBlast: { cooldown: 0, maxCooldown: 8, damage: 80 }
            },
            getForwardDirection: vi.fn(() => new THREE.Vector3(0, 0, -1)),
            takeDamage: vi.fn((amount) => amount),
            isBlocking: false,
            health: 100
        };

        mockEnemy = {
            position: new THREE.Vector3(0, 1, -2),
            takeDamage: vi.fn(() => false),
            isAttacking: false,
            attackCooldown: 0,
            attackSpeed: 1,
            attackDamage: 10,
            attackRange: 2,
            points: 100,
            health: 50
        };

        mockAISystem = {
            getEnemies: vi.fn(() => [mockEnemy]),
            getEnemiesInCone: vi.fn(() => [mockEnemy]),
            getEnemiesInRange: vi.fn(() => [mockEnemy]),
            removeEnemy: vi.fn()
        };

        combatSystem = new CombatSystem(mockPlayer, mockAISystem);
    });

    describe('initialization', () => {
        it('should have player reference', () => {
            expect(combatSystem.player).toBe(mockPlayer);
        });

        it('should have AI system reference', () => {
            expect(combatSystem.aiSystem).toBe(mockAISystem);
        });
    });

    describe('update', () => {
        it('should return combat results', () => {
            const results = combatSystem.update(0.016);

            expect(results).toHaveProperty('enemyDeaths');
            expect(results).toHaveProperty('playerDamage');
            expect(results).toHaveProperty('hits');
        });

        it('should reset results each update', () => {
            combatSystem.results.playerDamage = 50;

            const results = combatSystem.update(0.016);

            expect(results.playerDamage).toBe(0);
        });
    });

    describe('player attacks', () => {
        it('should check for melee attacks when player is attacking', () => {
            mockPlayer.isAttacking = true;
            mockPlayer.attackCooldown = mockPlayer.attackDuration - 0.05;

            combatSystem.update(0.016);

            expect(mockAISystem.getEnemiesInCone).toHaveBeenCalled();
        });

        it('should damage enemies in attack range', () => {
            mockPlayer.isAttacking = true;
            mockPlayer.attackCooldown = mockPlayer.attackDuration - 0.05;

            combatSystem.update(0.016);

            expect(mockEnemy.takeDamage).toHaveBeenCalled();
        });

        it('should record hits', () => {
            mockPlayer.isAttacking = true;
            mockPlayer.attackCooldown = mockPlayer.attackDuration - 0.05;

            const results = combatSystem.update(0.016);

            expect(results.hits.length).toBeGreaterThan(0);
        });

        it('should record enemy deaths', () => {
            mockPlayer.isAttacking = true;
            mockPlayer.attackCooldown = mockPlayer.attackDuration - 0.05;
            mockEnemy.takeDamage.mockReturnValue(true); // Enemy dies

            const results = combatSystem.update(0.016);

            expect(results.enemyDeaths.length).toBe(1);
            expect(results.enemyDeaths[0].points).toBe(mockEnemy.points);
        });

        it('should remove dead enemies', () => {
            mockPlayer.isAttacking = true;
            mockPlayer.attackCooldown = mockPlayer.attackDuration - 0.05;
            mockEnemy.takeDamage.mockReturnValue(true);

            combatSystem.update(0.016);

            expect(mockAISystem.removeEnemy).toHaveBeenCalledWith(mockEnemy);
        });
    });

    describe('ability attacks', () => {
        it('should process slash ability', () => {
            mockPlayer.abilities.slash.cooldown = mockPlayer.abilities.slash.maxCooldown - 0.05;

            const results = combatSystem.update(0.016);

            expect(mockAISystem.getEnemiesInCone).toHaveBeenCalled();
        });

        it('should process spin ability', () => {
            mockPlayer.abilities.spin.cooldown = mockPlayer.abilities.spin.maxCooldown - 0.05;

            combatSystem.update(0.016);

            expect(mockAISystem.getEnemiesInRange).toHaveBeenCalled();
        });

        it('should process fireBlast ability', () => {
            mockPlayer.abilities.fireBlast.cooldown = mockPlayer.abilities.fireBlast.maxCooldown - 0.05;

            combatSystem.update(0.016);

            expect(mockAISystem.getEnemiesInCone).toHaveBeenCalled();
        });
    });

    describe('enemy attacks', () => {
        it('should check enemy attacks', () => {
            mockEnemy.isAttacking = true;
            mockEnemy.attackCooldown = 0.95;
            mockEnemy.position.set(0, 1, -1); // Within attack range

            combatSystem.update(0.016);

            expect(mockPlayer.takeDamage).toHaveBeenCalled();
        });

        it('should record player damage', () => {
            mockEnemy.isAttacking = true;
            mockEnemy.attackCooldown = 0.95;
            mockEnemy.position.set(0, 1, -1);

            const results = combatSystem.update(0.016);

            expect(results.playerDamage).toBeGreaterThan(0);
        });

        it('should not damage player if enemy out of range', () => {
            mockEnemy.isAttacking = true;
            mockEnemy.attackCooldown = 0.95;
            mockEnemy.position.set(0, 1, -10); // Out of range

            const results = combatSystem.update(0.016);

            expect(results.playerDamage).toBe(0);
        });

        it('should not damage player if enemy not attacking', () => {
            mockEnemy.isAttacking = false;
            mockEnemy.position.set(0, 1, -1);

            const results = combatSystem.update(0.016);

            expect(results.playerDamage).toBe(0);
        });

        it('should not damage player while a boss attack is telegraphing', () => {
            mockEnemy.type = 'boss';
            mockEnemy.telegraphActive = true;
            mockEnemy.isAttacking = true;
            mockEnemy.attackCooldown = 0.95;
            mockEnemy.position.set(0, 1, -1);

            const results = combatSystem.update(0.016);

            expect(mockPlayer.takeDamage).not.toHaveBeenCalled();
            expect(results.playerDamage).toBe(0);
        });

        it('should damage player once for a single active boss attack', () => {
            mockEnemy.type = 'boss';
            mockEnemy.telegraphActive = false;
            mockEnemy.isAttacking = true;
            mockEnemy.attackCooldown = 0.95;
            mockEnemy.position.set(0, 1, -1);

            const firstResults = combatSystem.update(0.016);
            const secondResults = combatSystem.update(0.016);

            expect(mockPlayer.takeDamage).toHaveBeenCalledTimes(1);
            expect(firstResults.playerDamage).toBe(10);
            expect(secondResults.playerDamage).toBe(0);
        });
    });

    describe('processAbility', () => {
        it('should return hits for slash ability', () => {
            const result = combatSystem.processAbility('slash');

            expect(result.hits).toBeDefined();
        });

        it('should return hits for spin ability', () => {
            const result = combatSystem.processAbility('spin');

            expect(result.hits).toBeDefined();
        });

        it('should return hits for dash ability', () => {
            const result = combatSystem.processAbility('dash');

            expect(result.hits).toBeDefined();
        });

        it('should return hits for fireBlast ability', () => {
            const result = combatSystem.processAbility('fireBlast');

            expect(result.hits).toBeDefined();
        });
    });
});
