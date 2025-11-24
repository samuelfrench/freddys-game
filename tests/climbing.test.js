/**
 * Climbing System Tests
 * Tests for the stair climbing fix that prevents teleportation to distant surfaces
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PhysicsSystem } from '../src/systems/PhysicsSystem.js';

describe('Climbing System', () => {
    let physics;

    beforeEach(() => {
        physics = new PhysicsSystem();
    });

    describe('getGroundHeight with step height limit', () => {
        it('should return 0 when no platforms exist', () => {
            const position = new THREE.Vector3(0, 5, 0);
            const currentY = 1.7; // Player at ground level

            expect(physics.getGroundHeight(position, currentY)).toBe(0);
        });

        it('should return platform height when player is standing on it', () => {
            // Platform at y=2 (top surface at y=3)
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 2, 0),
                size: new THREE.Vector3(4, 2, 4)
            });

            const position = new THREE.Vector3(0, 5, 0);
            const currentY = 4.7; // Player standing on platform (feet at y=3)

            expect(physics.getGroundHeight(position, currentY)).toBe(3);
        });

        it('should allow stepping up onto surfaces within step height', () => {
            // Low step at y=0.3 (top at y=0.5)
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 0.3, 0),
                size: new THREE.Vector3(4, 0.4, 4)
            });

            const position = new THREE.Vector3(0, 2, 0);
            const currentY = 1.7; // Player at ground level (feet at y=0)

            // Step top (0.5) is within 1.0 of feet (0), should be valid
            expect(physics.getGroundHeight(position, currentY)).toBe(0.5);
        });

        it('should NOT allow teleporting to surfaces far above player', () => {
            // High platform at y=10 (top at y=11)
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 10, 0),
                size: new THREE.Vector3(4, 2, 4)
            });

            const position = new THREE.Vector3(0, 2, 0);
            const currentY = 1.7; // Player at ground level (feet at y=0)

            // Platform top (11) is way above feet (0), should return 0
            expect(physics.getGroundHeight(position, currentY)).toBe(0);
        });

        it('should handle tower scenario - prevent teleport to top', () => {
            // Simulate tower with stacked platforms (like spiral stairs)
            // Ground level
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, -0.5, 0),
                size: new THREE.Vector3(10, 1, 10)
            });

            // Stairs at various heights
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(2, 2, 0),
                size: new THREE.Vector3(3, 0.3, 3)
            });

            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 4, 2),
                size: new THREE.Vector3(3, 0.3, 3)
            });

            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(-2, 6, 0),
                size: new THREE.Vector3(3, 0.3, 3)
            });

            // Top platform
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 15, 0),
                size: new THREE.Vector3(5, 0.3, 5)
            });

            // Player walking toward tower at ground level
            const position = new THREE.Vector3(0, 2, 0);
            const currentY = 1.7; // Feet at y=0

            // Should return ground (0), not teleport to top (15.15)
            const groundHeight = physics.getGroundHeight(position, currentY);
            expect(groundHeight).toBe(0);
            expect(groundHeight).not.toBe(15.15);
        });

        it('should allow climbing stairs one step at a time', () => {
            // Non-overlapping steps spaced 5 units apart
            // Step 1: center at y=0.4, size 0.3 -> top at y=0.55
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 0.4, 0),
                size: new THREE.Vector3(2, 0.3, 2)
            });

            // Step 2: center at y=0.85, size 0.3 -> top at y=1.0
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 0.85, 5),
                size: new THREE.Vector3(2, 0.3, 2)
            });

            // Step 3: center at y=1.35, size 0.3 -> top at y=1.5
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 1.35, 10),
                size: new THREE.Vector3(2, 0.3, 2)
            });

            // Player at ground (feet at y=0), can step onto step 1 (top at 0.55)
            let groundHeight = physics.getGroundHeight(new THREE.Vector3(0, 2, 0), 1.7);
            expect(groundHeight).toBe(0.55); // Top of step 1

            // Player on step 1 (feet at 0.55), moving to step 2
            // Step 2 top = 1.0, which is 0.45 above feet - within step height
            groundHeight = physics.getGroundHeight(new THREE.Vector3(0, 2, 5), 1.7 + 0.55);
            expect(groundHeight).toBe(1.0); // Top of step 2

            // Player on step 2 (feet at 1.0), can step onto step 3 (top at 1.5)
            groundHeight = physics.getGroundHeight(new THREE.Vector3(0, 2, 10), 1.7 + 1.0);
            expect(groundHeight).toBe(1.5); // Top of step 3
        });

        it('should work with spiral stair pattern', () => {
            const radius = 5;
            const stepsPerLevel = 8;
            const heightPerStep = 0.5;

            // Create spiral stair collision boxes
            for (let i = 0; i < stepsPerLevel * 2; i++) {
                const angle = (i / stepsPerLevel) * Math.PI * 2;
                const y = 2 + i * heightPerStep;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;

                physics.addStaticBody({
                    type: 'box',
                    position: new THREE.Vector3(x, y, z),
                    size: new THREE.Vector3(3, 0.3, 3)
                });
            }

            // Player at ground level walking toward first stair
            const firstStairX = Math.cos(0) * radius;
            const firstStairZ = Math.sin(0) * radius;

            // Should NOT teleport to any stair when at ground level
            const groundHeight = physics.getGroundHeight(
                new THREE.Vector3(firstStairX, 5, firstStairZ),
                1.7 // Ground level
            );

            // First stair is at y=2, which is > 1.0 step height from feet at y=0
            expect(groundHeight).toBe(0);
        });

        it('should allow entry stairs from ground to spiral start', () => {
            // Entry step 1 at y=0.65
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(5, 0.65, 0),
                size: new THREE.Vector3(4, 0.3, 3)
            });

            // Entry step 2 at y=1.3
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(4, 1.3, 0),
                size: new THREE.Vector3(4, 0.3, 3)
            });

            // Entry step 3 at y=1.95 (connects to spiral at y=2)
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(3, 1.95, 0),
                size: new THREE.Vector3(4, 0.3, 3)
            });

            // Player can step onto first entry step from ground
            let height = physics.getGroundHeight(new THREE.Vector3(5, 2, 0), 1.7);
            expect(height).toBe(0.8); // Top of step 1

            // Player on step 1 can reach step 2
            height = physics.getGroundHeight(new THREE.Vector3(4, 3, 0), 1.7 + 0.8);
            expect(height).toBe(1.45); // Top of step 2

            // Player on step 2 can reach step 3
            height = physics.getGroundHeight(new THREE.Vector3(3, 3, 0), 1.7 + 1.45);
            expect(height).toBe(2.1); // Top of step 3
        });

        it('should handle backward compatibility when currentY is not provided', () => {
            // Platform at y=5 (top at y=6)
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 5, 0),
                size: new THREE.Vector3(4, 2, 4)
            });

            // When currentY is not provided, uses position.y
            const position = new THREE.Vector3(0, 7.7, 0); // Player above platform
            const height = physics.getGroundHeight(position);

            // Should work as before - position.y of 7.7 means feet at ~6
            expect(height).toBe(6);
        });
    });

    describe('max step height constant', () => {
        it('should use 1.0 unit as max step height', () => {
            // Step exactly at max step height (1.0 above feet)
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 0.85, 0),
                size: new THREE.Vector3(4, 0.3, 4)
            });

            const position = new THREE.Vector3(0, 2, 0);
            const currentY = 1.7; // Feet at y=0

            // Top of step at 1.0, exactly at max step height - should be reachable
            expect(physics.getGroundHeight(position, currentY)).toBe(1.0);
        });

        it('should reject surfaces just beyond max step height', () => {
            // Step just beyond max step height (1.1 above feet)
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 1.0, 0),
                size: new THREE.Vector3(4, 0.3, 4)
            });

            const position = new THREE.Vector3(0, 2, 0);
            const currentY = 1.7; // Feet at y=0

            // Top of step at 1.15, just beyond max step height - should NOT be reachable
            expect(physics.getGroundHeight(position, currentY)).toBe(0);
        });
    });

    describe('integration with player movement', () => {
        it('should allow gradual ascent up tower', () => {
            // Simulate a series of platforms going up
            const heights = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
            heights.forEach((h, i) => {
                physics.addStaticBody({
                    type: 'box',
                    position: new THREE.Vector3(i * 2, h - 0.15, 0),
                    size: new THREE.Vector3(3, 0.3, 3)
                });
            });

            // Simulate player climbing
            let playerY = 1.7; // Start at ground level
            let feetY = 0;

            for (let i = 0; i < heights.length; i++) {
                const pos = new THREE.Vector3(i * 2, playerY + 1, 0);
                const groundHeight = physics.getGroundHeight(pos, playerY);

                // Each step should be reachable (0.5 unit increments)
                expect(groundHeight).toBe(heights[i]);

                // Update player position for next iteration
                feetY = groundHeight;
                playerY = feetY + 1.7;
            }
        });
    });
});
