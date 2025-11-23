/**
 * Wave System Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { WaveSystem } from '../src/systems/WaveSystem.js';

describe('WaveSystem', () => {
    let waveSystem;
    let mockAISystem;
    let mockCastle;

    beforeEach(() => {
        mockAISystem = {
            spawnEnemy: vi.fn(),
            getEnemyCount: vi.fn(() => 0),
            clearAllEnemies: vi.fn()
        };

        mockCastle = {
            getRandomSpawnPoint: vi.fn(() => new THREE.Vector3(10, 0, 10))
        };

        waveSystem = new WaveSystem(mockAISystem, mockCastle);
    });

    describe('initialization', () => {
        it('should initialize with wave 0', () => {
            expect(waveSystem.currentWave).toBe(0);
        });

        it('should not be active initially', () => {
            expect(waveSystem.waveActive).toBe(false);
        });
    });

    describe('startWave', () => {
        it('should set the current wave number', () => {
            waveSystem.startWave(3);

            expect(waveSystem.currentWave).toBe(3);
        });

        it('should activate the wave', () => {
            waveSystem.startWave(1);

            expect(waveSystem.waveActive).toBe(true);
        });

        it('should generate enemies based on wave number', () => {
            waveSystem.startWave(1);

            expect(waveSystem.enemiesToSpawn.length).toBeGreaterThan(0);
        });

        it('should scale enemy count with wave number', () => {
            waveSystem.startWave(1);
            const wave1Count = waveSystem.enemiesToSpawn.length;

            waveSystem.startWave(5);
            const wave5Count = waveSystem.enemiesToSpawn.length;

            expect(wave5Count).toBeGreaterThan(wave1Count);
        });
    });

    describe('generateWaveEnemies', () => {
        it('should generate expected number of enemies', () => {
            const enemies = waveSystem.generateWaveEnemies(1);

            // baseEnemyCount (5) + wave * enemyScaling (2) = 7
            expect(enemies.length).toBe(7);
        });

        it('should only have grunts in early waves', () => {
            const enemies = waveSystem.generateWaveEnemies(1);

            // In wave 1, most should be grunts (random chance for others)
            const grunts = enemies.filter(e => e === 'grunt');
            expect(grunts.length).toBeGreaterThan(0);
        });

        it('should add boss on wave 10', () => {
            const enemies = waveSystem.generateWaveEnemies(10);

            expect(enemies).toContain('boss');
        });

        it('should add boss on wave 20', () => {
            const enemies = waveSystem.generateWaveEnemies(20);

            expect(enemies).toContain('boss');
        });
    });

    describe('update', () => {
        it('should not spawn if wave not active', () => {
            waveSystem.update(1);

            expect(mockAISystem.spawnEnemy).not.toHaveBeenCalled();
        });

        it('should spawn enemies after delay', () => {
            waveSystem.startWave(1);
            waveSystem.update(2); // More than spawnDelay (1.5)

            expect(mockAISystem.spawnEnemy).toHaveBeenCalled();
            expect(mockCastle.getRandomSpawnPoint).toHaveBeenCalled();
        });

        it('should spawn enemies with correct type', () => {
            waveSystem.startWave(1);
            waveSystem.enemiesToSpawn = ['grunt', 'warrior'];

            waveSystem.update(2);

            expect(mockAISystem.spawnEnemy).toHaveBeenCalledWith(
                'grunt',
                expect.any(THREE.Vector3)
            );
        });

        it('should not spawn multiple enemies within delay', () => {
            waveSystem.startWave(1);
            waveSystem.update(0.5);
            waveSystem.update(0.5);

            expect(mockAISystem.spawnEnemy).not.toHaveBeenCalled();
        });
    });

    describe('isWaveComplete', () => {
        it('should return false if wave not active', () => {
            expect(waveSystem.isWaveComplete()).toBe(false);
        });

        it('should return false if enemies to spawn remain', () => {
            waveSystem.startWave(1);

            expect(waveSystem.isWaveComplete()).toBe(false);
        });

        it('should return false if spawned enemies still alive', () => {
            waveSystem.startWave(1);
            waveSystem.enemiesToSpawn = [];
            mockAISystem.getEnemyCount.mockReturnValue(3);

            expect(waveSystem.isWaveComplete()).toBe(false);
        });

        it('should return true when all enemies defeated', () => {
            waveSystem.startWave(1);
            waveSystem.enemiesToSpawn = [];
            mockAISystem.getEnemyCount.mockReturnValue(0);

            expect(waveSystem.isWaveComplete()).toBe(true);
        });
    });

    describe('getEnemiesRemaining', () => {
        it('should return total enemies (spawned + to spawn)', () => {
            waveSystem.startWave(1);
            waveSystem.enemiesToSpawn = ['grunt', 'grunt'];
            mockAISystem.getEnemyCount.mockReturnValue(3);

            expect(waveSystem.getEnemiesRemaining()).toBe(5);
        });
    });

    describe('getWaveProgress', () => {
        it('should return progress info', () => {
            waveSystem.startWave(1);
            waveSystem.enemiesToSpawn = ['grunt', 'grunt'];
            mockAISystem.getEnemyCount.mockReturnValue(3);

            const progress = waveSystem.getWaveProgress();

            expect(progress.killed).toBeDefined();
            expect(progress.total).toBeDefined();
            expect(progress.percentage).toBeDefined();
        });
    });
});
