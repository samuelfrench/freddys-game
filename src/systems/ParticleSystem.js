/**
 * Particle System - GPU-accelerated particle effects with quality settings
 */

import * as THREE from 'three';
import { qualitySettings } from './QualitySettings.js';

class ParticleEmitter {
    constructor(scene, config) {
        this.scene = scene;
        this.baseConfig = {
            maxParticles: config.maxParticles || 100,
            particleSize: config.particleSize || 0.1,
            color: config.color || 0xffffff,
            lifetime: config.lifetime || 1,
            velocity: config.velocity || new THREE.Vector3(0, 1, 0),
            velocitySpread: config.velocitySpread || 0.5,
            gravity: config.gravity || 0,
            fade: config.fade !== false,
            shrink: config.shrink || false,
            emissive: config.emissive || false
        };

        // Apply quality multiplier
        const multiplier = qualitySettings.get('particleMultiplier') || 1;
        const maxAllowed = qualitySettings.get('maxParticles') || 2000;

        this.config = {
            ...this.baseConfig,
            maxParticles: Math.min(
                Math.floor(this.baseConfig.maxParticles * multiplier),
                maxAllowed
            )
        };

        this.particles = [];
        this.geometry = null;
        this.material = null;
        this.mesh = null;
        this.active = true;

        this.init();
    }

    init() {
        this.geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(this.config.maxParticles * 3);
        const colors = new Float32Array(this.config.maxParticles * 4);
        const sizes = new Float32Array(this.config.maxParticles);

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('particleColor', new THREE.BufferAttribute(colors, 4));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Custom shader material for better particle rendering
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: this.createParticleTexture() }
            },
            vertexShader: `
                attribute float size;
                attribute vec4 particleColor;
                varying vec4 vColor;

                void main() {
                    vColor = particleColor;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec4 vColor;

                void main() {
                    gl_FragColor = vColor * texture2D(pointTexture, gl_PointCoord);
                    if (gl_FragColor.a < 0.1) discard;
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });

        this.mesh = new THREE.Points(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);
    }

    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32; // Reduced from 64 for performance
        canvas.height = 32;

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    emit(position, count = 1, overrides = {}) {
        // Apply quality multiplier to emission count
        const multiplier = qualitySettings.get('particleMultiplier') || 1;
        const adjustedCount = Math.max(1, Math.floor(count * multiplier));

        const color = new THREE.Color(overrides.color || this.config.color);

        for (let i = 0; i < adjustedCount; i++) {
            if (this.particles.length >= this.config.maxParticles) {
                // Remove oldest particle
                this.particles.shift();
            }

            const velocity = this.config.velocity.clone();
            velocity.x += (Math.random() - 0.5) * this.config.velocitySpread;
            velocity.y += (Math.random() - 0.5) * this.config.velocitySpread;
            velocity.z += (Math.random() - 0.5) * this.config.velocitySpread;

            this.particles.push({
                position: position.clone().add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 0.5,
                        (Math.random() - 0.5) * 0.5,
                        (Math.random() - 0.5) * 0.5
                    )
                ),
                velocity: velocity,
                life: overrides.lifetime || this.config.lifetime,
                maxLife: overrides.lifetime || this.config.lifetime,
                size: overrides.size || this.config.particleSize,
                color: color
            });
        }
    }

    update(deltaTime) {
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.particleColor.array;
        const sizes = this.geometry.attributes.size.array;

        let aliveCount = 0;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Update life
            particle.life -= deltaTime;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            // Apply gravity
            particle.velocity.y -= this.config.gravity * deltaTime;

            // Update position
            particle.position.addScaledVector(particle.velocity, deltaTime);

            // Calculate life ratio
            const lifeRatio = particle.life / particle.maxLife;

            // Update buffer data
            const idx = aliveCount * 3;
            const colorIdx = aliveCount * 4;

            positions[idx] = particle.position.x;
            positions[idx + 1] = particle.position.y;
            positions[idx + 2] = particle.position.z;

            colors[colorIdx] = particle.color.r;
            colors[colorIdx + 1] = particle.color.g;
            colors[colorIdx + 2] = particle.color.b;
            colors[colorIdx + 3] = this.config.fade ? lifeRatio : 1;

            sizes[aliveCount] = this.config.shrink ?
                particle.size * lifeRatio :
                particle.size;

            aliveCount++;
        }

        // Clear remaining buffer slots
        for (let i = aliveCount; i < this.config.maxParticles; i++) {
            sizes[i] = 0;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.particleColor.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;

        // Set draw range
        this.geometry.setDrawRange(0, aliveCount);
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.geometry.dispose();
        this.material.dispose();
    }
}

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.emitters = new Map();

        // Create pre-configured emitters
        this.createEmitters();

        // Listen for quality changes
        qualitySettings.onChange(() => {
            this.recreateEmitters();
        });
    }

    recreateEmitters() {
        // Dispose old emitters
        for (const emitter of this.emitters.values()) {
            emitter.dispose();
        }
        this.emitters.clear();

        // Create new emitters with updated settings
        this.createEmitters();
    }

    createEmitters() {
        // Blood/hit effect
        this.emitters.set('blood', new ParticleEmitter(this.scene, {
            maxParticles: 200,
            particleSize: 0.15,
            color: 0xff0000,
            lifetime: 0.5,
            velocity: new THREE.Vector3(0, 2, 0),
            velocitySpread: 3,
            gravity: 15,
            fade: true
        }));

        // Slash effect
        this.emitters.set('slash', new ParticleEmitter(this.scene, {
            maxParticles: 100,
            particleSize: 0.2,
            color: 0xccccff,
            lifetime: 0.3,
            velocity: new THREE.Vector3(0, 0.5, 0),
            velocitySpread: 2,
            gravity: 0,
            fade: true,
            shrink: true
        }));

        // Fire effect
        this.emitters.set('fire', new ParticleEmitter(this.scene, {
            maxParticles: 300,
            particleSize: 0.3,
            color: 0xff6600,
            lifetime: 0.8,
            velocity: new THREE.Vector3(0, 3, 0),
            velocitySpread: 1.5,
            gravity: -2,
            fade: true,
            emissive: true
        }));

        // Spin effect
        this.emitters.set('spin', new ParticleEmitter(this.scene, {
            maxParticles: 150,
            particleSize: 0.15,
            color: 0x00ffff,
            lifetime: 0.5,
            velocity: new THREE.Vector3(0, 0, 0),
            velocitySpread: 5,
            gravity: 0,
            fade: true
        }));

        // Dash effect
        this.emitters.set('dash', new ParticleEmitter(this.scene, {
            maxParticles: 100,
            particleSize: 0.1,
            color: 0x8800ff,
            lifetime: 0.4,
            velocity: new THREE.Vector3(0, 0, 0),
            velocitySpread: 1,
            gravity: 0,
            fade: true,
            shrink: true
        }));

        // Death effect
        this.emitters.set('death', new ParticleEmitter(this.scene, {
            maxParticles: 200,
            particleSize: 0.25,
            color: 0x440044,
            lifetime: 1,
            velocity: new THREE.Vector3(0, 5, 0),
            velocitySpread: 4,
            gravity: 8,
            fade: true
        }));

        // Spark effect
        this.emitters.set('spark', new ParticleEmitter(this.scene, {
            maxParticles: 100,
            particleSize: 0.08,
            color: 0xffff00,
            lifetime: 0.3,
            velocity: new THREE.Vector3(0, 1, 0),
            velocitySpread: 4,
            gravity: 5,
            fade: true
        }));
    }

    createHitEffect(position, type) {
        switch (type) {
            case 'slash':
                this.emitters.get('slash').emit(position, 20);
                this.emitters.get('blood').emit(position, 15);
                this.emitters.get('spark').emit(position, 10);
                break;

            case 'spin':
                // Ring of particles - reduced iterations on low quality
                const segments = qualitySettings.get('particleMultiplier') < 0.5 ? 6 : 12;
                for (let i = 0; i < segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    const offset = new THREE.Vector3(
                        Math.cos(angle) * 2,
                        0.5,
                        Math.sin(angle) * 2
                    );
                    this.emitters.get('spin').emit(position.clone().add(offset), 5);
                }
                break;

            case 'fire':
                this.emitters.get('fire').emit(position, 50);
                break;

            case 'dash':
                this.emitters.get('dash').emit(position, 30);
                break;

            case 'enemyAttack':
                this.emitters.get('blood').emit(position, 10);
                break;

            default:
                this.emitters.get('spark').emit(position, 15);
        }
    }

    createDeathEffect(position) {
        this.emitters.get('death').emit(position, 50);
        this.emitters.get('blood').emit(position, 30);

        // Upward burst - reduced on low quality
        const burstCount = qualitySettings.get('particleMultiplier') < 0.5 ? 2 : 5;
        for (let i = 0; i < burstCount; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                i * 0.3,
                (Math.random() - 0.5) * 2
            );
            this.emitters.get('spark').emit(position.clone().add(offset), 5);
        }
    }

    update(deltaTime) {
        for (const emitter of this.emitters.values()) {
            emitter.update(deltaTime);
        }
    }

    dispose() {
        for (const emitter of this.emitters.values()) {
            emitter.dispose();
        }
        this.emitters.clear();
    }
}
