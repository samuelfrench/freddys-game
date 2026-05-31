/**
 * E2E smoke tests for the three-level campaign flow.
 */

import { test, expect } from '@playwright/test';

test.describe('Campaign Level Flow E2E', () => {
    test('transitions through beach and final boss levels with rendered 3D output', async ({ page }) => {
        const errors = [];
        page.on('console', (message) => {
            if (message.type() === 'error') {
                errors.push(message.text());
            }
        });
        page.on('pageerror', (error) => {
            errors.push(error.message);
        });

        await page.goto('/');
        await page.waitForFunction(() => {
            return window.__GAME__ &&
                window.__GAME__.isRunning &&
                window.__GAME__.player &&
                window.__GAME__.castle?.levelLandmarks?.length >= 2;
        }, { timeout: 30000 });

        await page.waitForTimeout(500);

        const canvasPixels = await page.evaluate(() => {
            window.__GAME__.renderer.render(window.__GAME__.elapsedTime);

            const canvas = document.querySelector('#game-container canvas');
            const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
            if (!canvas || !gl) return { sampled: 0, nonBlank: 0 };

            const samples = [
                [0.5, 0.5],
                [0.35, 0.45],
                [0.65, 0.45],
                [0.5, 0.3],
                [0.5, 0.7]
            ];
            let nonBlank = 0;
            const pixel = new Uint8Array(4);

            for (const [px, py] of samples) {
                gl.readPixels(
                    Math.floor(canvas.width * px),
                    Math.floor(canvas.height * py),
                    1,
                    1,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    pixel
                );
                if (pixel[3] > 0 && pixel[0] + pixel[1] + pixel[2] > 10) {
                    nonBlank += 1;
                }
            }

            return { sampled: samples.length, nonBlank };
        });

        expect(canvasPixels.sampled).toBe(5);
        expect(canvasPixels.nonBlank).toBeGreaterThan(0);

        const flow = await page.evaluate(() => {
            const game = window.__GAME__;

            game.player.position.set(0, 1.7, -160);
            game.checkGoal();
            const afterForest = {
                level: game.levelSystem.getCurrentLevel().id,
                label: document.getElementById('wave-info').textContent
            };

            game.player.position.set(0, 1.7, -318);
            game.checkGoal();
            game.uiManager.update();
            const afterBeach = {
                level: game.levelSystem.getCurrentLevel().id,
                allies: game.allies.length,
                bossType: game.bossEnemy?.type,
                label: document.getElementById('wave-info').textContent,
                enemyLine: document.getElementById('enemy-count').textContent
            };

            game.player.position.set(0, 1.7, -414);
            game.player.rotation.set(0, 0, 0);
            game.bossEnemy.health = game.player.abilities.fireBlast.damage;
            const ability = game.player.useAbility('fireBlast');
            const combatResults = game.combatSystem.update(0.016);
            game.handleCombatResults(combatResults);

            return {
                afterForest,
                afterBeach,
                abilityType: ability?.type,
                bossDeaths: combatResults.enemyDeaths.filter((death) => death.enemy.type === 'boss').length,
                hasWon: game.hasWon,
                campaignComplete: game.levelSystem.isCampaignComplete(),
                bossStillPresent: game.aiSystem.getEnemies().some((enemy) => enemy.type === 'boss')
            };
        });

        expect(flow.afterForest.level).toBe('sunset-beach');
        expect(flow.afterBeach.level).toBe('storm-reef');
        expect(flow.afterBeach.allies).toBe(2);
        expect(flow.afterBeach.bossType).toBe('boss');
        expect(flow.afterBeach.label).toBe('Level 3: Storm Reef Showdown');
        expect(flow.afterBeach.enemyLine).toContain('Team: 2');
        expect(flow.afterBeach.enemyLine).toContain('Boss: 100%');
        expect(flow.abilityType).toBe('fireBlast');
        expect(flow.bossDeaths).toBe(1);
        expect(flow.bossStillPresent).toBe(false);
        expect(flow.hasWon).toBe(true);
        expect(flow.campaignComplete).toBe(true);
        expect(errors).toEqual([]);
    });

    test('player can follow waypoints and defeat the boss through real inputs', async ({ page }) => {
        test.setTimeout(120000);

        const errors = [];
        page.on('console', (message) => {
            if (message.type() === 'error') {
                errors.push(message.text());
            }
        });
        page.on('pageerror', (error) => {
            errors.push(error.message);
        });

        await page.goto('/');
        await page.waitForFunction(() => {
            return window.__GAME__ &&
                window.__GAME__.isRunning &&
                window.__GAME__.player &&
                window.__GAME__.castle?.levelLandmarks?.length >= 2;
        }, { timeout: 30000 });

        await expect(page.locator('#objective-line')).toContainText('Reach the forest shrine');

        await page.keyboard.down('ShiftLeft');
        await page.keyboard.down('KeyW');
        await page.waitForFunction(() => {
            return window.__GAME__.levelSystem.getCurrentLevel().id === 'sunset-beach';
        }, { timeout: 35000 });
        await expect(page.locator('#objective-line')).toContainText('Reach the reef gate');

        await page.waitForFunction(() => {
            return window.__GAME__.levelSystem.getCurrentLevel().id === 'storm-reef';
        }, { timeout: 35000 });
        await page.keyboard.up('KeyW');
        await page.keyboard.up('ShiftLeft');

        await expect(page.locator('#objective-line')).toContainText('Defeat Storm Shogun');
        await expect(page.locator('#boss-panel')).toHaveClass(/visible/);
        await expect(page.locator('#boss-name')).toContainText('Storm Shogun');

        await page.keyboard.down('ShiftLeft');
        await page.keyboard.down('KeyW');
        await page.waitForFunction(() => {
            return window.__GAME__.player.position.z < -419;
        }, { timeout: 20000 });
        await page.keyboard.up('KeyW');
        await page.keyboard.up('ShiftLeft');

        for (let attempt = 0; attempt < 18; attempt++) {
            await page.keyboard.press('KeyQ');
            await page.waitForTimeout(650);

            const hasWon = await page.evaluate(() => window.__GAME__.hasWon);
            if (hasWon) break;
        }

        await page.waitForFunction(() => window.__GAME__.hasWon === true, { timeout: 15000 });
        await expect(page.locator('#boss-panel')).not.toHaveClass(/visible/);

        expect(errors).toEqual([]);
    });

    test('mobile HUD keeps objective and controls inside the viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');
        await page.waitForFunction(() => {
            return window.__GAME__ &&
                window.__GAME__.isRunning &&
                window.__GAME__.player;
        }, { timeout: 30000 });

        const layout = await page.evaluate(() => {
            const box = (selector) => {
                const rect = document.querySelector(selector).getBoundingClientRect();
                return {
                    left: rect.left,
                    right: rect.right,
                    top: rect.top,
                    bottom: rect.bottom,
                    width: rect.width,
                    height: rect.height
                };
            };

            return {
                viewport: { width: window.innerWidth, height: window.innerHeight },
                playerStats: box('.player-stats'),
                gameInfo: box('.game-info'),
                objective: document.querySelector('#objective-line').textContent,
                abilityBar: box('#ability-bar'),
                minimap: box('#minimap')
            };
        });

        for (const key of ['playerStats', 'gameInfo', 'abilityBar', 'minimap']) {
            expect(layout[key].left).toBeGreaterThanOrEqual(0);
            expect(layout[key].right).toBeLessThanOrEqual(layout.viewport.width);
        }

        expect(layout.objective).toContain('Reach the forest shrine');
        expect(layout.abilityBar.bottom).toBeLessThanOrEqual(layout.minimap.top);
    });
});
