/**
 * Advanced Renderer with Post-Processing Effects
 */

import * as THREE from 'three';

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
    }

    async init() {
        // Create WebGL renderer with advanced settings
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Tone mapping for HDR-like effects
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Output encoding
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Add to DOM
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Setup custom post-processing
        await this.setupPostProcessing();
    }

    async setupPostProcessing() {
        // Create render targets for multi-pass rendering
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth * Math.min(window.devicePixelRatio, 2),
            window.innerHeight * Math.min(window.devicePixelRatio, 2),
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
        // Custom shader for bloom + vignette + chromatic aberration
        const shader = {
            uniforms: {
                tDiffuse: { value: null },
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uBloomStrength: { value: 0.3 },
                uVignetteStrength: { value: 0.4 },
                uChromaticAberration: { value: 0.002 }
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

                varying vec2 vUv;

                vec3 sampleWithCA(vec2 uv) {
                    vec2 center = vec2(0.5);
                    vec2 dir = uv - center;
                    float dist = length(dir);

                    float r = texture2D(tDiffuse, uv + dir * uChromaticAberration * dist).r;
                    float g = texture2D(tDiffuse, uv).g;
                    float b = texture2D(tDiffuse, uv - dir * uChromaticAberration * dist).b;

                    return vec3(r, g, b);
                }

                vec3 blur(vec2 uv, float radius) {
                    vec3 color = vec3(0.0);
                    float total = 0.0;

                    for (float x = -2.0; x <= 2.0; x += 1.0) {
                        for (float y = -2.0; y <= 2.0; y += 1.0) {
                            vec2 offset = vec2(x, y) * radius / uResolution;
                            float weight = 1.0 - length(vec2(x, y)) / 3.0;
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
                    vec3 blurred = blur(vUv, 3.0);
                    float brightness = dot(blurred, vec3(0.2126, 0.7152, 0.0722));
                    vec3 bloom = blurred * smoothstep(0.5, 1.0, brightness) * uBloomStrength;
                    color += bloom;

                    // Vignette
                    vec2 center = vUv - 0.5;
                    float dist = length(center);
                    float vignette = 1.0 - smoothstep(0.3, 0.9, dist) * uVignetteStrength;
                    color *= vignette;

                    // Film grain
                    float grain = (fract(sin(dot(vUv * uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.03;
                    color += grain;

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

    setSize(width, height) {
        this.renderer.setSize(width, height);
        this.renderTarget.setSize(
            width * Math.min(window.devicePixelRatio, 2),
            height * Math.min(window.devicePixelRatio, 2)
        );
        this.postProcessQuad.material.uniforms.uResolution.value.set(width, height);
    }

    render(time) {
        if (this.postProcessingEnabled) {
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
        this.renderTarget.dispose();
        this.postProcessQuad.geometry.dispose();
        this.postProcessQuad.material.dispose();
    }
}
