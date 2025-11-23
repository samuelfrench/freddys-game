/**
 * Quality Settings System - Performance optimization presets
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
                postProcessing: true,
                shadows: false,
                particleMultiplier: 0.5,
                maxParticles: 500,
                drawDistance: 100,
                enemyUpdateRate: 0.05, // Update every 50ms
                antialias: true,
                pixelRatio: 1.0,
                bloomEnabled: true,
                vignetteEnabled: true,
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
                pixelRatio: window.devicePixelRatio || 1,
                bloomEnabled: true,
                vignetteEnabled: true,
                chromaticAberration: true,
                filmGrain: true,
                castleLOD: 'high',
                maxEnemies: 50
            }
        };

        // Auto-detect best quality
        this.currentPreset = this.detectOptimalQuality();
        this.settings = { ...this.presets[this.currentPreset] };

        this.listeners = [];
    }

    detectOptimalQuality() {
        // Check for WebGL capabilities
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (!gl) {
            return 'low';
        }

        // Check renderer info
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        let renderer = '';
        if (debugInfo) {
            renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
        }

        // Detect VM/software rendering
        const isSoftwareRenderer = renderer.includes('swiftshader') ||
                                   renderer.includes('llvmpipe') ||
                                   renderer.includes('software') ||
                                   renderer.includes('mesa');

        if (isSoftwareRenderer) {
            console.log('Software renderer detected, using low quality');
            return 'low';
        }

        // Check for integrated graphics
        const isIntegrated = renderer.includes('intel') ||
                            renderer.includes('integrated');

        if (isIntegrated) {
            console.log('Integrated graphics detected, using medium quality');
            return 'medium';
        }

        // Check device memory (if available)
        if (navigator.deviceMemory && navigator.deviceMemory < 4) {
            return 'medium';
        }

        // Check hardware concurrency
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
            return 'medium';
        }

        console.log('Dedicated GPU detected, using high quality');
        return 'high';
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
