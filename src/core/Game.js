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
import { Player } from '../entities/Player.js';
import { NinjaCastle } from '../entities/NinjaCastle.js';
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
        this.uiManager = null;
        this.minimap = null;

        // Game entities
        this.player = null;
        this.castle = null;
        this.enemies = [];

        // Game state
        this.score = 0;
        this.wave = 1;
    }

    async init() {
        this.updateLoadingProgress(5, 'Creating scene...');

        // Create Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a15);
        this.scene.fog = new THREE.FogExp2(0x0a0a15, 0.015);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

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

        // Start first wave
        this.waveSystem.startWave(1);

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

        // Update physics
        this.physicsSystem.update(this.deltaTime);

        // Update AI
        this.aiSystem.update(this.deltaTime, this.player);

        // Update combat
        const combatResults = this.combatSystem.update(this.deltaTime);
        this.handleCombatResults(combatResults);

        // Update particles
        this.particleSystem.update(this.deltaTime);

        // Update wave system
        this.waveSystem.update(this.deltaTime);
        if (this.waveSystem.isWaveComplete()) {
            this.nextWave();
        }

        // Update UI
        this.uiManager.update();

        // Update minimap
        this.minimap.update();

        // Update castle animations and frustum culling
        this.castle.update(this.deltaTime, this.elapsedTime, this.camera);
    }

    handleCombatResults(results) {
        // Handle enemy deaths
        for (const death of results.enemyDeaths) {
            this.score += death.points;
            this.particleSystem.createDeathEffect(death.position);
            this.audioSystem.playSound('enemyDeath', death.position);
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

    nextWave() {
        this.wave++;
        this.waveSystem.startWave(this.wave);
        this.uiManager.showNotification(`Wave ${this.wave}`);
        this.audioSystem.playSound('waveStart');
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
        this.wave = 1;

        // Reset player
        this.player.reset();

        // Clear enemies
        this.aiSystem.clearAllEnemies();

        // Start fresh
        this.waveSystem.startWave(1);

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
