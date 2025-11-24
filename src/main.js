/**
 * Freddy's Game - Shadows of the Ninja Castle
 * An advanced browser-based 3D game using Three.js
 */

import { Game } from './core/Game.js';

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const game = new Game();

    // Expose game instance for E2E testing
    window.__GAME__ = game;

    try {
        await game.init();
        game.start();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        document.getElementById('loading-text').textContent = 'Failed to load game. Please refresh.';
    }
});
