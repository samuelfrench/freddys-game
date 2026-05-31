/**
 * AI System Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { AISystem } from '../src/systems/AISystem.js';
import { PhysicsSystem } from '../src/systems/PhysicsSystem.js';

describe('AISystem', () => {
    let aiSystem;
    let mockScene;
    let physicsSystem;
    let mockCastle;
    let mockPlayer;

    beforeEach(() => {
        mockScene = {
            add: vi.fn(),
            remove: vi.fn()
        };

        physicsSystem = new PhysicsSystem();

        mockCastle = {
            getRandomSpawnPoint: vi.fn(() => new THREE.Vector3(10, 0, 10)),
            getPathToTarget: vi.fn(() => []),
            getNearestNavPoint: vi.fn(() => new THREE.Vector3(0, 0, 0))
        };

        mockPlayer = {
            position: new THREE.Vector3(0, 1.7, 0),
            isAttacking: false,
            getForwardDirection: vi.fn(() => new THREE.Vector3(0, 0, -1))
        };

        aiSystem = new AISystem(mockScene, physicsSystem, mockCastle);
    });

    describe('initialization', () => {
        it('should start with no enemies', () => {
            expect(aiSystem.enemies).toHaveLength(0);
        });

        it('should have behavior trees for all enemy types', () => {
            expect(aiSystem.behaviorTrees.grunt).toBeDefined();
            expect(aiSystem.behaviorTrees.warrior).toBeDefined();
            expect(aiSystem.behaviorTrees.assassin).toBeDefined();
            expect(aiSystem.behaviorTrees.boss).toBeDefined();
        });
    });

    describe('spawnEnemy', () => {
        it('should create a grunt enemy', () => {
            const position = new THREE.Vector3(5, 0, 5);

            const enemy = aiSystem.spawnEnemy('grunt', position);

            expect(enemy).toBeDefined();
            expect(enemy.type).toBe('grunt');
            expect(aiSystem.enemies).toHaveLength(1);
        });

        it('should create a warrior enemy', () => {
            const enemy = aiSystem.spawnEnemy('warrior', new THREE.Vector3(0, 0, 0));

            expect(enemy.type).toBe('warrior');
            expect(enemy.health).toBe(100); // Warrior has 100 health
        });

        it('should create an assassin enemy', () => {
            const enemy = aiSystem.spawnEnemy('assassin', new THREE.Vector3(0, 0, 0));

            expect(enemy.type).toBe('assassin');
            expect(enemy.speed).toBe(7); // Assassin is faster
        });

        it('should create a boss enemy', () => {
            const enemy = aiSystem.spawnEnemy('boss', new THREE.Vector3(0, 0, 0));

            expect(enemy.type).toBe('boss');
            expect(enemy.health).toBe(500); // Boss has 500 health
            expect(enemy.points).toBe(1000); // Boss is worth more points
        });

        it('should add enemy mesh to scene', () => {
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            expect(mockScene.add).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should return attacks array', () => {
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(5, 0, 5));

            const attacks = aiSystem.update(0.016, mockPlayer);

            expect(Array.isArray(attacks)).toBe(true);
        });

        it('should update all enemies', () => {
            const enemy1 = aiSystem.spawnEnemy('grunt', new THREE.Vector3(5, 0, 5));
            const enemy2 = aiSystem.spawnEnemy('warrior', new THREE.Vector3(-5, 0, -5));

            const initialPos1 = enemy1.position.clone();
            const initialPos2 = enemy2.position.clone();

            aiSystem.update(0.5, mockPlayer);

            // Enemies should have been updated (behavior trees should run)
            expect(enemy1.stateTimer).toBeGreaterThan(0);
            expect(enemy2.stateTimer).toBeGreaterThan(0);
        });

        it('should telegraph a boss attack before becoming active', () => {
            const boss = aiSystem.spawnEnemy('boss', new THREE.Vector3(0, 1.7, 2));

            const attacks = aiSystem.update(0.016, mockPlayer);

            expect(attacks).toHaveLength(0);
            expect(boss.telegraphActive).toBe(true);
            expect(boss.telegraphTimer).toBeGreaterThan(0);
            expect(boss.telegraphDuration).toBeGreaterThan(0);
            expect(boss.telegraphTargetPosition.equals(mockPlayer.position)).toBe(true);
            expect(boss.isAttacking).toBe(false);

            aiSystem.update(boss.telegraphDuration, mockPlayer);

            expect(boss.telegraphActive).toBe(false);
            expect(boss.isAttacking).toBe(true);
        });

        it('should show and hide a visible boss telegraph marker', () => {
            const boss = aiSystem.spawnEnemy('boss', new THREE.Vector3(0, 1.7, 2));

            aiSystem.update(0.016, mockPlayer);

            expect(boss.telegraphMesh).toBeDefined();
            expect(boss.telegraphMesh.visible).toBe(true);
            expect(boss.telegraphMesh.position.x).toBeCloseTo(mockPlayer.position.x);
            expect(boss.telegraphMesh.position.z).toBeCloseTo(mockPlayer.position.z);

            aiSystem.update(boss.telegraphDuration, mockPlayer);

            expect(boss.telegraphMesh.visible).toBe(false);
        });
    });

    describe('getEnemies', () => {
        it('should return all enemies', () => {
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));
            aiSystem.spawnEnemy('warrior', new THREE.Vector3(5, 0, 5));

            const enemies = aiSystem.getEnemies();

            expect(enemies).toHaveLength(2);
        });
    });

    describe('getEnemyCount', () => {
        it('should return correct count', () => {
            expect(aiSystem.getEnemyCount()).toBe(0);

            aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            expect(aiSystem.getEnemyCount()).toBe(1);

            aiSystem.spawnEnemy('grunt', new THREE.Vector3(5, 0, 5));

            expect(aiSystem.getEnemyCount()).toBe(2);
        });
    });

    describe('removeEnemy', () => {
        it('should remove enemy from array', () => {
            const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            aiSystem.removeEnemy(enemy);

            expect(aiSystem.enemies).toHaveLength(0);
        });

        it('should remove enemy mesh from scene', () => {
            const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            aiSystem.removeEnemy(enemy);

            expect(mockScene.remove).toHaveBeenCalled();
        });
    });

    describe('clearAllEnemies', () => {
        it('should remove all enemies', () => {
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));
            aiSystem.spawnEnemy('warrior', new THREE.Vector3(5, 0, 5));
            aiSystem.spawnEnemy('assassin', new THREE.Vector3(-5, 0, -5));

            aiSystem.clearAllEnemies();

            expect(aiSystem.enemies).toHaveLength(0);
        });
    });

    describe('getEnemiesInRange', () => {
        it('should return enemies within range', () => {
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(2, 0, 0)); // 2 units away
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(10, 0, 0)); // 10 units away

            const inRange = aiSystem.getEnemiesInRange(new THREE.Vector3(0, 0, 0), 5);

            expect(inRange).toHaveLength(1);
        });

        it('should return empty array if no enemies in range', () => {
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(20, 0, 0));

            const inRange = aiSystem.getEnemiesInRange(new THREE.Vector3(0, 0, 0), 5);

            expect(inRange).toHaveLength(0);
        });
    });

    describe('getEnemiesInCone', () => {
        it('should return enemies within cone', () => {
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, -5)); // Directly in front
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 5));  // Behind

            const origin = new THREE.Vector3(0, 0, 0);
            const direction = new THREE.Vector3(0, 0, -1);
            const inCone = aiSystem.getEnemiesInCone(origin, direction, Math.PI / 4, 10);

            expect(inCone).toHaveLength(1);
        });

        it('should respect range limit', () => {
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, -15)); // In direction but far

            const origin = new THREE.Vector3(0, 0, 0);
            const direction = new THREE.Vector3(0, 0, -1);
            const inCone = aiSystem.getEnemiesInCone(origin, direction, Math.PI / 4, 10);

            expect(inCone).toHaveLength(0);
        });

        it('should respect angle limit', () => {
            aiSystem.spawnEnemy('grunt', new THREE.Vector3(5, 0, -2)); // Off to the side

            const origin = new THREE.Vector3(0, 0, 0);
            const direction = new THREE.Vector3(0, 0, -1);
            const inCone = aiSystem.getEnemiesInCone(origin, direction, Math.PI / 8, 10); // Very narrow cone

            expect(inCone).toHaveLength(0);
        });
    });
});

describe('Enemy', () => {
    let mockScene;
    let physicsSystem;

    beforeEach(() => {
        mockScene = {
            add: vi.fn(),
            remove: vi.fn()
        };
        physicsSystem = new PhysicsSystem();
    });

    describe('enemy stats by type', () => {
        it('grunt should have correct stats', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            expect(enemy.maxHealth).toBe(50);
            expect(enemy.speed).toBe(4);
            expect(enemy.attackDamage).toBe(10);
            expect(enemy.points).toBe(100);
        });

        it('warrior should have correct stats', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('warrior', new THREE.Vector3(0, 0, 0));

            expect(enemy.maxHealth).toBe(100);
            expect(enemy.speed).toBe(3);
            expect(enemy.attackDamage).toBe(20);
            expect(enemy.points).toBe(200);
        });

        it('assassin should have correct stats', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('assassin', new THREE.Vector3(0, 0, 0));

            expect(enemy.maxHealth).toBe(40);
            expect(enemy.speed).toBe(7);
            expect(enemy.attackDamage).toBe(30);
            expect(enemy.points).toBe(300);
        });

        it('boss should have correct stats', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('boss', new THREE.Vector3(0, 0, 0));

            expect(enemy.maxHealth).toBe(500);
            expect(enemy.attackDamage).toBe(40);
            expect(enemy.points).toBe(1000);
        });
    });

    describe('enemy takeDamage', () => {
        it('should reduce health', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            enemy.takeDamage(20);

            expect(enemy.health).toBe(30);
        });

        it('should return true when enemy dies', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            const died = enemy.takeDamage(100);

            expect(died).toBe(true);
        });

        it('should return false when enemy survives', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            const died = enemy.takeDamage(10);

            expect(died).toBe(false);
        });

        it('should set hit recently flag', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            enemy.takeDamage(10);

            expect(enemy.hitRecently).toBe(true);
        });
    });

    describe('enemy attack', () => {
        it('should return attack data', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            const attack = enemy.attack();

            expect(attack).not.toBeNull();
            expect(attack.damage).toBe(enemy.attackDamage);
            expect(attack.range).toBe(enemy.attackRange);
        });

        it('should set attack cooldown', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            enemy.attack();

            expect(enemy.attackCooldown).toBeGreaterThan(0);
        });

        it('should not attack during cooldown', () => {
            const aiSystem = new AISystem(mockScene, physicsSystem, {});
            const enemy = aiSystem.spawnEnemy('grunt', new THREE.Vector3(0, 0, 0));

            enemy.attack();
            const secondAttack = enemy.attack();

            expect(secondAttack).toBeNull();
        });
    });
});
