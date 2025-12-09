/**
 * Quality Settings System - Performance optimization presets
 * With improved compatibility detection
 */

export class QualitySettings {
    constructor() {
        this.presets = {
            low: {
                name: 'Low',
                postProcessing: false,
                shadows: false,
                particleMultiplier: 0.25,
                maxParticles: 100,
                drawDistance: 50,
                enemyUpdateRate: 0.1, // Update every 100ms
                antialias: false,
                pixelRatio: 0.75,
                bloomEnabled: false,
                vignetteEnabled: false,
                chromaticAberration: false,
                filmGrain: false,
                castleLOD: 'low',
                maxEnemies: 10
            },
            medium: {
                name: 'Medium',
                postProcessing: false, // Disabled by default for safety
                shadows: false,
                particleMultiplier: 0.5,
                maxParticles: 500,
                drawDistance: 100,
                enemyUpdateRate: 0.05, // Update every 50ms
                antialias: true,
                pixelRatio: 1.0,
                bloomEnabled: false,
                vignetteEnabled: false,
                chromaticAberration: false,
                filmGrain: false,
                castleLOD: 'medium',
                maxEnemies: 20
            },
            high: {
                name: 'High',
                postProcessing: true,
                shadows: true,
                particleMultiplier: 1.0,
                maxParticles: 2000,
                drawDistance: 200,
                enemyUpdateRate: 0.016, // Update every frame
                antialias: true,
                pixelRatio: Math.min(window.devicePixelRatio || 1, 2), // Cap at 2
                bloomEnabled: true,
                vignetteEnabled: true,
                chromaticAberration: true,
                filmGrain: true,
                castleLOD: 'high',
                maxEnemies: 50
            }
        };

        // Auto-detect best quality - default to medium for safety
        this.currentPreset = this.detectOptimalQuality();
        this.settings = { ...this.presets[this.currentPreset] };

        this.listeners = [];

        console.log(`[QualitySettings] Initialized with preset: ${this.currentPreset}`);
    }

    detectOptimalQuality() {
        console.log('[QualitySettings] Detecting optimal quality...');

        // Check for WebGL capabilities
        let canvas;
        let gl;
        try {
            canvas = document.createElement('canvas');
            gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        } catch (e) {
            console.log('[QualitySettings] WebGL context creation failed', e);
            return 'low';
        }

        if (!gl) {
            console.log('[QualitySettings] No WebGL support');
            return 'low';
        }

        // Check renderer info
        let renderer = '';
        let vendor = '';
        try {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
                vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL).toLowerCase();
            }
            console.log(`[QualitySettings] GPU: ${vendor} - ${renderer}`);
        } catch (e) {
            console.log('[QualitySettings] Could not get GPU info');
        }

        // Detect problematic configurations
        const isSoftwareRenderer = renderer.includes('swiftshader') ||
                                   renderer.includes('llvmpipe') ||
                                   renderer.includes('software') ||
                                   renderer.includes('mesa') ||
                                   renderer.includes('microsoft basic');

        if (isSoftwareRenderer) {
            console.log('[QualitySettings] Software renderer detected, using low quality');
            return 'low';
        }

        // Detect Apple GPU (macOS) - can have shader compatibility issues
        const isAppleGPU = renderer.includes('apple') ||
                          vendor.includes('apple') ||
                          renderer.includes('m1') ||
                          renderer.includes('m2') ||
                          renderer.includes('m3');

        if (isAppleGPU) {
            console.log('[QualitySettings] Apple GPU detected, using medium quality (no post-processing)');
            return 'medium';
        }

        // Check for integrated graphics
        const isIntegrated = renderer.includes('intel') ||
                            renderer.includes('integrated') ||
                            renderer.includes('uhd') ||
                            renderer.includes('iris');

        if (isIntegrated) {
            console.log('[QualitySettings] Integrated graphics detected, using medium quality');
            return 'medium';
        }

        // Check for mobile/low-power GPUs
        const isMobileGPU = renderer.includes('mali') ||
                          renderer.includes('adreno') ||
                          renderer.includes('powervr') ||
                          renderer.includes('tegra');

        if (isMobileGPU) {
            console.log('[QualitySettings] Mobile GPU detected, using medium quality');
            return 'medium';
        }

        // Check device memory (if available)
        if (navigator.deviceMemory && navigator.deviceMemory < 4) {
            console.log('[QualitySettings] Low memory detected, using medium quality');
            return 'medium';
        }

        // Check hardware concurrency
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
            console.log('[QualitySettings] Low CPU cores detected, using medium quality');
            return 'medium';
        }

        // Default to medium for unknown configs to be safe
        // Users can manually switch to high if they want
        console.log('[QualitySettings] Using medium quality by default (switch to High manually for effects)');
        return 'medium';
    }

    setQuality(preset) {
        if (!this.presets[preset]) {
            console.warn(`Unknown quality preset: ${preset}`);
            return;
        }

        this.currentPreset = preset;
        this.settings = { ...this.presets[preset] };

        // Notify listeners
        this.listeners.forEach(callback => callback(this.settings));

        // Save preference
        try {
            localStorage.setItem('freddys-game-quality', preset);
        } catch (e) {
            // localStorage not available
        }

        console.log(`Quality set to: ${preset}`);
    }

    loadSavedQuality() {
        try {
            const saved = localStorage.getItem('freddys-game-quality');
            if (saved && this.presets[saved]) {
                this.setQuality(saved);
                return true;
            }
        } catch (e) {
            // localStorage not available
        }
        return false;
    }

    onChange(callback) {
        this.listeners.push(callback);
    }

    get(key) {
        return this.settings[key];
    }

    getPresetName() {
        return this.presets[this.currentPreset].name;
    }

    cycleQuality() {
        const presets = ['low', 'medium', 'high'];
        const currentIndex = presets.indexOf(this.currentPreset);
        const nextIndex = (currentIndex + 1) % presets.length;
        this.setQuality(presets[nextIndex]);
        return this.presets[presets[nextIndex]].name;
    }
}

// Singleton instance
export const qualitySettings = new QualitySettings();
