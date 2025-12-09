/**
 * Advanced Renderer with Post-Processing Effects and Quality Settings
 * With WebGL compatibility fixes and error handling
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
        this.postProcessingFailed = false; // Track if post-processing setup failed

        // Shader passes
        this.bloomPass = null;
        this.fxaaPass = null;

        // Quality settings
        this.settings = qualitySettings.settings;

        // Debug logging for remote troubleshooting
        this.debugLog('Renderer initializing...');

        // Listen for quality changes
        qualitySettings.onChange((newSettings) => {
            this.applyQualitySettings(newSettings);
        });
    }

    debugLog(message, data = null) {
        const timestamp = new Date().toISOString();
        if (data) {
            console.log(`[Renderer ${timestamp}] ${message}`, data);
        } else {
            console.log(`[Renderer ${timestamp}] ${message}`);
        }
    }

    async init() {
        const settings = qualitySettings.settings;

        // Check WebGL support first
        if (!this.checkWebGLSupport()) {
            throw new Error('WebGL is not supported on this device');
        }

        this.debugLog('Creating WebGL renderer with settings:', {
            antialias: settings.antialias,
            pixelRatio: settings.pixelRatio,
            postProcessing: settings.postProcessing
        });

        // Create WebGL renderer with quality-based settings
        // Try WebGL2 first, fallback to WebGL1
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('webgl2');
        const isWebGL2 = !!context;

        this.debugLog(`WebGL version: ${isWebGL2 ? 'WebGL2' : 'WebGL1'}`);

        try {
            this.renderer = new THREE.WebGLRenderer({
                antialias: settings.antialias,
                powerPreference: 'high-performance',
                stencil: false,
                failIfMajorPerformanceCaveat: false // Don't fail on software renderers
            });
        } catch (e) {
            this.debugLog('WebGLRenderer creation failed, trying with basic settings', e);
            // Fallback with minimal settings
            this.renderer = new THREE.WebGLRenderer({
                antialias: false,
                powerPreference: 'default'
            });
        }

        // Verify renderer was created successfully
        if (!this.renderer || !this.renderer.domElement) {
            throw new Error('Failed to create WebGL renderer');
        }

        // Check for context loss
        this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.debugLog('WebGL context lost!');
            this.handleContextLost();
        });

        this.renderer.domElement.addEventListener('webglcontextrestored', () => {
            this.debugLog('WebGL context restored');
            this.handleContextRestored();
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(settings.pixelRatio, 2));

        // Log GPU info for debugging
        this.logGPUInfo();

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

        // Setup custom post-processing with error handling
        if (settings.postProcessing) {
            try {
                await this.setupPostProcessing();
                this.debugLog('Post-processing setup successful');
            } catch (e) {
                this.debugLog('Post-processing setup failed, disabling', e);
                this.postProcessingFailed = true;
                this.postProcessingEnabled = false;
            }
        }

        this.postProcessingEnabled = settings.postProcessing && !this.postProcessingFailed;
        this.debugLog(`Final post-processing state: ${this.postProcessingEnabled}`);
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                this.debugLog('WebGL not supported');
                return false;
            }
            this.debugLog('WebGL supported');
            return true;
        } catch (e) {
            this.debugLog('WebGL check failed', e);
            return false;
        }
    }

    logGPUInfo() {
        try {
            const gl = this.renderer.getContext();
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                this.debugLog('GPU Info:', { vendor, renderer });
            }

            // Log important WebGL parameters
            this.debugLog('WebGL Parameters:', {
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
                maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
            });
        } catch (e) {
            this.debugLog('Could not get GPU info', e);
        }
    }

    handleContextLost() {
        // Disable rendering until context is restored
        this.postProcessingEnabled = false;
    }

    handleContextRestored() {
        // Re-setup post-processing
        if (this.settings.postProcessing && !this.postProcessingFailed) {
            this.setupPostProcessing().catch(e => {
                this.debugLog('Failed to restore post-processing', e);
            });
        }
    }

    async setupPostProcessing() {
        const pixelRatio = qualitySettings.get('pixelRatio') || 1;

        this.debugLog('Setting up post-processing...');

        // Create render targets for multi-pass rendering
        try {
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

            // Verify render target was created
            if (!this.renderTarget || !this.renderTarget.texture) {
                throw new Error('Failed to create render target');
            }
            this.debugLog('Render target created successfully');
        } catch (e) {
            this.debugLog('Render target creation failed', e);
            throw e;
        }

        // Create post-processing quad with shader error handling
        try {
            this.postProcessQuad = this.createPostProcessQuad();

            // Check if shader compiled successfully
            if (this.postProcessQuad && this.postProcessQuad.material) {
                // Force shader compilation to catch errors early
                this.renderer.compile(new THREE.Scene().add(this.postProcessQuad.clone()),
                    new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));

                // Check for shader errors
                const gl = this.renderer.getContext();
                const error = gl.getError();
                if (error !== gl.NO_ERROR) {
                    this.debugLog('WebGL error after shader compilation:', error);
                }
            }
        } catch (e) {
            this.debugLog('Post-process quad creation failed', e);
            throw e;
        }

        this.postProcessScene = new THREE.Scene();
        this.postProcessCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.postProcessScene.add(this.postProcessQuad);

        this.debugLog('Post-processing setup complete');
    }

    createPostProcessQuad() {
        const settings = qualitySettings.settings;

        this.debugLog('Creating post-process shader...');

        // Custom shader for bloom + vignette + chromatic aberration
        // Using precision qualifiers for better cross-platform compatibility
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
                precision highp float;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;

                uniform sampler2D tDiffuse;
                uniform float uTime;
                uniform vec2 uResolution;
                uniform float uBloomStrength;
                uniform float uVignetteStrength;
                uniform float uChromaticAberration;
                uniform float uFilmGrain;

                varying vec2 vUv;

                void main() {
                    // Base color sample - simple and safe
                    vec4 texColor = texture2D(tDiffuse, vUv);
                    vec3 color = texColor.rgb;

                    // Chromatic aberration (simplified for compatibility)
                    if (uChromaticAberration > 0.0) {
                        vec2 dir = vUv - vec2(0.5);
                        float dist = length(dir);
                        float caOffset = uChromaticAberration * dist;

                        float r = texture2D(tDiffuse, vUv + dir * caOffset).r;
                        float b = texture2D(tDiffuse, vUv - dir * caOffset).b;
                        color = vec3(r, color.g, b);
                    }

                    // Simple bloom (bright areas glow) - simplified 5-tap blur
                    if (uBloomStrength > 0.0) {
                        vec2 texelSize = vec2(1.0) / uResolution;
                        vec3 blurred = color;
                        blurred += texture2D(tDiffuse, vUv + texelSize * vec2(-2.0, 0.0)).rgb;
                        blurred += texture2D(tDiffuse, vUv + texelSize * vec2(2.0, 0.0)).rgb;
                        blurred += texture2D(tDiffuse, vUv + texelSize * vec2(0.0, -2.0)).rgb;
                        blurred += texture2D(tDiffuse, vUv + texelSize * vec2(0.0, 2.0)).rgb;
                        blurred *= 0.2;

                        float brightness = dot(blurred, vec3(0.2126, 0.7152, 0.0722));
                        float bloomMask = smoothstep(0.5, 1.0, brightness);
                        color += blurred * bloomMask * uBloomStrength;
                    }

                    // Vignette - safe calculation avoiding division issues
                    if (uVignetteStrength > 0.0) {
                        vec2 centered = vUv - vec2(0.5);
                        float dist = length(centered);
                        float vignette = 1.0 - smoothstep(0.3, 0.9, dist) * uVignetteStrength;
                        color *= vignette;
                    }

                    // Film grain - using simpler noise function
                    if (uFilmGrain > 0.0) {
                        float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
                        float grain = (noise - 0.5) * uFilmGrain;
                        color += vec3(grain);
                    }

                    // Subtle color grading
                    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
                    vec3 shadows = vec3(0.0, 0.05, 0.1) * (1.0 - luminance);
                    vec3 highlights = vec3(0.1, 0.05, 0.0) * luminance;
                    color = color + shadows + highlights;

                    // Clamp to valid range
                    color = clamp(color, 0.0, 1.0);

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        };

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial(shader);

        // Enable shader error checking
        material.onBeforeCompile = (shader) => {
            this.debugLog('Shader compiling...');
        };

        const mesh = new THREE.Mesh(geometry, material);

        this.debugLog('Post-process quad created');
        return mesh;
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
        try {
            if (this.postProcessingEnabled && this.renderTarget && this.postProcessQuad && !this.postProcessingFailed) {
                // Render scene to texture
                this.renderer.setRenderTarget(this.renderTarget);
                this.renderer.render(this.scene, this.camera);

                // Apply post-processing
                this.renderer.setRenderTarget(null);
                this.postProcessQuad.material.uniforms.tDiffuse.value = this.renderTarget.texture;
                this.postProcessQuad.material.uniforms.uTime.value = time;
                this.renderer.render(this.postProcessScene, this.postProcessCamera);
            } else {
                // Direct render without post-processing
                this.renderer.setRenderTarget(null);
                this.renderer.render(this.scene, this.camera);
            }
        } catch (e) {
            // If rendering fails, try direct render as fallback
            this.debugLog('Render error, falling back to direct render', e);
            this.postProcessingFailed = true;
            this.postProcessingEnabled = false;
            try {
                this.renderer.setRenderTarget(null);
                this.renderer.render(this.scene, this.camera);
            } catch (e2) {
                this.debugLog('Direct render also failed', e2);
            }
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
