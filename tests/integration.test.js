/**
 * Integration Tests - Testing systems working together
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { PhysicsSystem } from '../src/systems/PhysicsSystem.js';
import { AISystem } from '../src/systems/AISystem.js';
import { WaveSystem } from '../src/systems/WaveSystem.js';
import { CombatSystem } from '../src/systems/CombatSystem.js';

describe('Integration: Wave + AI Systems', () => {
    let aiSystem;
    let waveSystem;
    let mockScene;
    let physicsSystem;
    let mockCastle;

    beforeEach(() => {
        mockScene = {
            add: vi.fn(),
            remove: vi.fn()
        };

        physicsSystem = new PhysicsSystem();

        mockCastle = {
            getRandomSpawnPoint: vi.fn(() => new THREE.Vector3(10, 0, 10))
        };

        aiSystem = new AISystem(mockScene, physicsSystem, mockCastle);
        waveSystem = new WaveSystem(aiSystem, mockCastle);
    });

    it('should spawn enemies when wave starts and updates', () => {
        waveSystem.startWave(1);
        waveSystem.update(2);
        waveSystem.update(2);
        waveSystem.update(2);

        expect(aiSystem.getEnemyCount()).toBeGreaterThan(0);
    });

    it('should complete wave when all enemies defeated', () => {
        waveSystem.startWave(1);
        waveSystem.update(2);
        waveSystem.update(2);

        // Clear spawn queue
        waveSystem.enemiesToSpawn = [];

        // Kill all enemies
        aiSystem.clearAllEnemies();

        expect(waveSystem.isWaveComplete()).toBe(true);
    });

    it('should scale difficulty with wave number', () => {
        waveSystem.startWave(1);
        const wave1Enemies = waveSystem.enemiesToSpawn.length;

        waveSystem.startWave(5);
        const wave5Enemies = waveSystem.enemiesToSpawn.length;

        expect(wave5Enemies).toBeGreaterThan(wave1Enemies);
    });
});

describe('Integration: AI + Physics', () => {
    let aiSystem;
    let physicsSystem;
    let mockScene;

    beforeEach(() => {
        mockScene = {
            add: vi.fn(),
            remove: vi.fn()
        };

        physicsSystem = new PhysicsSystem();
        aiSystem = new AISystem(mockScene, physicsSystem, {});
    });

    it('should register enemy bodies with physics system', () => {
        const initialBodies = physicsSystem.dynamicBodies.length;

        aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

        expect(physicsSystem.dynamicBodies.length).toBe(initialBodies + 1);
    });

    it('should remove enemy bodies from physics when destroyed', () => {
        const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));
        const bodiesAfterSpawn = physicsSystem.dynamicBodies.length;

        aiSystem.removeEnemy(enemy);

        expect(physicsSystem.dynamicBodies.length).toBe(bodiesAfterSpawn - 1);
    });
});

describe('Integration: Combat + AI', () => {
    let aiSystem;
    let combatSystem;
    let mockPlayer;
    let mockScene;
    let physicsSystem;

    beforeEach(() => {
        mockScene = {
            add: vi.fn(),
            remove: vi.fn()
        };

        physicsSystem = new PhysicsSystem();
        aiSystem = new AISystem(mockScene, physicsSystem, {});

        mockPlayer = {
            position: new THREE.Vector3(0, 1.7, 0),
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

        combatSystem = new CombatSystem(mockPlayer, aiSystem);
    });

    it('should damage enemy when player attacks', () => {
        const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 1, -2));
        const initialHealth = enemy.health;

        mockPlayer.isAttacking = true;
        mockPlayer.attackCooldown = mockPlayer.attackDuration - 0.05;

        combatSystem.update(0.016);

        expect(enemy.health).toBeLessThan(initialHealth);
    });

    it('should kill enemy and award points when health depleted', () => {
        const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 1, -2));
        enemy.health = 1; // Nearly dead

        mockPlayer.isAttacking = true;
        mockPlayer.attackCooldown = mockPlayer.attackDuration - 0.05;

        const results = combatSystem.update(0.016);

        expect(results.enemyDeaths.length).toBe(1);
        expect(results.enemyDeaths[0].points).toBe(100);
    });

    it('should damage player when enemy attacks in range', () => {
        const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 1, -1));
        enemy.isAttacking = true;
        enemy.attackCooldown = 0.95;

        combatSystem.update(0.016);

        expect(mockPlayer.takeDamage).toHaveBeenCalled();
    });

    it('should hit multiple enemies with spin ability', () => {
        // Spawn enemies in a circle
        aiSystem.spawnEnemy('grunt', new THREE.Vector3(1, 1, 0));
        aiSystem.spawnEnemy('grunt', new THREE.Vector3(-1, 1, 0));
        aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 1, 1));

        mockPlayer.abilities.spin.cooldown = mockPlayer.abilities.spin.maxCooldown - 0.05;

        const results = combatSystem.update(0.016);

        expect(results.hits.length).toBeGreaterThanOrEqual(3);
    });
});

describe('Integration: Enemy Behavior', () => {
    let aiSystem;
    let mockScene;
    let physicsSystem;
    let mockPlayer;

    beforeEach(() => {
        mockScene = {
            add: vi.fn(),
            remove: vi.fn()
        };

        physicsSystem = new PhysicsSystem();
        aiSystem = new AISystem(mockScene, physicsSystem, {});

        mockPlayer = {
            position: new THREE.Vector3(0, 1.7, 0),
            isAttacking: false,
            getForwardDirection: vi.fn(() => new THREE.Vector3(0, 0, -1))
        };
    });

    it('should have enemies chase player when in detection range', () => {
        const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(5, 0, 0));
        const initialDistance = enemy.position.distanceTo(mockPlayer.position);

        // Update AI for several frames
        for (let i = 0; i < 10; i++) {
            aiSystem.update(0.1, mockPlayer);
        }

        const newDistance = enemy.position.distanceTo(mockPlayer.position);

        // Enemy should have moved closer
        expect(newDistance).toBeLessThan(initialDistance);
    });

    it('should track enemy state changes', () => {
        const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(5, 0, 0));

        // Initial state
        expect(enemy.state).toBe('idle');

        // After detecting player
        aiSystem.update(0.1, mockPlayer);

        // State should exist
        expect(enemy.state).toBeDefined();
    });
});

describe('Integration: Game Flow', () => {
    let aiSystem;
    let waveSystem;
    let combatSystem;
    let physicsSystem;
    let mockPlayer;
    let mockScene;
    let mockCastle;

    beforeEach(() => {
        mockScene = {
            add: vi.fn(),
            remove: vi.fn()
        };

        physicsSystem = new PhysicsSystem();

        mockCastle = {
            getRandomSpawnPoint: vi.fn(() => new THREE.Vector3(2, 0, -2))
        };

        aiSystem = new AISystem(mockScene, physicsSystem, mockCastle);
        waveSystem = new WaveSystem(aiSystem, mockCastle);

        mockPlayer = {
            position: new THREE.Vector3(0, 1.7, 0),
            isAttacking: false,
            attackCooldown: 0,
            attackDuration: 0.3,
            attackDamage: 100,
            comboCount: 1,
            abilities: {
                slash: { cooldown: 0, maxCooldown: 1, damage: 35 },
                spin: { cooldown: 0, maxCooldown: 5, damage: 500 },
                dash: { cooldown: 0, maxCooldown: 3 },
                fireBlast: { cooldown: 0, maxCooldown: 8, damage: 80 }
            },
            getForwardDirection: vi.fn(() => new THREE.Vector3(0, 0, -1)),
            takeDamage: vi.fn((amount) => amount),
            isBlocking: false,
            health: 100
        };

        combatSystem = new CombatSystem(mockPlayer, aiSystem);
    });

    it('should accumulate score from kills', () => {
        // Spawn an enemy
        aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 1, -2));

        // Kill it
        mockPlayer.abilities.spin.cooldown = mockPlayer.abilities.spin.maxCooldown - 0.05;
        const results = combatSystem.update(0.016);

        let totalScore = 0;
        for (const death of results.enemyDeaths) {
            totalScore += death.points;
        }

        expect(totalScore).toBeGreaterThan(0);
    });

    it('should have working game loop components', () => {
        // Start wave
        waveSystem.startWave(1);
        expect(waveSystem.waveActive).toBe(true);

        // Spawn enemy
        waveSystem.update(2);
        expect(aiSystem.getEnemyCount()).toBeGreaterThan(0);

        // Update physics
        physicsSystem.update(0.016);

        // Combat update
        const results = combatSystem.update(0.016);
        expect(results).toBeDefined();
    });
});
