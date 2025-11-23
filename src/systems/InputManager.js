/**
 * Input Manager - Handles keyboard, mouse, and pointer lock
 */

export class InputManager {
    constructor() {
        this.keys = new Map();
        this.mouseButtons = new Map();
        this.mouseDelta = { x: 0, y: 0 };
        this.isLocked = false;

        // Callbacks
        this.mouseMoveCallbacks = [];
        this.mouseDownCallbacks = new Map();
        this.mouseUpCallbacks = new Map();
        this.keyDownCallbacks = new Map();
        this.keyUpCallbacks = new Map();

        this.init();
    }

    init() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse events
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Pointer lock
        document.addEventListener('click', () => {
            if (!this.isLocked) {
                this.lock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement !== null;
        });

        // Prevent context menu
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleKeyDown(event) {
        if (event.repeat) return;

        this.keys.set(event.code, true);

        // Trigger callbacks
        const callbacks = this.keyDownCallbacks.get(event.code);
        if (callbacks) {
            callbacks.forEach(cb => cb());
        }
    }

    handleKeyUp(event) {
        this.keys.set(event.code, false);

        // Trigger callbacks
        const callbacks = this.keyUpCallbacks.get(event.code);
        if (callbacks) {
            callbacks.forEach(cb => cb());
        }
    }

    handleMouseDown(event) {
        this.mouseButtons.set(event.button, true);

        // Trigger callbacks
        const callbacks = this.mouseDownCallbacks.get(event.button);
        if (callbacks) {
            callbacks.forEach(cb => cb());
        }
    }

    handleMouseUp(event) {
        this.mouseButtons.set(event.button, false);

        // Trigger callbacks
        const callbacks = this.mouseUpCallbacks.get(event.button);
        if (callbacks) {
            callbacks.forEach(cb => cb());
        }
    }

    handleMouseMove(event) {
        if (!this.isLocked) return;

        this.mouseDelta.x = event.movementX;
        this.mouseDelta.y = event.movementY;

        // Trigger callbacks
        for (const callback of this.mouseMoveCallbacks) {
            callback(event.movementX, event.movementY);
        }
    }

    isKeyDown(code) {
        return this.keys.get(code) === true;
    }

    isMouseDown(button) {
        return this.mouseButtons.get(button) === true;
    }

    getMovementInput() {
        const input = { x: 0, y: 0, z: 0 };

        if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) input.z = 1;
        if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) input.z = -1;
        if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) input.x = -1;
        if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) input.x = 1;

        return input;
    }

    getMouseDelta() {
        const delta = { ...this.mouseDelta };
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        return delta;
    }

    lock() {
        document.body.requestPointerLock();
    }

    unlock() {
        document.exitPointerLock();
    }

    // Callback registration
    onMouseMove(callback) {
        this.mouseMoveCallbacks.push(callback);
    }

    onMouseDown(button, callback) {
        if (!this.mouseDownCallbacks.has(button)) {
            this.mouseDownCallbacks.set(button, []);
        }
        this.mouseDownCallbacks.get(button).push(callback);
    }

    onMouseUp(button, callback) {
        if (!this.mouseUpCallbacks.has(button)) {
            this.mouseUpCallbacks.set(button, []);
        }
        this.mouseUpCallbacks.get(button).push(callback);
    }

    onKeyDown(code, callback) {
        // Support both key codes like 'KeyE' and single characters like 'E'
        const codes = [code];
        if (code.length === 1) {
            codes.push(`Key${code.toUpperCase()}`);
            codes.push(`Digit${code}`);
        }

        for (const c of codes) {
            if (!this.keyDownCallbacks.has(c)) {
                this.keyDownCallbacks.set(c, []);
            }
            this.keyDownCallbacks.get(c).push(callback);
        }
    }

    onKeyUp(code, callback) {
        const codes = [code];
        if (code.length === 1) {
            codes.push(`Key${code.toUpperCase()}`);
            codes.push(`Digit${code}`);
        }

        for (const c of codes) {
            if (!this.keyUpCallbacks.has(c)) {
                this.keyUpCallbacks.set(c, []);
            }
            this.keyUpCallbacks.get(c).push(callback);
        }
    }
}
