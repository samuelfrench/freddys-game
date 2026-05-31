/**
 * NinjaCastle extended level environment tests
 */

import { describe, it, expect, vi } from 'vitest';
import { NinjaCastle } from '../src/entities/NinjaCastle.js';
import { PhysicsSystem } from '../src/systems/PhysicsSystem.js';

describe('NinjaCastle extended campaign environments', () => {
    it('builds beach and storm-reef landmarks beyond the original forest', async () => {
        const scene = {
            add: vi.fn()
        };
        const physics = new PhysicsSystem();
        const castle = new NinjaCastle(scene, physics);

        await castle.build();

        expect(castle.levelLandmarks.map((landmark) => landmark.id)).toEqual(
            expect.arrayContaining(['sunset-beach', 'storm-reef'])
        );
        expect(castle.bounds.minZ).toBeLessThanOrEqual(-450);
        expect(castle.spawnPoints.some((point) => point.z < -250)).toBe(true);
    });
});
