/**
 * Physics System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PhysicsSystem } from '../src/systems/PhysicsSystem.js';

describe('PhysicsSystem', () => {
    let physics;

    beforeEach(() => {
        physics = new PhysicsSystem();
    });

    describe('initialization', () => {
        it('should initialize with empty body arrays', () => {
            expect(physics.staticBodies).toEqual([]);
            expect(physics.dynamicBodies).toEqual([]);
        });

        it('should have a default ground plane at y=0', () => {
            expect(physics.groundPlane.position.y).toBe(0);
            expect(physics.groundPlane.normal.y).toBe(1);
        });
    });

    describe('addStaticBody', () => {
        it('should add a static body to the array', () => {
            const body = {
                type: 'box',
                position: new THREE.Vector3(0, 1, 0),
                size: new THREE.Vector3(2, 2, 2)
            };

            physics.addStaticBody(body);

            expect(physics.staticBodies).toHaveLength(1);
            expect(physics.staticBodies[0]).toBe(body);
        });

        it('should add multiple static bodies', () => {
            physics.addStaticBody({ type: 'box', position: new THREE.Vector3(0, 0, 0), size: new THREE.Vector3(1, 1, 1) });
            physics.addStaticBody({ type: 'box', position: new THREE.Vector3(5, 0, 5), size: new THREE.Vector3(1, 1, 1) });

            expect(physics.staticBodies).toHaveLength(2);
        });
    });

    describe('addDynamicBody', () => {
        it('should add a dynamic body and return it', () => {
            const body = {
                type: 'capsule',
                position: new THREE.Vector3(0, 1, 0),
                radius: 0.5
            };

            const result = physics.addDynamicBody(body);

            expect(physics.dynamicBodies).toHaveLength(1);
            expect(result).toBe(body);
        });
    });

    describe('removeBody', () => {
        it('should remove a static body', () => {
            const body = { type: 'box', position: new THREE.Vector3(), size: new THREE.Vector3(1, 1, 1) };
            physics.addStaticBody(body);

            physics.removeBody(body);

            expect(physics.staticBodies).toHaveLength(0);
        });

        it('should remove a dynamic body', () => {
            const body = { type: 'capsule', position: new THREE.Vector3(), radius: 0.5 };
            physics.addDynamicBody(body);

            physics.removeBody(body);

            expect(physics.dynamicBodies).toHaveLength(0);
        });

        it('should handle removing non-existent body gracefully', () => {
            const body = { type: 'box' };

            expect(() => physics.removeBody(body)).not.toThrow();
        });
    });

    describe('getGroundHeight', () => {
        it('should return 0 for positions with no platforms above', () => {
            const position = new THREE.Vector3(100, 0, 100);

            expect(physics.getGroundHeight(position)).toBe(0);
        });

        it('should return platform height when player is standing on a box', () => {
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 1, 0),
                size: new THREE.Vector3(4, 2, 4) // Platform from y=0 to y=2
            });

            const position = new THREE.Vector3(0, 5, 0);
            const currentY = 3.7; // Player standing on platform (feet at y=2)

            expect(physics.getGroundHeight(position, currentY)).toBe(2);
        });

        it('should return highest reachable platform when stacked', () => {
            // Lower platform (top at y=2)
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 1, 0),
                size: new THREE.Vector3(4, 2, 4)
            });
            // Higher platform (top at y=5)
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 4, 0),
                size: new THREE.Vector3(2, 2, 2)
            });

            // Player standing on lower platform can't reach upper (3 units above)
            const position = new THREE.Vector3(0, 10, 0);
            const currentY = 3.7; // Player on lower platform (feet at y=2)

            // Should return lower platform, not upper (which is too high to step onto)
            expect(physics.getGroundHeight(position, currentY)).toBe(2);
        });

        it('should allow stepping onto nearby platforms', () => {
            // Platform at y=0.5 (top at y=0.75)
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 0.5, 0),
                size: new THREE.Vector3(4, 0.5, 4)
            });

            const position = new THREE.Vector3(0, 5, 0);
            const currentY = 1.7; // Player at ground level (feet at y=0)

            // Platform top (0.75) is within step height of feet (0)
            expect(physics.getGroundHeight(position, currentY)).toBe(0.75);
        });
    });

    describe('checkCollision', () => {
        it('should return no collision when no bodies present', () => {
            const collider = {
                type: 'capsule',
                radius: 0.5,
                height: 1.7
            };
            const position = new THREE.Vector3(0, 1, 0);

            const result = physics.checkCollision(collider, position);

            expect(result.collided).toBe(false);
        });

        it('should detect collision with box', () => {
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 1, 0),
                size: new THREE.Vector3(2, 2, 2)
            });

            // Position the collider right at the edge of the box (box extends from -1 to 1)
            // Collider with radius 0.5 at x=1.3 should overlap with box edge at x=1
            const collider = { radius: 0.5, height: 1.7 };
            const position = new THREE.Vector3(1.3, 1, 0);

            const result = physics.checkCollision(collider, position);

            expect(result.collided).toBe(true);
            expect(result.pushback.length()).toBeGreaterThan(0);
        });
    });

    describe('update', () => {
        it('should update dynamic body positions based on velocity', () => {
            const body = {
                position: new THREE.Vector3(0, 0, 0),
                velocity: new THREE.Vector3(10, 0, 0)
            };
            physics.addDynamicBody(body);

            physics.update(0.1);

            expect(body.position.x).toBe(1);
        });
    });

    describe('sphereOverlap', () => {
        it('should find overlapping dynamic bodies', () => {
            const body1 = { position: new THREE.Vector3(0, 0, 0), radius: 0.5 };
            const body2 = { position: new THREE.Vector3(10, 0, 0), radius: 0.5 };
            physics.addDynamicBody(body1);
            physics.addDynamicBody(body2);

            const overlapping = physics.sphereOverlap(new THREE.Vector3(0, 0, 0), 2);

            expect(overlapping).toContain(body1);
            expect(overlapping).not.toContain(body2);
        });
    });

    describe('coneOverlap', () => {
        it('should find bodies within cone', () => {
            const body1 = { position: new THREE.Vector3(0, 0, -5) }; // In front
            const body2 = { position: new THREE.Vector3(0, 0, 5) };  // Behind
            physics.addDynamicBody(body1);
            physics.addDynamicBody(body2);

            const origin = new THREE.Vector3(0, 0, 0);
            const direction = new THREE.Vector3(0, 0, -1);
            const overlapping = physics.coneOverlap(origin, direction, Math.PI / 4, 10);

            expect(overlapping).toContain(body1);
            expect(overlapping).not.toContain(body2);
        });
    });

    describe('raycast', () => {
        it('should return null when no intersection', () => {
            const origin = new THREE.Vector3(0, 0, 0);
            const direction = new THREE.Vector3(0, 0, -1);

            const hit = physics.raycast(origin, direction);

            expect(hit).toBeNull();
        });

        it('should return hit info for box intersection', () => {
            physics.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(0, 0, -5),
                size: new THREE.Vector3(2, 2, 2)
            });

            const origin = new THREE.Vector3(0, 0, 0);
            const direction = new THREE.Vector3(0, 0, -1);

            const hit = physics.raycast(origin, direction);

            expect(hit).not.toBeNull();
            expect(hit.distance).toBeCloseTo(4, 1);
            expect(hit.body).toBeDefined();
        });
    });
});
