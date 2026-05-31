/**
 * Ally Ninja Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { AllyNinja } from '../src/entities/AllyNinja.js';

describe('AllyNinja', () => {
    let scene;
    let player;
    let enemy;
    let aiSystem;
    let onEnemyDefeated;

    beforeEach(() => {
        scene = {
            add: vi.fn(),
            remove: vi.fn()
        };
        player = {
            position: new THREE.Vector3(0, 1.7, 0),
            getForwardDirection: vi.fn(() => new THREE.Vector3(0, 0, -1))
        };
        enemy = {
            type: 'grunt',
            position: new THREE.Vector3(1, 0, -2),
            takeDamage: vi.fn(() => false)
        };
        aiSystem = {
            getEnemies: vi.fn(() => [enemy])
        };
        onEnemyDefeated = vi.fn();
    });

    it('spawns as a visible teammate beside the player', () => {
        const ally = new AllyNinja(scene, player, aiSystem, {
            name: 'Mika',
            sideOffset: -3,
            onEnemyDefeated
        });

        expect(scene.add).toHaveBeenCalledWith(ally.mesh);
        expect(ally.name).toBe('Mika');
        expect(ally.position.distanceTo(player.position)).toBeGreaterThan(0);
    });

    it('attacks nearby enemies and reports defeated targets', () => {
        enemy.takeDamage.mockReturnValue(true);
        const ally = new AllyNinja(scene, player, aiSystem, {
            name: 'Ryo',
            sideOffset: 3,
            onEnemyDefeated
        });

        ally.update(0.2);

        expect(enemy.takeDamage).toHaveBeenCalledWith(ally.attackDamage);
        expect(onEnemyDefeated).toHaveBeenCalledWith(enemy, ally);
    });
});
