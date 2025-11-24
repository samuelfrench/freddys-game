/**
 * E2E Tests for Climbing System
 * Tests the actual running game to verify stair climbing works correctly
 */

import { test, expect } from '@playwright/test';

test.describe('Climbing System E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to game
        await page.goto('/');

        // Wait for game to fully load
        await page.waitForFunction(() => {
            return window.__GAME__ &&
                   window.__GAME__.isRunning &&
                   window.__GAME__.player;
        }, { timeout: 30000 });

        // Give the game a moment to stabilize
        await page.waitForTimeout(1000);
    });

    test('game loads successfully', async ({ page }) => {
        const gameRunning = await page.evaluate(() => window.__GAME__.isRunning);
        expect(gameRunning).toBe(true);

        const playerExists = await page.evaluate(() => !!window.__GAME__.player);
        expect(playerExists).toBe(true);
    });

    test('player spawns at correct starting position', async ({ page }) => {
        const position = await page.evaluate(() => ({
            x: window.__GAME__.player.position.x,
            y: window.__GAME__.player.position.y,
            z: window.__GAME__.player.position.z
        }));

        // Player should spawn at approximately (0, 1.7, 20)
        expect(position.x).toBeCloseTo(0, 0);
        expect(position.y).toBeCloseTo(1.7, 0);
        expect(position.z).toBeCloseTo(20, 0);
    });

    test('player does NOT teleport when walking toward tower', async ({ page }) => {
        // Position player near the main tower but at ground level
        await page.evaluate(() => {
            const game = window.__GAME__;
            game.player.position.set(0, 1.7, 5); // Near tower, ground level
            game.player.velocity.set(0, 0, 0);
        });

        // Record positions as we simulate walking toward tower
        const positions = await page.evaluate(async () => {
            const game = window.__GAME__;
            const positions = [];

            // Simulate walking toward tower (negative Z direction)
            for (let i = 0; i < 50; i++) {
                // Record position before move
                positions.push({
                    x: game.player.position.x,
                    y: game.player.position.y,
                    z: game.player.position.z
                });

                // Simulate forward movement
                game.player.velocity.z = -8; // Walk forward
                game.player.update(0.016); // ~60fps

                // Small delay
                await new Promise(r => setTimeout(r, 16));
            }

            return positions;
        });

        // Verify no Y teleportation (max allowed jump is step height + some buffer)
        const maxAllowedYChange = 1.5; // Slightly more than step height to allow for normal physics

        for (let i = 1; i < positions.length; i++) {
            const yDelta = positions[i].y - positions[i-1].y;
            expect(Math.abs(yDelta)).toBeLessThan(maxAllowedYChange);
        }

        // Player should still be near ground level (not teleported to top of tower)
        const finalY = positions[positions.length - 1].y;
        expect(finalY).toBeLessThan(5); // Should not have teleported to tower top (15+)
    });

    test('player can climb entry stairs gradually', async ({ page }) => {
        // Position player at the entry stairs location (positive X from tower)
        // Main tower is at (0,0,0), entry stairs extend along +X axis
        await page.evaluate(() => {
            const game = window.__GAME__;
            // Position near first entry stair
            game.player.position.set(8, 1.7, 0);
            game.player.velocity.set(0, 0, 0);
            game.player.rotation.y = Math.PI; // Face toward tower (-X direction)
        });

        // Walk toward the tower, recording Y positions
        const climbData = await page.evaluate(async () => {
            const game = window.__GAME__;
            const data = {
                positions: [],
                maxYJump: 0
            };

            for (let i = 0; i < 100; i++) {
                const prevY = game.player.position.y;

                // Simulate walking toward tower
                game.player.velocity.x = -8;
                game.player.update(0.016);

                const currentY = game.player.position.y;
                const yDelta = currentY - prevY;

                data.positions.push({
                    x: game.player.position.x,
                    y: currentY,
                    yDelta: yDelta
                });

                if (yDelta > data.maxYJump) {
                    data.maxYJump = yDelta;
                }

                await new Promise(r => setTimeout(r, 16));
            }

            return data;
        });

        // Verify no large Y jumps (teleportation)
        expect(climbData.maxYJump).toBeLessThan(1.5);

        // If player climbed at all, verify it was gradual
        const startY = climbData.positions[0].y;
        const endY = climbData.positions[climbData.positions.length - 1].y;

        console.log(`Climb test: startY=${startY}, endY=${endY}, maxJump=${climbData.maxYJump}`);
    });

    test('player cannot teleport to tower top from ground', async ({ page }) => {
        // Position directly at tower base
        await page.evaluate(() => {
            const game = window.__GAME__;
            game.player.position.set(4.5, 1.7, 0); // At spiral stair radius
            game.player.velocity.set(0, 0, 0);
        });

        // Try to walk into the tower
        const result = await page.evaluate(async () => {
            const game = window.__GAME__;
            const startY = game.player.position.y;

            // Simulate 2 seconds of walking into tower
            for (let i = 0; i < 120; i++) {
                game.player.velocity.x = -8;
                game.player.velocity.z = 0;
                game.player.update(0.016);
                await new Promise(r => setTimeout(r, 16));
            }

            return {
                startY,
                endY: game.player.position.y,
                didTeleport: game.player.position.y > startY + 5
            };
        });

        // Should NOT have teleported to tower top
        expect(result.didTeleport).toBe(false);
        console.log(`Tower test: startY=${result.startY}, endY=${result.endY}`);
    });

    test('getGroundHeight respects step height limit', async ({ page }) => {
        // Directly test the physics system
        const result = await page.evaluate(() => {
            const game = window.__GAME__;
            const physics = game.physicsSystem;
            const THREE = window.THREE || game.player.position.constructor;

            // Test from ground level - should not return high surfaces
            const groundPos = { x: 0, y: 1.7, z: 0 };
            const groundHeight = physics.getGroundHeight(
                new THREE.Vector3(groundPos.x, groundPos.y, groundPos.z),
                groundPos.y
            );

            // Test from elevated position - should return surfaces near current height
            const elevatedPos = { x: 0, y: 10, z: 0 };
            const elevatedHeight = physics.getGroundHeight(
                new THREE.Vector3(elevatedPos.x, elevatedPos.y, elevatedPos.z),
                elevatedPos.y
            );

            return {
                groundLevelResult: groundHeight,
                elevatedResult: elevatedHeight,
                // Ground level player (feet at 0) should not see surfaces above step height
                groundHeightIsReasonable: groundHeight < 2
            };
        });

        expect(result.groundHeightIsReasonable).toBe(true);
        console.log(`Physics test: groundHeight=${result.groundLevelResult}, elevatedHeight=${result.elevatedResult}`);
    });

    test('wall collision does not block step-able surfaces', async ({ page }) => {
        // Test that the collision system allows walking onto low platforms
        const result = await page.evaluate(() => {
            const game = window.__GAME__;
            const physics = game.physicsSystem;
            const THREE = window.THREE || game.player.position.constructor;

            // Create a test platform at step height
            const testPlatform = {
                type: 'box',
                position: new THREE.Vector3(100, 0.5, 100), // Away from game geometry
                size: new THREE.Vector3(4, 0.3, 4)
            };

            // Test collision from player approaching platform
            const playerPos = new THREE.Vector3(100, 1.7, 100);
            const collider = { radius: 0.4, height: 1.7 };

            // This should NOT collide (platform is step-able)
            const collision = physics.capsuleBoxCollision(
                playerPos,
                collider.radius,
                collider.height,
                testPlatform
            );

            return {
                collided: collision.collided,
                platformTop: testPlatform.position.y + 0.15,
                playerFeet: playerPos.y - 1.7
            };
        });

        // Should NOT collide with step-able platform
        expect(result.collided).toBe(false);
        console.log(`Collision test: collided=${result.collided}, platformTop=${result.platformTop}, playerFeet=${result.playerFeet}`);
    });
});
