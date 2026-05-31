/**
 * Campaign level state for the castle, beach, and final boss encounter.
 */

import * as THREE from 'three';

export const LEVELS = [
    {
        id: 'castle-forest',
        title: 'Moonlit Castle',
        subtitle: 'Reach the shrine beyond the haunted forest.',
        theme: 'forest',
        goalPosition: new THREE.Vector3(0, 1, -160),
        goalRadius: 6,
        spawnStartZ: -40,
        spawnEndZ: -150,
        spawnLeadDistance: 16,
        spawnSpread: 22,
        maxEnemies: 3,
        enemyTypes: ['grunt', 'grunt', 'warrior', 'assassin'],
        color: '#88ffaa'
    },
    {
        id: 'sunset-beach',
        title: 'Sunset Beach',
        subtitle: 'Cross the tide pools and reach the reef gate.',
        theme: 'beach',
        goalPosition: new THREE.Vector3(0, 1, -318),
        goalRadius: 8,
        spawnStartZ: -178,
        spawnEndZ: -318,
        spawnLeadDistance: 22,
        spawnSpread: 38,
        maxEnemies: 4,
        enemyTypes: ['grunt', 'warrior', 'warrior', 'assassin'],
        color: '#ffd38a'
    },
    {
        id: 'storm-reef',
        title: 'Storm Reef Showdown',
        subtitle: 'Fight with your team and defeat the storm shogun.',
        theme: 'boss',
        goalPosition: new THREE.Vector3(0, 1, -430),
        goalRadius: 14,
        spawnStartZ: -332,
        spawnEndZ: -430,
        spawnLeadDistance: 20,
        spawnSpread: 46,
        spawnY: 1.1,
        maxEnemies: 5,
        enemyTypes: ['grunt', 'warrior', 'assassin', 'assassin'],
        teammateCount: 2,
        boss: {
            type: 'boss',
            name: 'Storm Shogun',
            position: new THREE.Vector3(0, 1.1, -424)
        },
        color: '#8fd8ff'
    }
];

export class LevelSystem {
    constructor(levels = LEVELS) {
        this.levels = levels;
        this.currentLevelIndex = 0;
        this.completedLevelIds = new Set();
        this.bossEncounterStarted = false;
        this.bossDefeated = false;
    }

    getCurrentLevel() {
        return this.levels[this.currentLevelIndex];
    }

    getLevelNumber() {
        return this.currentLevelIndex + 1;
    }

    getLevelCount() {
        return this.levels.length;
    }

    advanceIfGoalReached(position) {
        const current = this.getCurrentLevel();
        if (!current || this.isFinalLevel()) return null;

        const distance = position.distanceTo(current.goalPosition);
        if (distance > current.goalRadius) return null;

        const from = current.id;
        this.completedLevelIds.add(from);
        this.currentLevelIndex += 1;
        const next = this.getCurrentLevel();

        return {
            from,
            to: next.id,
            levelNumber: this.getLevelNumber(),
            level: next
        };
    }

    isFinalLevel() {
        return this.currentLevelIndex === this.levels.length - 1;
    }

    shouldStartBossEncounter() {
        const current = this.getCurrentLevel();
        return Boolean(current?.boss && !this.bossEncounterStarted);
    }

    markBossEncounterStarted() {
        this.bossEncounterStarted = true;
    }

    markBossDefeated() {
        this.bossDefeated = true;
        const current = this.getCurrentLevel();
        if (current?.id) {
            this.completedLevelIds.add(current.id);
        }
    }

    isCampaignComplete() {
        return this.isFinalLevel() && this.bossDefeated;
    }

    reset() {
        this.currentLevelIndex = 0;
        this.completedLevelIds.clear();
        this.bossEncounterStarted = false;
        this.bossDefeated = false;
    }
}
