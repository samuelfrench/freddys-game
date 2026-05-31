/**
 * Main Game Class - Core engine and orchestration
 */

import * as THREE from 'three';
import { Renderer } from './Renderer.js';
import { InputManager } from '../systems/InputManager.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { AISystem } from '../systems/AISystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { LevelSystem } from '../systems/LevelSystem.js';
import { Player } from '../entities/Player.js';
import { NinjaCastle } from '../entities/NinjaCastle.js';
import { CompanionCat } from '../entities/CompanionCat.js';
import { AllyNinja } from '../entities/AllyNinja.js';
import { UIManager } from '../systems/UIManager.js';
import { Minimap } from '../systems/Minimap.js';
import { qualitySettings } from '../systems/QualitySettings.js';

export class Game {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.clock = new THREE.Clock();
        this.deltaTime = 0;
        this.elapsedTime = 0;

        // FPS tracking
        this.frameCount = 0;
        this.fpsTime = 0;
        this.currentFPS = 0;

        // Core systems
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.inputManager = null;
        this.physicsSystem = null;
        this.aiSystem = null;
        this.combatSystem = null;
        this.particleSystem = null;
        this.audioSystem = null;
        this.waveSystem = null;
        this.levelSystem = new LevelSystem();
        this.uiManager = null;
        this.minimap = null;

        // Game entities
        this.player = null;
        this.castle = null;
        this.companionCat = null;
        this.allies = [];
        this.bossEnemy = null;
        this.enemies = [];
        this.tombstones = [];

        // Game state
        this.score = 0;
        this.wave = 1;
        this.hasWon = false;
        this.bossBattleActive = false;
        this.pathSpawnCooldown = 0;
    }

    async init() {
        this.updateLoadingProgress(5, 'Creating scene...');

        // Create Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x4a4a6a);
        this.scene.fog = new THREE.FogExp2(0x4a4a6a, 0.003);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Add camera to scene so weapon is visible
        this.scene.add(this.camera);

        this.updateLoadingProgress(15, 'Initializing renderer...');

        // Initialize renderer with post-processing
        this.renderer = new Renderer(this.scene, this.camera);
        await this.renderer.init();

        this.updateLoadingProgress(25, 'Loading physics...');

        // Initialize physics
        this.physicsSystem = new PhysicsSystem();

        this.updateLoadingProgress(35, 'Building ninja castle...');

        // Create the castle environment
        this.castle = new NinjaCastle(this.scene, this.physicsSystem);
        await this.castle.build();

        this.updateLoadingProgress(55, 'Spawning player...');

        // Initialize input manager
        this.inputManager = new InputManager();

        // Create player
        this.player = new Player(
            this.scene,
            this.camera,
            this.inputManager,
            this.physicsSystem
        );
        await this.player.init();

        this.updateLoadingProgress(65, 'Initializing AI system...');

        // Initialize AI system
        this.aiSystem = new AISystem(this.scene, this.physicsSystem, this.castle);

        this.updateLoadingProgress(75, 'Setting up combat...');

        // Initialize combat system
        this.combatSystem = new CombatSystem(this.player, this.aiSystem);

        // Create companion cat
        this.companionCat = new CompanionCat(this.scene, this.player, this.aiSystem);

        // Initialize particle system
        this.particleSystem = new ParticleSystem(this.scene);

        this.updateLoadingProgress(85, 'Loading audio...');

        // Initialize audio system
        this.audioSystem = new AudioSystem(this.camera);
        await this.audioSystem.init();

        // Initialize wave system
        this.waveSystem = new WaveSystem(this.aiSystem, this.castle);

        this.updateLoadingProgress(90, 'Setting up UI...');

        // Initialize UI
        this.uiManager = new UIManager(this);

        // Initialize minimap
        this.minimap = new Minimap(this.player, this.aiSystem, this.castle);

        // Setup event listeners
        this.setupEventListeners();

        this.updateLoadingProgress(100, 'Ready!');

        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
        }, 500);
    }

    updateLoadingProgress(percent, text) {
        document.getElementById('loading-bar').style.width = `${percent}%`;
        document.getElementById('loading-text').textContent = text;
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Pause menu
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.resume();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });

        // Pause on escape
        this.inputManager.onKeyDown('Escape', () => {
            if (this.isPaused) {
                this.resume();
            } else {
                this.pause();
            }
        });

        // Quality toggle button
        const qualityToggle = document.getElementById('quality-toggle');
        const qualityValue = document.getElementById('quality-value');

        // Set initial quality display
        qualityValue.textContent = qualitySettings.getPresetName();

        qualityToggle.addEventListener('click', () => {
            const newQuality = qualitySettings.cycleQuality();
            qualityValue.textContent = newQuality;

            // Apply to castle
            if (this.castle) {
                this.castle.applyQualitySettings();
            }
        });

        // Load saved quality preference
        qualitySettings.loadSavedQuality();
        qualityValue.textContent = qualitySettings.getPresetName();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        this.isRunning = true;
        this.clock.start();

        // Start ambient music
        this.audioSystem.playAmbient();

        // Show objective
        this.uiManager.showNotification('Level 1: Moonlit Castle');
        setTimeout(() => {
            this.uiManager.showNotification(this.levelSystem.getCurrentLevel().subtitle);
        }, 900);

        // Begin game loop
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.gameLoop());

        if (this.isPaused) return;

        this.deltaTime = Math.min(this.clock.getDelta(), 0.1);
        this.elapsedTime = this.clock.getElapsedTime();

        // FPS tracking
        this.frameCount++;
        this.fpsTime += this.deltaTime;
        if (this.fpsTime >= 1.0) {
            this.currentFPS = Math.round(this.frameCount / this.fpsTime);
            document.getElementById('fps-counter').textContent = `FPS: ${this.currentFPS}`;
            this.frameCount = 0;
            this.fpsTime = 0;
        }

        // Update all systems
        this.update();

        // Render
        this.renderer.render(this.elapsedTime);
    }

    update() {
        // Update player
        this.player.update(this.deltaTime);

        // Update companion cat
        this.companionCat.update(this.deltaTime);

        // Update final-level teammates
        for (const ally of this.allies) {
            ally.update(this.deltaTime);
        }

        // Update physics
        this.physicsSystem.update(this.deltaTime);

        // Update AI
        this.aiSystem.update(this.deltaTime, this.player);

        // Update combat
        const combatResults = this.combatSystem.update(this.deltaTime);
        this.handleCombatResults(combatResults);

        // Update particles
        this.particleSystem.update(this.deltaTime);

        // Check for goal (reaching the shrine)
        this.checkGoal();

        // Spawn enemies along the path instead of waves
        this.spawnPathEnemies();

        // Update UI
        this.uiManager.update();

        // Update minimap
        this.minimap.update();

        // Update castle animations and frustum culling
        this.castle.update(this.deltaTime, this.elapsedTime, this.camera);
    }

    checkGoal() {
        if (this.hasWon) return;

        const transition = this.levelSystem.advanceIfGoalReached(this.player.position);
        if (transition) {
            this.handleLevelTransition(transition);
        }
    }

    handleLevelTransition(transition) {
        const { level, levelNumber } = transition;

        this.wave = levelNumber;
        this.pathSpawnCooldown = 1.5;
        this.aiSystem.clearAllEnemies();
        this.applyLevelAtmosphere(level);

        this.uiManager.showNotification(`Level ${levelNumber}: ${level.title}`);
        setTimeout(() => {
            this.uiManager.showNotification(level.subtitle);
        }, 900);

        if (this.levelSystem.shouldStartBossEncounter()) {
            this.startBossEncounter(level);
        }
    }

    applyLevelAtmosphere(level) {
        if (!this.scene) return;

        if (level.theme === 'beach') {
            this.scene.background = new THREE.Color(0xf2a36b);
            this.scene.fog = new THREE.FogExp2(0xf2a36b, 0.002);
        } else if (level.theme === 'boss') {
            this.scene.background = new THREE.Color(0x1c2942);
            this.scene.fog = new THREE.FogExp2(0x1c2942, 0.0035);
        } else {
            this.scene.background = new THREE.Color(0x4a4a6a);
            this.scene.fog = new THREE.FogExp2(0x4a4a6a, 0.003);
        }
    }

    startBossEncounter(level) {
        this.levelSystem.markBossEncounterStarted();
        this.bossBattleActive = true;
        this.clearAllies();
        this.spawnAllies(level.teammateCount || 2);

        this.bossEnemy = this.aiSystem.spawnEnemy(level.boss.type, level.boss.position.clone());
        this.bossEnemy.name = level.boss.name;
        this.bossEnemy.points = 2500;

        this.uiManager.showNotification(`${level.boss.name} has arrived!`);
        this.audioSystem.playSound('bossSpawn', level.boss.position);
    }

    spawnAllies(count) {
        const allyConfigs = [
            { name: 'Mika', sideOffset: -3.4, color: 0x2c8dff },
            { name: 'Ryo', sideOffset: 3.4, color: 0x12c7a3 }
        ];

        for (let i = 0; i < count; i++) {
            const config = allyConfigs[i % allyConfigs.length];
            const ally = new AllyNinja(this.scene, this.player, this.aiSystem, {
                ...config,
                onEnemyDefeated: (enemy, source) => this.handleAllyEnemyDefeated(enemy, source)
            });
            this.allies.push(ally);
        }
    }

    clearAllies() {
        for (const ally of this.allies) {
            ally.destroy();
        }
        this.allies = [];
    }

    handleAllyEnemyDefeated(enemy) {
        if (!this.aiSystem.getEnemies().includes(enemy)) return;

        this.score += enemy.points;
        this.particleSystem.createDeathEffect(enemy.position);
        this.audioSystem.playSound('enemyDeath', enemy.position);
        this.createTombstone(enemy.position, enemy.type);
        this.aiSystem.removeEnemy(enemy);

        if (enemy === this.bossEnemy || (this.bossBattleActive && enemy.type === 'boss')) {
            this.completeBossVictory();
        }
    }

    spawnPathEnemies() {
        // Spawn enemies based on player position (along the path to goal)
        // Instead of waves, enemies appear as you progress through each level.
        this.pathSpawnCooldown = Math.max(0, this.pathSpawnCooldown - this.deltaTime);
        if (this.pathSpawnCooldown > 0) return;

        const level = this.levelSystem.getCurrentLevel();
        const playerZ = this.player.position.z;
        const activeEnemies = this.aiSystem.getEnemies()
            .filter((enemy) => enemy !== this.bossEnemy)
            .length;

        // Only spawn if few enemies and player is progressing
        if (
            activeEnemies < level.maxEnemies &&
            playerZ < level.spawnStartZ &&
            playerZ > level.spawnEndZ
        ) {
            const rawSpawnZ = playerZ - level.spawnLeadDistance - Math.random() * 10;
            const spawnZ = Math.max(rawSpawnZ, level.spawnEndZ + 10);
            const spawnX = (Math.random() - 0.5) * level.spawnSpread;
            const spawnPos = new THREE.Vector3(spawnX, level.spawnY || 0, spawnZ);

            this.aiSystem.spawnEnemy(this.pickLevelEnemyType(level), spawnPos);
            this.pathSpawnCooldown = level.theme === 'boss' ? 2.2 : 1.6;
        }
    }

    pickLevelEnemyType(level) {
        const types = level.enemyTypes || ['grunt'];
        return types[Math.floor(Math.random() * types.length)];
    }

    completeBossVictory() {
        if (this.hasWon) return;

        this.levelSystem.markBossDefeated();
        this.bossBattleActive = false;
        this.victory('VICTORY! Storm Shogun defeated!');
    }

    victory(message = 'VICTORY! You reached the shrine!') {
        this.hasWon = true;
        this.uiManager.showNotification(message);
        this.audioSystem.playSound('victory');

        // Celebration pause
        setTimeout(() => {
            this.uiManager.showNotification(`Final Score: ${this.score}`);
        }, 2000);
    }

    handleCombatResults(results) {
        // Handle enemy deaths
        for (const death of results.enemyDeaths) {
            this.score += death.points;
            this.particleSystem.createDeathEffect(death.position);
            this.audioSystem.playSound('enemyDeath', death.position);
            this.createTombstone(death.position, death.enemy.type);

            if (death.enemy === this.bossEnemy || (this.bossBattleActive && death.enemy.type === 'boss')) {
                this.completeBossVictory();
            }
        }

        // Handle player damage
        if (results.playerDamage > 0) {
            this.uiManager.showDamageEffect();
            this.audioSystem.playSound('playerHit');

            if (this.player.health <= 0) {
                this.gameOver();
            }
        }

        // Handle hit effects
        for (const hit of results.hits) {
            this.particleSystem.createHitEffect(hit.position, hit.type);
            this.audioSystem.playSound(hit.type === 'slash' ? 'swordHit' : 'punch', hit.position);
        }
    }

    createTombstone(position, enemyType) {
        const tombstone = new THREE.Group();
        tombstone.position.copy(position);
        tombstone.position.y = 0;

        // Stone material
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x555566,
            roughness: 0.9
        });

        // Base
        const baseGeometry = new THREE.BoxGeometry(0.6, 0.15, 0.4);
        const base = new THREE.Mesh(baseGeometry, stoneMaterial);
        base.position.y = 0.075;
        tombstone.add(base);

        // Tombstone shape varies by enemy type
        let stoneHeight = 0.8;
        if (enemyType === 'boss') {
            stoneHeight = 1.5;
        } else if (enemyType === 'warrior') {
            stoneHeight = 1.0;
        } else if (enemyType === 'assassin') {
            stoneHeight = 0.7;
        }

        // Main stone
        const stoneGeometry = new THREE.BoxGeometry(0.5, stoneHeight, 0.15);
        const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
        stone.position.y = 0.15 + stoneHeight / 2;
        tombstone.add(stone);

        // Rounded top
        const topGeometry = new THREE.SphereGeometry(0.25, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
        const top = new THREE.Mesh(topGeometry, stoneMaterial);
        top.position.y = 0.15 + stoneHeight;
        top.scale.z = 0.3;
        tombstone.add(top);

        // Small cross or symbol for bosses
        if (enemyType === 'boss') {
            const crossMaterial = new THREE.MeshStandardMaterial({
                color: 0x333344,
                roughness: 0.8
            });
            const vertGeometry = new THREE.BoxGeometry(0.08, 0.4, 0.05);
            const vert = new THREE.Mesh(vertGeometry, crossMaterial);
            vert.position.y = stoneHeight + 0.4;
            tombstone.add(vert);

            const horizGeometry = new THREE.BoxGeometry(0.25, 0.08, 0.05);
            const horiz = new THREE.Mesh(horizGeometry, crossMaterial);
            horiz.position.y = stoneHeight + 0.3;
            tombstone.add(horiz);
        }

        // Random slight rotation for variety
        tombstone.rotation.y = (Math.random() - 0.5) * 0.3;

        // Add shadow
        tombstone.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.scene.add(tombstone);
        this.tombstones.push(tombstone);

        // Limit tombstones to prevent performance issues
        if (this.tombstones.length > 50) {
            const oldTombstone = this.tombstones.shift();
            this.scene.remove(oldTombstone);
        }
    }

    pause() {
        this.isPaused = true;
        this.inputManager.unlock();
        document.getElementById('pause-menu').classList.add('visible');
    }

    resume() {
        this.isPaused = false;
        this.inputManager.lock();
        document.getElementById('pause-menu').classList.remove('visible');
    }

    restart() {
        // Reset game state
        this.score = 0;
        this.hasWon = false;
        this.wave = 1;
        this.bossEnemy = null;
        this.bossBattleActive = false;
        this.pathSpawnCooldown = 0;
        this.levelSystem.reset();
        this.applyLevelAtmosphere(this.levelSystem.getCurrentLevel());

        // Reset player
        this.player.reset();

        // Reset companion cat position
        this.companionCat.teleportToPlayer();

        // Clear enemies
        this.aiSystem.clearAllEnemies();

        // Clear allies
        this.clearAllies();

        // Clear tombstones
        for (const tombstone of this.tombstones) {
            this.scene.remove(tombstone);
        }
        this.tombstones = [];

        // Show objective again
        this.uiManager.showNotification('Level 1: Moonlit Castle');

        // Resume
        this.resume();
    }

    gameOver() {
        this.uiManager.showNotification('GAME OVER');
        setTimeout(() => {
            this.pause();
        }, 2000);
    }
}
