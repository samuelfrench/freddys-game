# Freddy's Game

An advanced browser-based 3D action game featuring a ninja castle environment with AI-powered enemies.

## Features

- **3D Ninja Castle Environment** - Procedurally generated Japanese castle with multiple floors, towers, and decorative elements
- **First-Person Combat** - Fluid melee combat with combo system
- **4 Special Abilities**:
  - Slash (Q) - Quick directional attack
  - Spin (E) - 360° area attack
  - Dash (Shift+Space) - Quick dodge movement
  - Fire Blast (R) - Ranged fire projectile
- **AI Enemies** - Behavior tree-based AI with 4 enemy types:
  - Grunt - Basic melee enemy
  - Warrior - Tanky, high damage
  - Assassin - Fast, flanking attacks
  - Boss - Powerful with special abilities
- **Three-Level Campaign** - Moonlit Castle, Sunset Beach, and Storm Reef Showdown
- **Objective Waypoints** - HUD objective text plus in-world markers for each campaign target
- **Boss Battle UI** - Dedicated Storm Shogun health bar with attack telegraph warnings
- **Checkpoint Restart** - Restart from the current level or reset the full campaign
- **Visual Effects** - GPU particle systems, custom post-processing shaders (bloom, vignette, chromatic aberration)
- **Procedural Audio** - Web Audio API generated sound effects
- **Minimap** - Radar-style tactical display

## Tech Stack

- **Three.js** - WebGL 3D rendering
- **Vite** - Build tool and dev server
- **Vitest** - Testing framework
- **Custom GLSL Shaders** - Post-processing effects
- **Behavior Trees** - Enemy AI architecture

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look around |
| Left Click | Attack |
| Right Click | Block |
| Shift | Sprint |
| Space | Jump |
| Q | Slash ability |
| E | Spin ability |
| R | Fire Blast |

## Testing

The game includes a comprehensive test suite covering:
- Physics system (collision, raycasting)
- Input handling
- Wave spawning
- Campaign objectives and checkpoints
- Player mechanics
- Combat system
- AI behavior
- Integration tests
- Playwright browser tests for real-input campaign progression

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## License

MIT
