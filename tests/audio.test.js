/**
 * Audio System Tests
 */

import { describe, it, expect } from 'vitest';
import { AudioSystem } from '../src/systems/AudioSystem.js';

describe('AudioSystem', () => {
    it('registers a boss spawn cue for the final encounter', () => {
        const audioSystem = new AudioSystem({});

        audioSystem.createSoundGenerators();

        expect(audioSystem.sounds.has('bossSpawn')).toBe(true);
    });
});
