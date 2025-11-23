/**
 * Input Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputManager } from '../src/systems/InputManager.js';

describe('InputManager', () => {
    let inputManager;

    beforeEach(() => {
        inputManager = new InputManager();
    });

    describe('initialization', () => {
        it('should initialize with empty key map', () => {
            expect(inputManager.isKeyDown('KeyW')).toBe(false);
        });

        it('should initialize with empty mouse button map', () => {
            expect(inputManager.isMouseDown(0)).toBe(false);
        });

        it('should not be locked initially', () => {
            expect(inputManager.isLocked).toBe(false);
        });
    });

    describe('keyboard input', () => {
        it('should track key down state', () => {
            const event = new KeyboardEvent('keydown', { code: 'KeyW' });
            document.dispatchEvent(event);

            expect(inputManager.isKeyDown('KeyW')).toBe(true);
        });

        it('should track key up state', () => {
            const downEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
            const upEvent = new KeyboardEvent('keyup', { code: 'KeyW' });

            document.dispatchEvent(downEvent);
            document.dispatchEvent(upEvent);

            expect(inputManager.isKeyDown('KeyW')).toBe(false);
        });

        it('should ignore repeat events', () => {
            const callback = vi.fn();
            inputManager.onKeyDown('KeyW', callback);

            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', repeat: true }));
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', repeat: true }));

            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('mouse input', () => {
        it('should track mouse button down', () => {
            const event = new MouseEvent('mousedown', { button: 0 });
            document.dispatchEvent(event);

            expect(inputManager.isMouseDown(0)).toBe(true);
        });

        it('should track mouse button up', () => {
            document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
            document.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));

            expect(inputManager.isMouseDown(0)).toBe(false);
        });

        it('should track right mouse button separately', () => {
            document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
            document.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));

            expect(inputManager.isMouseDown(0)).toBe(true);
            expect(inputManager.isMouseDown(2)).toBe(true);

            document.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));

            expect(inputManager.isMouseDown(0)).toBe(false);
            expect(inputManager.isMouseDown(2)).toBe(true);
        });
    });

    describe('getMovementInput', () => {
        it('should return zero input when no keys pressed', () => {
            const input = inputManager.getMovementInput();

            expect(input.x).toBe(0);
            expect(input.y).toBe(0);
            expect(input.z).toBe(0);
        });

        it('should return forward input for W key', () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));

            const input = inputManager.getMovementInput();

            expect(input.z).toBe(1);
        });

        it('should return backward input for S key', () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));

            const input = inputManager.getMovementInput();

            expect(input.z).toBe(-1);
        });

        it('should return left input for A key', () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));

            const input = inputManager.getMovementInput();

            expect(input.x).toBe(-1);
        });

        it('should return right input for D key', () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));

            const input = inputManager.getMovementInput();

            expect(input.x).toBe(1);
        });

        it('should support arrow keys', () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));

            const input = inputManager.getMovementInput();

            expect(input.z).toBe(1);
            expect(input.x).toBe(1);
        });
    });

    describe('callbacks', () => {
        it('should call key down callbacks', () => {
            const callback = vi.fn();
            inputManager.onKeyDown('KeyE', callback);

            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));

            expect(callback).toHaveBeenCalled();
        });

        it('should call key up callbacks', () => {
            const callback = vi.fn();
            inputManager.onKeyUp('KeyE', callback);

            document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));

            expect(callback).toHaveBeenCalled();
        });

        it('should call mouse down callbacks', () => {
            const callback = vi.fn();
            inputManager.onMouseDown(0, callback);

            document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));

            expect(callback).toHaveBeenCalled();
        });

        it('should call mouse up callbacks', () => {
            const callback = vi.fn();
            inputManager.onMouseUp(2, callback);

            document.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));

            expect(callback).toHaveBeenCalled();
        });

        it('should support single character key bindings', () => {
            const callback = vi.fn();
            inputManager.onKeyDown('E', callback);

            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));

            expect(callback).toHaveBeenCalled();
        });

        it('should support number key bindings', () => {
            const callback = vi.fn();
            inputManager.onKeyDown('1', callback);

            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }));

            expect(callback).toHaveBeenCalled();
        });
    });

    describe('mouse delta', () => {
        it('should return and reset mouse delta', () => {
            inputManager.mouseDelta = { x: 10, y: 5 };

            const delta = inputManager.getMouseDelta();

            expect(delta.x).toBe(10);
            expect(delta.y).toBe(5);

            const nextDelta = inputManager.getMouseDelta();
            expect(nextDelta.x).toBe(0);
            expect(nextDelta.y).toBe(0);
        });
    });
});
