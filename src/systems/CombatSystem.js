/**
 * Combat System - Handles combat resolution between player and enemies
 */

import * as THREE from 'three';

export class CombatSystem {
    constructor(player, aiSystem) {
        this.player = player;
        this.aiSystem = aiSystem;

        // Combat results for this frame
        this.results = {
            enemyDeaths: [],
            playerDamage: 0,
            hits: []
        };
    }

    update(deltaTime) {
        // Reset results
        this.results = {
            enemyDeaths: [],
            playerDamage: 0,
            hits: []
        };

        // Handle player attacks
        this.handlePlayerAttacks();

        // Handle enemy attacks
        this.handleEnemyAttacks();

        return this.results;
    }

    handlePlayerAttacks() {
        // Check for melee attacks
        if (this.player.isAttacking && this.player.attackCooldown > this.player.attackDuration - 0.1) {
            const attack = {
                type: 'melee',
                damage: this.player.attackDamage * (1 + this.player.comboCount * 0.2),
                position: this.player.position.clone(),
                direction: this.player.getForwardDirection(),
                range: this.player.attackRange
            };

            this.processAttack(attack, 'player');
        }

        // Handle ability usage
        const abilities = ['slash', 'spin', 'dash', 'fireBlast'];
        for (const abilityName of abilities) {
            const ability = this.player.abilities[abilityName];
            // Check if ability was just used (cooldown just started)
            if (ability.cooldown > ability.maxCooldown - 0.1) {
                const result = this.processAbility(abilityName);
                if (result) {
                    this.results.hits.push(...result.hits);
                }
            }
        }
    }

    processAbility(abilityName) {
        const position = this.player.position.clone();
        const direction = this.player.getForwardDirection();
        const ability = this.player.abilities[abilityName];
        const hits = [];

        switch (abilityName) {
            case 'slash': {
                // Wide arc attack in front
                const enemies = this.aiSystem.getEnemiesInCone(position, direction, Math.PI / 2, 4);
                for (const enemy of enemies) {
                    const killed = enemy.takeDamage(ability.damage);
                    hits.push({
                        type: 'slash',
                        position: enemy.position.clone()
                    });

                    if (killed) {
                        this.results.enemyDeaths.push({
                            enemy,
                            position: enemy.position.clone(),
                            points: enemy.points
                        });
                        this.aiSystem.removeEnemy(enemy);
                    }
                }
                break;
            }

            case 'spin': {
                // 360 degree attack
                const enemies = this.aiSystem.getEnemiesInRange(position, 3);
                for (const enemy of enemies) {
                    const killed = enemy.takeDamage(ability.damage);
                    hits.push({
                        type: 'spin',
                        position: enemy.position.clone()
                    });

                    if (killed) {
                        this.results.enemyDeaths.push({
                            enemy,
                            position: enemy.position.clone(),
                            points: enemy.points
                        });
                        this.aiSystem.removeEnemy(enemy);
                    }
                }
                break;
            }

            case 'dash': {
                // Dash deals damage to enemies in path
                // (dash movement handled in player.useAbility)
                hits.push({
                    type: 'dash',
                    position: position.clone()
                });
                break;
            }

            case 'fireBlast': {
                // Ranged fire attack
                const enemies = this.aiSystem.getEnemiesInCone(position, direction, Math.PI / 6, 15);
                for (const enemy of enemies) {
                    const killed = enemy.takeDamage(ability.damage);
                    hits.push({
                        type: 'fire',
                        position: enemy.position.clone()
                    });

                    if (killed) {
                        this.results.enemyDeaths.push({
                            enemy,
                            position: enemy.position.clone(),
                            points: enemy.points
                        });
                        this.aiSystem.removeEnemy(enemy);
                    }
                }
                break;
            }
        }

        return { hits };
    }

    processAttack(attack, source) {
        if (source === 'player') {
            // Find enemies in attack range and direction
            const enemies = this.aiSystem.getEnemiesInCone(
                attack.position,
                attack.direction,
                Math.PI / 3, // 60 degree arc
                attack.range
            );

            for (const enemy of enemies) {
                const killed = enemy.takeDamage(attack.damage);

                this.results.hits.push({
                    type: attack.type === 'melee' ? 'slash' : attack.type,
                    position: enemy.position.clone()
                });

                if (killed) {
                    this.results.enemyDeaths.push({
                        enemy,
                        position: enemy.position.clone(),
                        points: enemy.points
                    });
                    this.aiSystem.removeEnemy(enemy);
                }
            }
        }
    }

    handleEnemyAttacks() {
        const enemies = this.aiSystem.getEnemies();

        for (const enemy of enemies) {
            if (enemy.isAttacking && enemy.attackCooldown > 0.75 / enemy.attackSpeed) {
                // Check if player is in range
                const distance = enemy.position.distanceTo(this.player.position);

                if (distance <= enemy.attackRange) {
                    // Direction from enemy to player
                    const attackDir = this.player.position.clone()
                        .sub(enemy.position)
                        .normalize();

                    const damage = this.player.takeDamage(enemy.attackDamage, attackDir);
                    this.results.playerDamage += damage;

                    this.results.hits.push({
                        type: 'enemyAttack',
                        position: this.player.position.clone()
                    });
                }
            }
        }
    }
}
