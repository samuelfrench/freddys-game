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
});
