/**
 * Player Entity Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { Player } from '../src/entities/Player.js';
import { PhysicsSystem } from '../src/systems/PhysicsSystem.js';

describe('Player', () => {
    let player;
    let mockScene;
    let mockCamera;
    let mockInputManager;
    let physicsSystem;

    beforeEach(() => {
        mockScene = {
            add: vi.fn()
        };

        mockCamera = new THREE.PerspectiveCamera();
        mockCamera.add = vi.fn();

        mockInputManager = {
            onMouseMove: vi.fn(),
            onMouseDown: vi.fn(),
            onMouseUp: vi.fn(),
            onKeyDown: vi.fn(),
            getMovementInput: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
            isKeyDown: vi.fn(() => false)
        };

        physicsSystem = new PhysicsSystem();

        player = new Player(mockScene, mockCamera, mockInputManager, physicsSystem);
    });

    describe('initialization', () => {
        it('should have initial position', () => {
            expect(player.position.x).toBe(0);
            expect(player.position.y).toBe(1.7);
            expect(player.position.z).toBe(20);
        });

        it('should have full health', () => {
            expect(player.health).toBe(player.maxHealth);
            expect(player.health).toBe(100);
        });

        it('should have full stamina', () => {
            expect(player.stamina).toBe(player.maxStamina);
            expect(player.stamina).toBe(100);
        });

        it('should not be attacking or blocking initially', () => {
            expect(player.isAttacking).toBe(false);
            expect(player.isBlocking).toBe(false);
        });
    });

    describe('init', () => {
        it('should setup camera position', async () => {
            await player.init();

            expect(mockCamera.position.x).toBe(player.position.x);
            expect(mockCamera.position.y).toBe(player.position.y);
            expect(mockCamera.position.z).toBe(player.position.z);
        });

        it('should create weapon model', async () => {
            await player.init();

            expect(player.weaponModel).not.toBeNull();
            expect(mockCamera.add).toHaveBeenCalled();
        });

        it('should setup input handlers', async () => {
            await player.init();

            expect(mockInputManager.onMouseMove).toHaveBeenCalled();
            expect(mockInputManager.onMouseDown).toHaveBeenCalled();
            expect(mockInputManager.onKeyDown).toHaveBeenCalled();
        });
    });

    describe('movement', () => {
        beforeEach(async () => {
            await player.init();
        });

        it('should move forward when W pressed', () => {
            mockInputManager.getMovementInput.mockReturnValue({ x: 0, y: 0, z: 1 });

            player.handleMovement(0.1);

            expect(player.velocity.z).toBeLessThan(0); // Forward is negative z
        });

        it('should sprint when shift is held', () => {
            mockInputManager.getMovementInput.mockReturnValue({ x: 0, y: 0, z: 1 });
            mockInputManager.isKeyDown.mockImplementation(key => key === 'ShiftLeft');
            player.stamina = 100;

            player.handleMovement(0.1);

            expect(player.isSprinting).toBe(true);
        });

        it('should drain stamina while sprinting', () => {
            mockInputManager.getMovementInput.mockReturnValue({ x: 0, y: 0, z: 1 });
            mockInputManager.isKeyDown.mockImplementation(key => key === 'ShiftLeft');
            player.stamina = 100;

            player.handleMovement(0.5);

            expect(player.stamina).toBeLessThan(100);
        });

        it('should not sprint when stamina is 0', () => {
            mockInputManager.getMovementInput.mockReturnValue({ x: 0, y: 0, z: 1 });
            mockInputManager.isKeyDown.mockImplementation(key => key === 'ShiftLeft');
            player.stamina = 0;

            player.handleMovement(0.1);

            expect(player.isSprinting).toBe(false);
        });
    });

    describe('combat', () => {
        beforeEach(async () => {
            await player.init();
        });

        it('should perform attack and return attack data', () => {
            const attack = player.performAttack();

            expect(attack).not.toBeNull();
            expect(attack.type).toBe('melee');
            // Combo count starts at 1, giving 20% bonus: 25 * 1.2 = 30
            expect(attack.damage).toBe(player.attackDamage * 1.2);
        });

        it('should set attacking state', () => {
            player.performAttack();

            expect(player.isAttacking).toBe(true);
        });

        it('should have attack cooldown', () => {
            player.performAttack();

            expect(player.attackCooldown).toBeGreaterThan(0);
        });

        it('should not attack during cooldown', () => {
            player.performAttack();
            const secondAttack = player.performAttack();

            expect(secondAttack).toBeUndefined();
        });

        it('should not attack while blocking', () => {
            player.isBlocking = true;

            const attack = player.performAttack();

            expect(attack).toBeUndefined();
        });

        it('should track combo count', () => {
            player.performAttack();
            player.attackCooldown = 0; // Reset cooldown for test

            const attack2 = player.performAttack();

            expect(player.comboCount).toBe(2);
        });

        it('should increase damage with combo', () => {
            player.performAttack();
            player.attackCooldown = 0;

            const attack2 = player.performAttack();

            expect(attack2.damage).toBeGreaterThan(player.attackDamage);
        });
    });

    describe('abilities', () => {
        beforeEach(async () => {
            await player.init();
        });

        it('should use slash ability', () => {
            const result = player.useAbility('slash');

            expect(result).not.toBeNull();
            expect(result.type).toBe('slash');
        });

        it('should use spin ability', () => {
            const result = player.useAbility('spin');

            expect(result).not.toBeNull();
            expect(result.type).toBe('spin');
        });

        it('should use dash ability', () => {
            const result = player.useAbility('dash');

            expect(result).not.toBeNull();
            expect(result.type).toBe('dash');
        });

        it('should use fireBlast ability', () => {
            const result = player.useAbility('fireBlast');

            expect(result).not.toBeNull();
            expect(result.type).toBe('fireBlast');
        });

        it('should consume stamina on ability use', () => {
            player.stamina = 100;
            const staminaCost = player.abilities.slash.staminaCost;

            player.useAbility('slash');

            expect(player.stamina).toBe(100 - staminaCost);
        });

        it('should not use ability without enough stamina', () => {
            player.stamina = 0;

            const result = player.useAbility('slash');

            expect(result).toBeNull();
        });

        it('should set ability cooldown', () => {
            player.useAbility('slash');

            expect(player.abilities.slash.cooldown).toBeGreaterThan(0);
        });

        it('should not use ability during cooldown', () => {
            player.useAbility('slash');

            const result = player.useAbility('slash');

            expect(result).toBeNull();
        });
    });

    describe('damage and health', () => {
        beforeEach(async () => {
            await player.init();
        });

        it('should take damage', () => {
            const fromDirection = new THREE.Vector3(0, 0, 1);

            player.takeDamage(20, fromDirection);

            expect(player.health).toBe(80);
        });

        it('should reduce damage when blocking correctly', () => {
            player.isBlocking = true;
            player.rotation.y = 0; // Facing forward
            const fromDirection = new THREE.Vector3(0, 0, 1); // Attack from front

            const damage = player.takeDamage(20, fromDirection);

            expect(damage).toBeLessThan(20);
        });

        it('should not reduce damage when blocking wrong direction', () => {
            player.isBlocking = true;
            player.rotation.y = 0;
            const fromDirection = new THREE.Vector3(0, 0, -1); // Attack from behind

            const damage = player.takeDamage(20, fromDirection);

            expect(damage).toBe(20);
        });

        it('should heal', () => {
            player.health = 50;

            player.heal(30);

            expect(player.health).toBe(80);
        });

        it('should not heal above max health', () => {
            player.health = 90;

            player.heal(50);

            expect(player.health).toBe(player.maxHealth);
        });

        it('should not go below 0 health', () => {
            player.takeDamage(200, new THREE.Vector3(0, 0, 1));

            expect(player.health).toBe(0);
        });
    });

    describe('reset', () => {
        beforeEach(async () => {
            await player.init();
        });

        it('should reset position', () => {
            player.position.set(100, 100, 100);

            player.reset();

            expect(player.position.x).toBe(0);
            expect(player.position.y).toBe(1.7);
            expect(player.position.z).toBe(20);
        });

        it('should reset health and stamina', () => {
            player.health = 10;
            player.stamina = 10;

            player.reset();

            expect(player.health).toBe(player.maxHealth);
            expect(player.stamina).toBe(player.maxStamina);
        });

        it('should reset ability cooldowns', () => {
            player.abilities.slash.cooldown = 5;
            player.abilities.spin.cooldown = 5;

            player.reset();

            expect(player.abilities.slash.cooldown).toBe(0);
            expect(player.abilities.spin.cooldown).toBe(0);
        });

        it('should reset combat state', () => {
            player.isBlocking = true;
            player.isAttacking = true;
            player.comboCount = 3;

            player.reset();

            expect(player.isBlocking).toBe(false);
            expect(player.isAttacking).toBe(false);
            expect(player.comboCount).toBe(0);
        });
    });

    describe('getAbilityCooldowns', () => {
        beforeEach(async () => {
            await player.init();
        });

        it('should return cooldown info for all abilities', () => {
            const cooldowns = player.getAbilityCooldowns();

            expect(cooldowns.slash).toBeDefined();
            expect(cooldowns.spin).toBeDefined();
            expect(cooldowns.dash).toBeDefined();
            expect(cooldowns.fireBlast).toBeDefined();
        });

        it('should show abilities as ready when off cooldown', () => {
            const cooldowns = player.getAbilityCooldowns();

            expect(cooldowns.slash.ready).toBe(true);
        });

        it('should show abilities as not ready when on cooldown', () => {
            player.abilities.slash.cooldown = 1;

            const cooldowns = player.getAbilityCooldowns();

            expect(cooldowns.slash.ready).toBe(false);
            expect(cooldowns.slash.current).toBe(1);
        });
    });

    describe('getForwardDirection', () => {
        beforeEach(async () => {
            await player.init();
        });

        it('should return normalized forward direction', () => {
            const direction = player.getForwardDirection();

            expect(direction.length()).toBeCloseTo(1, 5);
        });

        it('should change with player rotation', () => {
            player.rotation.y = Math.PI / 2; // 90 degrees

            const direction = player.getForwardDirection();

            expect(direction.x).toBeCloseTo(-1, 1);
            expect(direction.z).toBeCloseTo(0, 1);
        });
    });
});
