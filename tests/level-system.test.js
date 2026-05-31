/**
 * Level System Tests
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { LevelSystem, LEVELS } from '../src/systems/LevelSystem.js';

describe('LevelSystem', () => {
    it('defines a three-level campaign with beach as level 2 and final boss support', () => {
        expect(LEVELS).toHaveLength(3);

        expect(LEVELS[0]).toMatchObject({
            id: 'castle-forest',
            title: 'Moonlit Castle',
            objectiveLabel: 'Reach the forest shrine'
        });

        expect(LEVELS[1]).toMatchObject({
            id: 'sunset-beach',
            title: 'Sunset Beach',
            theme: 'beach',
            objectiveLabel: 'Reach the reef gate'
        });
        expect(LEVELS[1].goalPosition.z).toBeLessThan(-280);
        expect(LEVELS[1].enemyTypes).toContain('warrior');

        expect(LEVELS[2]).toMatchObject({
            id: 'storm-reef',
            title: 'Storm Reef Showdown',
            theme: 'boss',
            teammateCount: 2,
            objectiveLabel: 'Defeat Storm Shogun'
        });
        expect(LEVELS[2].boss.type).toBe('boss');
    });

    it('advances from the forest shrine to the beach when the player reaches the first goal', () => {
        const levels = new LevelSystem();

        const transition = levels.advanceIfGoalReached(new THREE.Vector3(0, 1, -160));

        expect(transition).toMatchObject({
            from: 'castle-forest',
            to: 'sunset-beach',
            levelNumber: 2
        });
        expect(levels.getCurrentLevel().id).toBe('sunset-beach');
    });

    it('advances from beach to the final level and requests the boss encounter once', () => {
        const levels = new LevelSystem();
        levels.advanceIfGoalReached(new THREE.Vector3(0, 1, -160));

        const transition = levels.advanceIfGoalReached(new THREE.Vector3(0, 1, -318));

        expect(transition).toMatchObject({
            from: 'sunset-beach',
            to: 'storm-reef',
            levelNumber: 3
        });
        expect(levels.shouldStartBossEncounter()).toBe(true);

        levels.markBossEncounterStarted();

        expect(levels.shouldStartBossEncounter()).toBe(false);
    });

    it('does not complete the final level until the boss is defeated', () => {
        const levels = new LevelSystem();
        levels.advanceIfGoalReached(new THREE.Vector3(0, 1, -160));
        levels.advanceIfGoalReached(new THREE.Vector3(0, 1, -318));

        expect(levels.isCampaignComplete()).toBe(false);

        levels.markBossDefeated();

        expect(levels.isCampaignComplete()).toBe(true);
    });

    it('reports objective status with distance and a cloned marker position', () => {
        const levels = new LevelSystem();
        levels.advanceIfGoalReached(new THREE.Vector3(0, 1, -160));

        const status = levels.getCurrentObjectiveStatus(new THREE.Vector3(0, 1, -300));

        expect(status).toMatchObject({
            levelId: 'sunset-beach',
            label: 'Reach the reef gate',
            color: '#ffd38a',
            distance: 18
        });
        expect(status.position.equals(LEVELS[1].goalPosition)).toBe(true);
        expect(status.position).not.toBe(LEVELS[1].goalPosition);
    });

    it('returns a cloned checkpoint start position for the current level', () => {
        const levels = new LevelSystem();
        levels.advanceIfGoalReached(new THREE.Vector3(0, 1, -160));

        const checkpoint = levels.getCurrentCheckpointPosition();

        expect(checkpoint.z).toBeLessThan(-160);
        expect(checkpoint.z).toBeGreaterThan(-220);
        expect(checkpoint.y).toBeCloseTo(1.7);
        expect(checkpoint).not.toBe(levels.getCurrentLevel().startPosition);
    });
});
