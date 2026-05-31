/**
 * Test Setup - Mock browser APIs and Three.js for testing
 */

import { vi } from 'vitest';

// Mock WebGL context
const mockWebGLContext = {
    getExtension: vi.fn(() => null),
    getParameter: vi.fn(() => 16),
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    createFramebuffer: vi.fn(() => ({})),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    createRenderbuffer: vi.fn(() => ({})),
    bindRenderbuffer: vi.fn(),
    renderbufferStorage: vi.fn(),
    framebufferRenderbuffer: vi.fn(),
    viewport: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    depthFunc: vi.fn(),
    cullFace: vi.fn(),
    frontFace: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    drawArrays: vi.fn(),
    drawElements: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 36053), // FRAMEBUFFER_COMPLETE
    getShaderInfoLog: vi.fn(() => ''),
    getProgramInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    deleteProgram: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteTexture: vi.fn(),
    deleteFramebuffer: vi.fn(),
    deleteRenderbuffer: vi.fn(),
    pixelStorei: vi.fn(),
    generateMipmap: vi.fn(),
    activeTexture: vi.fn(),
    scissor: vi.fn(),
    colorMask: vi.fn(),
    depthMask: vi.fn(),
    stencilMask: vi.fn(),
    stencilFunc: vi.fn(),
    stencilOp: vi.fn(),
    lineWidth: vi.fn(),
    polygonOffset: vi.fn(),
    isContextLost: vi.fn(() => false)
};

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
        return mockWebGLContext;
    }
    if (type === '2d') {
        return {
            fillRect: vi.fn(),
            clearRect: vi.fn(),
            getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
            putImageData: vi.fn(),
            createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
            setTransform: vi.fn(),
            drawImage: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            arc: vi.fn(),
            rect: vi.fn(),
            clip: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn(),
            fillText: vi.fn(),
            strokeText: vi.fn(),
            measureText: vi.fn(() => ({ width: 10 })),
            createLinearGradient: vi.fn(() => ({
                addColorStop: vi.fn()
            })),
            createRadialGradient: vi.fn(() => ({
                addColorStop: vi.fn()
            })),
            canvas: { width: 150, height: 150 }
        };
    }
    return null;
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Mock pointer lock
document.body.requestPointerLock = vi.fn();
document.exitPointerLock = vi.fn();

// Mock Audio Context
global.AudioContext = vi.fn(() => ({
    createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
    })),
    createOscillator: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        type: 'sine',
        frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
    })),
    createBiquadFilter: vi.fn(() => ({
        connect: vi.fn(),
        type: 'lowpass',
        frequency: { value: 1000 }
    })),
    createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(1024))
    })),
    createBufferSource: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        buffer: null,
        loop: false,
        onended: null
    })),
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
    state: 'running',
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve())
}));

global.webkitAudioContext = global.AudioContext;

// Mock performance.now
if (typeof performance === 'undefined') {
    global.performance = { now: () => Date.now() };
}

// Create mock DOM elements for the game
document.body.innerHTML = `
    <div id="loading-screen">
        <div id="loading-bar"></div>
        <div id="loading-text"></div>
    </div>
    <div id="game-container"></div>
    <div id="health-bar"></div>
    <div id="health-value"></div>
    <div id="stamina-bar"></div>
    <div id="stamina-value"></div>
    <div id="score"></div>
    <div id="wave-info"></div>
    <div id="enemy-count"></div>
    <div id="objective-line"></div>
    <div id="boss-panel">
        <div id="boss-name"></div>
        <div id="boss-health-bar"></div>
        <div id="boss-health-value"></div>
        <div id="boss-telegraph-status"></div>
    </div>
    <div id="damage-overlay"></div>
    <div id="notification"></div>
    <div id="pause-menu">
        <button id="resume-btn"></button>
        <button id="restart-btn"></button>
    </div>
    <div id="ability-1"><div class="ability-cooldown"></div></div>
    <div id="ability-2"><div class="ability-cooldown"></div></div>
    <div id="ability-3"><div class="ability-cooldown"></div></div>
    <div id="ability-4"><div class="ability-cooldown"></div></div>
    <canvas id="minimap-canvas"></canvas>
`;

export { mockWebGLContext };
