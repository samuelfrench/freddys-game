/**
 * Advanced Renderer with Post-Processing Effects and Quality Settings
 */

import * as THREE from 'three';
import { qualitySettings } from '../systems/QualitySettings.js';

export class Renderer {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = null;
        this.composer = null;
        this.renderTarget = null;
        this.postProcessingEnabled = true;

        // Shader passes
        this.bloomPass = null;
        this.fxaaPass = null;

        // Quality settings
        this.settings = qualitySettings.settings;

        // Listen for quality changes
        qualitySettings.onChange((newSettings) => {
            this.applyQualitySettings(newSettings);
        });
    }

    async init() {
        const settings = qualitySettings.settings;

        // Create WebGL renderer with quality-based settings
        this.renderer = new THREE.WebGLRenderer({
            antialias: settings.antialias,
            powerPreference: 'high-performance',
            stencil: false
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(settings.pixelRatio, 2));

        // Enable shadows based on quality
        this.renderer.shadowMap.enabled = settings.shadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Tone mapping for HDR-like effects
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 4.0;

        // Output encoding
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Add to DOM
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Setup custom post-processing
        if (settings.postProcessing) {
            await this.setupPostProcessing();
        }

        this.postProcessingEnabled = settings.postProcessing;
    }

    async setupPostProcessing() {
        const pixelRatio = qualitySettings.get('pixelRatio') || 1;

        // Create render targets for multi-pass rendering
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth * Math.min(pixelRatio, 2),
            window.innerHeight * Math.min(pixelRatio, 2),
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                colorSpace: THREE.SRGBColorSpace
            }
        );

        // Create post-processing quad
        this.postProcessQuad = this.createPostProcessQuad();
        this.postProcessScene = new THREE.Scene();
        this.postProcessCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.postProcessScene.add(this.postProcessQuad);
    }

    createPostProcessQuad() {
        const settings = qualitySettings.settings;

        // Custom shader for bloom + vignette + chromatic aberration
        const shader = {
            uniforms: {
                tDiffuse: { value: null },
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uBloomStrength: { value: settings.bloomEnabled ? 0.3 : 0.0 },
                uVignetteStrength: { value: settings.vignetteEnabled ? 0.1 : 0.0 },
                uChromaticAberration: { value: settings.chromaticAberration ? 0.002 : 0.0 },
                uFilmGrain: { value: settings.filmGrain ? 0.03 : 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uTime;
                uniform vec2 uResolution;
                uniform float uBloomStrength;
                uniform float uVignetteStrength;
                uniform float uChromaticAberration;
                uniform float uFilmGrain;

                varying vec2 vUv;

                vec3 sampleWithCA(vec2 uv) {
                    if (uChromaticAberration <= 0.0) {
                        return texture2D(tDiffuse, uv).rgb;
                    }
                    vec2 center = vec2(0.5);
                    vec2 dir = uv - center;
                    float dist = length(dir);

                    float r = texture2D(tDiffuse, uv + dir * uChromaticAberration * dist).r;
                    float g = texture2D(tDiffuse, uv).g;
                    float b = texture2D(tDiffuse, uv - dir * uChromaticAberration * dist).b;

                    return vec3(r, g, b);
                }

                vec3 blur(vec2 uv, float radius) {
                    if (uBloomStrength <= 0.0) {
                        return texture2D(tDiffuse, uv).rgb;
                    }
                    vec3 color = vec3(0.0);
                    float total = 0.0;

                    // Reduced blur samples for performance
                    for (float x = -1.0; x <= 1.0; x += 1.0) {
                        for (float y = -1.0; y <= 1.0; y += 1.0) {
                            vec2 offset = vec2(x, y) * radius / uResolution;
                            float weight = 1.0 - length(vec2(x, y)) / 2.0;
                            color += texture2D(tDiffuse, uv + offset).rgb * weight;
                            total += weight;
                        }
                    }

                    return color / total;
                }

                void main() {
                    // Sample with chromatic aberration
                    vec3 color = sampleWithCA(vUv);

                    // Simple bloom (bright areas glow)
                    if (uBloomStrength > 0.0) {
                        vec3 blurred = blur(vUv, 2.0);
                        float brightness = dot(blurred, vec3(0.2126, 0.7152, 0.0722));
                        vec3 bloom = blurred * smoothstep(0.5, 1.0, brightness) * uBloomStrength;
                        color += bloom;
                    }

                    // Vignette
                    if (uVignetteStrength > 0.0) {
                        vec2 center = vUv - 0.5;
                        float dist = length(center);
                        float vignette = 1.0 - smoothstep(0.3, 0.9, dist) * uVignetteStrength;
                        color *= vignette;
                    }

                    // Film grain
                    if (uFilmGrain > 0.0) {
                        float grain = (fract(sin(dot(vUv * uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uFilmGrain;
                        color += grain;
                    }

                    // Color grading - slight teal shadows, orange highlights
                    vec3 shadows = vec3(0.0, 0.05, 0.1);
                    vec3 highlights = vec3(0.1, 0.05, 0.0);
                    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
                    color = mix(color + shadows * (1.0 - luminance), color + highlights * luminance, luminance);

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        };

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial(shader);

        return new THREE.Mesh(geometry, material);
    }

    applyQualitySettings(settings) {
        this.settings = settings;
        this.postProcessingEnabled = settings.postProcessing;

        if (this.renderer) {
            this.renderer.setPixelRatio(Math.min(settings.pixelRatio, 2));
            this.renderer.shadowMap.enabled = settings.shadows;
        }

        if (this.postProcessQuad && this.postProcessQuad.material) {
            const uniforms = this.postProcessQuad.material.uniforms;
            uniforms.uBloomStrength.value = settings.bloomEnabled ? 0.3 : 0.0;
            uniforms.uVignetteStrength.value = settings.vignetteEnabled ? 0.1 : 0.0;
            uniforms.uChromaticAberration.value = settings.chromaticAberration ? 0.002 : 0.0;
            uniforms.uFilmGrain.value = settings.filmGrain ? 0.03 : 0.0;
        }

        // Re-setup post processing if needed
        if (settings.postProcessing && !this.renderTarget) {
            this.setupPostProcessing();
        }
    }

    setSize(width, height) {
        const pixelRatio = qualitySettings.get('pixelRatio') || 1;

        this.renderer.setSize(width, height);
        if (this.renderTarget) {
            this.renderTarget.setSize(
                width * Math.min(pixelRatio, 2),
                height * Math.min(pixelRatio, 2)
            );
        }
        if (this.postProcessQuad) {
            this.postProcessQuad.material.uniforms.uResolution.value.set(width, height);
        }
    }

    render(time) {
        if (this.postProcessingEnabled && this.renderTarget) {
            // Render scene to texture
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.render(this.scene, this.camera);

            // Apply post-processing
            this.renderer.setRenderTarget(null);
            this.postProcessQuad.material.uniforms.tDiffuse.value = this.renderTarget.texture;
            this.postProcessQuad.material.uniforms.uTime.value = time;
            this.renderer.render(this.postProcessScene, this.postProcessCamera);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        this.renderer.dispose();
        if (this.renderTarget) {
            this.renderTarget.dispose();
        }
        if (this.postProcessQuad) {
            this.postProcessQuad.geometry.dispose();
            this.postProcessQuad.material.dispose();
        }
    }
}
