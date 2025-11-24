/**
 * Wave System - Manages enemy waves with increasing difficulty
 */

export class WaveSystem {
    constructor(aiSystem, castle) {
        this.aiSystem = aiSystem;
        this.castle = castle;

        this.currentWave = 0;
        this.waveTimer = 0;
        this.spawnTimer = 0;
        this.enemiesRemaining = 0;
        this.enemiesToSpawn = [];
        this.waveActive = false;

        // Wave configuration
        this.baseEnemyCount = 3;
        this.enemyScaling = 1;
        this.spawnDelay = 2.0;
        this.waveDelay = 5;
    }

    startWave(waveNumber) {
        this.currentWave = waveNumber;
        this.waveActive = true;
        this.waveTimer = 0;
        this.spawnTimer = 0;

        // Generate enemy list for this wave
        this.enemiesToSpawn = this.generateWaveEnemies(waveNumber);
        this.enemiesRemaining = this.enemiesToSpawn.length;
    }

    generateWaveEnemies(waveNumber) {
        const enemies = [];
        const totalEnemies = this.baseEnemyCount + Math.floor(waveNumber * this.enemyScaling);

        // Calculate enemy distribution based on wave
        for (let i = 0; i < totalEnemies; i++) {
            let type = 'grunt';

            // Higher waves have more varied enemies
            const roll = Math.random();

            if (waveNumber >= 10 && roll > 0.95) {
                type = 'boss';
            } else if (waveNumber >= 5 && roll > 0.8) {
                type = 'assassin';
            } else if (waveNumber >= 3 && roll > 0.6) {
                type = 'warrior';
            }

            enemies.push(type);
        }

        // Add guaranteed boss every 10 waves
        if (waveNumber % 10 === 0 && waveNumber > 0) {
            enemies.push('boss');
        }

        return enemies;
    }

    update(deltaTime) {
        if (!this.waveActive) return;

        this.waveTimer += deltaTime;
        this.spawnTimer += deltaTime;

        // Spawn enemies
        if (this.enemiesToSpawn.length > 0 && this.spawnTimer >= this.spawnDelay) {
            this.spawnTimer = 0;

            const type = this.enemiesToSpawn.shift();
            const spawnPoint = this.castle.getRandomSpawnPoint();

            this.aiSystem.spawnEnemy(type, spawnPoint);
        }

        // Check for dead enemies
        const currentCount = this.aiSystem.getEnemyCount();
        const spawned = this.enemiesRemaining - this.enemiesToSpawn.length;

        if (currentCount < spawned) {
            this.enemiesRemaining = currentCount + this.enemiesToSpawn.length;
        }
    }

    isWaveComplete() {
        return this.waveActive &&
            this.enemiesToSpawn.length === 0 &&
            this.aiSystem.getEnemyCount() === 0;
    }

    getCurrentWave() {
        return this.currentWave;
    }

    getEnemiesRemaining() {
        return this.aiSystem.getEnemyCount() + this.enemiesToSpawn.length;
    }

    getWaveProgress() {
        const total = this.baseEnemyCount + Math.floor(this.currentWave * this.enemyScaling);
        const remaining = this.getEnemiesRemaining();
        return {
            killed: total - remaining,
            total: total,
            percentage: ((total - remaining) / total) * 100
        };
    }
}
