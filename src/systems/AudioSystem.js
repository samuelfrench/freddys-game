/**
 * Audio System - Procedural audio and sound effects using Web Audio API
 */

export class AudioSystem {
    constructor(camera) {
        this.camera = camera;
        this.context = null;
        this.masterGain = null;
        this.sounds = new Map();
        this.ambientSource = null;

        this.initialized = false;
    }

    async init() {
        // Create audio context (requires user interaction to start)
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
        this.masterGain.gain.value = 0.5;

        // Create sound generators
        this.createSoundGenerators();

        // Resume audio context on first user interaction
        const resumeAudio = () => {
            if (this.context.state === 'suspended') {
                this.context.resume();
            }
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
        };

        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);

        this.initialized = true;
    }

    createSoundGenerators() {
        // Sword hit sound
        this.sounds.set('swordHit', () => this.createMetallicHit());

        // Punch sound
        this.sounds.set('punch', () => this.createPunchSound());

        // Enemy death
        this.sounds.set('enemyDeath', () => this.createDeathSound());

        // Player hit
        this.sounds.set('playerHit', () => this.createPlayerHitSound());

        // Wave start
        this.sounds.set('waveStart', () => this.createWaveStartSound());

        // Footstep
        this.sounds.set('footstep', () => this.createFootstepSound());
    }

    createMetallicHit() {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.context.currentTime + 0.1);

        filter.type = 'highpass';
        filter.frequency.value = 1000;

        gain.gain.setValueAtTime(0.3, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.15);

        // Add noise burst
        this.addNoiseBurst(0.1, 0.08, 2000);
    }

    createPunchSound() {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.1);

        gain.gain.setValueAtTime(0.4, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.1);

        // Low thud
        this.addNoiseBurst(0.15, 0.05, 200);
    }

    createDeathSound() {
        // Descending tone
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.5);

        gain.gain.setValueAtTime(0.2, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.5);

        // Burst
        this.addNoiseBurst(0.3, 0.2, 500);
    }

    createPlayerHitSound() {
        // Sharp impact
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.context.currentTime + 0.1);

        filter.type = 'lowpass';
        filter.frequency.value = 800;

        gain.gain.setValueAtTime(0.3, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.15);
    }

    createWaveStartSound() {
        // Epic horn-like sound
        const oscillators = [];

        for (let i = 0; i < 3; i++) {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150 * (i + 1), this.context.currentTime);

            gain.gain.setValueAtTime(0, this.context.currentTime);
            gain.gain.linearRampToValueAtTime(0.15 / (i + 1), this.context.currentTime + 0.1);
            gain.gain.linearRampToValueAtTime(0.1 / (i + 1), this.context.currentTime + 0.5);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 1);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start();
            osc.stop(this.context.currentTime + 1);

            oscillators.push(osc);
        }
    }

    createFootstepSound() {
        this.addNoiseBurst(0.05, 0.03, 300);
    }

    addNoiseBurst(volume, duration, filterFreq) {
        const bufferSize = this.context.sampleRate * duration;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        source.buffer = buffer;

        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;

        gain.gain.setValueAtTime(volume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        source.start();
    }

    playSound(soundName, position = null) {
        if (!this.initialized || this.context.state !== 'running') return;

        const generator = this.sounds.get(soundName);
        if (generator) {
            generator();
        }
    }

    playAmbient() {
        if (!this.initialized) return;

        // Create ambient wind/atmosphere
        this.createAmbientLoop();
    }

    createAmbientLoop() {
        const createAmbientNoise = () => {
            if (!this.initialized || this.context.state !== 'running') return;

            const duration = 4;
            const bufferSize = this.context.sampleRate * duration;
            const buffer = this.context.createBuffer(2, bufferSize, this.context.sampleRate);

            // Create stereo noise
            for (let channel = 0; channel < 2; channel++) {
                const data = buffer.getChannelData(channel);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * 0.1;
                }
            }

            const source = this.context.createBufferSource();
            const gain = this.context.createGain();
            const filter = this.context.createBiquadFilter();

            source.buffer = buffer;
            source.loop = false;

            filter.type = 'lowpass';
            filter.frequency.value = 400;

            // Fade in and out
            gain.gain.setValueAtTime(0, this.context.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, this.context.currentTime + 0.5);
            gain.gain.setValueAtTime(0.05, this.context.currentTime + duration - 0.5);
            gain.gain.linearRampToValueAtTime(0, this.context.currentTime + duration);

            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            source.start();

            // Schedule next loop
            source.onended = () => {
                createAmbientNoise();
            };
        };

        // Start ambient after a short delay
        setTimeout(() => createAmbientNoise(), 1000);
    }

    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = volume;
        }
    }

    dispose() {
        if (this.context) {
            this.context.close();
        }
    }
}
