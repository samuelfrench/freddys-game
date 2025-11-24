/**
 * AI System - Advanced enemy AI with behavior trees
 */

import * as THREE from 'three';

// Behavior Tree Node Types
class BTNode {
    tick(enemy, context) {
        return 'running';
    }
}

class BTSelector extends BTNode {
    constructor(children) {
        super();
        this.children = children;
    }

    tick(enemy, context) {
        for (const child of this.children) {
            const result = child.tick(enemy, context);
            if (result !== 'failure') {
                return result;
            }
        }
        return 'failure';
    }
}

class BTSequence extends BTNode {
    constructor(children) {
        super();
        this.children = children;
    }

    tick(enemy, context) {
        for (const child of this.children) {
            const result = child.tick(enemy, context);
            if (result !== 'success') {
                return result;
            }
        }
        return 'success';
    }
}

class BTCondition extends BTNode {
    constructor(condition) {
        super();
        this.condition = condition;
    }

    tick(enemy, context) {
        return this.condition(enemy, context) ? 'success' : 'failure';
    }
}

class BTAction extends BTNode {
    constructor(action) {
        super();
        this.action = action;
    }

    tick(enemy, context) {
        return this.action(enemy, context);
    }
}

// Enemy class
class Enemy {
    constructor(scene, position, type, physicsSystem) {
        this.scene = scene;
        this.type = type;
        this.physicsSystem = physicsSystem;

        // Position and movement
        this.position = position.clone();
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        this.targetRotation = 0;

        // Stats based on type
        this.setupStats();

        // State
        this.state = 'idle';
        this.stateTimer = 0;
        this.target = null;
        this.lastSeenPlayerPos = null;
        this.patrolPath = [];
        this.patrolIndex = 0;

        // Combat
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.hitRecently = false;
        this.hitCooldown = 0;

        // Visual
        this.mesh = null;
        this.createMesh();

        // Physics body
        this.body = physicsSystem.addDynamicBody({
            type: 'capsule',
            position: this.position,
            radius: 0.4,
            height: 1.8
        });
    }

    setupStats() {
        switch (this.type) {
            case 'grunt':
                this.maxHealth = 25;
                this.health = 25;
                this.speed = 3;
                this.attackDamage = 5;
                this.attackRange = 2;
                this.attackSpeed = 0.7;
                this.detectionRange = 15;
                this.color = 0x444444;
                this.points = 100;
                break;

            case 'warrior':
                this.maxHealth = 50;
                this.health = 50;
                this.speed = 2.5;
                this.attackDamage = 8;
                this.attackRange = 2.5;
                this.attackSpeed = 0.6;
                this.detectionRange = 18;
                this.color = 0x660000;
                this.points = 200;
                break;

            case 'assassin':
                this.maxHealth = 20;
                this.health = 20;
                this.speed = 5;
                this.attackDamage = 12;
                this.attackRange = 2;
                this.attackSpeed = 1.0;
                this.detectionRange = 25;
                this.color = 0x220044;
                this.points = 300;
                break;

            case 'boss':
                this.maxHealth = 150;
                this.health = 150;
                this.speed = 2.5;
                this.attackDamage = 15;
                this.attackRange = 4;
                this.attackSpeed = 0.4;
                this.detectionRange = 30;
                this.color = 0x990000;
                this.points = 1000;
                break;

            default:
                this.maxHealth = 25;
                this.health = 25;
                this.speed = 3;
                this.attackDamage = 5;
                this.attackRange = 2;
                this.attackSpeed = 0.7;
                this.detectionRange = 15;
                this.color = 0x444444;
                this.points = 100;
        }
    }

    createMesh() {
        const group = new THREE.Group();

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.7,
            metalness: 0.2
        });

        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8
        });

        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });

        // Body
        const bodyGeometry = new THREE.CapsuleGeometry(0.35, 0.8, 8, 16);
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 1.6;
        head.castShadow = true;
        group.add(head);

        // Hood/mask
        const maskGeometry = new THREE.ConeGeometry(0.2, 0.15, 4);
        const mask = new THREE.Mesh(maskGeometry, accentMaterial);
        mask.position.set(0, 1.55, 0.15);
        mask.rotation.x = Math.PI / 2;
        group.add(mask);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08, 1.62, 0.2);
        group.add(leftEye);

        const rightEye = leftEye.clone();
        rightEye.position.set(0.08, 1.62, 0.2);
        group.add(rightEye);

        // Arms
        const armGeometry = new THREE.CapsuleGeometry(0.08, 0.4, 4, 8);
        const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        leftArm.position.set(-0.45, 1.1, 0);
        leftArm.rotation.z = 0.2;
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        rightArm.position.set(0.45, 1.1, 0);
        rightArm.rotation.z = -0.2;
        rightArm.castShadow = true;
        group.add(rightArm);

        // Legs
        const legGeometry = new THREE.CapsuleGeometry(0.1, 0.4, 4, 8);
        const leftLeg = new THREE.Mesh(legGeometry, accentMaterial);
        leftLeg.position.set(-0.15, 0.3, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, accentMaterial);
        rightLeg.position.set(0.15, 0.3, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        // Weapon (katana)
        const bladeGeometry = new THREE.BoxGeometry(0.02, 0.6, 0.01);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.9,
            roughness: 0.1
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(0.5, 1, -0.2);
        blade.rotation.z = -0.5;
        group.add(blade);

        // Scale based on type
        if (this.type === 'boss') {
            group.scale.setScalar(1.5);
        }

        group.position.copy(this.position);
        this.mesh = group;
        this.scene.add(group);

        // Store reference to eyes for animation
        this.leftEye = leftEye;
        this.rightEye = rightEye;
        this.rightArm = rightArm;
    }

    update(deltaTime, context) {
        // Update cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        if (this.hitCooldown > 0) {
            this.hitCooldown -= deltaTime;
            if (this.hitCooldown <= 0) {
                this.hitRecently = false;
            }
        }

        // Update state timer
        this.stateTimer += deltaTime;

        // Animate based on state
        this.animate(deltaTime);

        // Update position
        this.position.copy(this.body.position);
        this.mesh.position.copy(this.position);

        // Smooth rotation
        const rotDiff = this.targetRotation - this.rotation;
        this.rotation += rotDiff * deltaTime * 5;
        this.mesh.rotation.y = this.rotation;
    }

    animate(deltaTime) {
        const time = Date.now() * 0.001;

        // Idle animation
        this.mesh.position.y = this.position.y + Math.sin(time * 2) * 0.02;

        // Attack animation
        if (this.isAttacking) {
            const attackProgress = 1 - (this.attackCooldown / (1 / this.attackSpeed));
            this.rightArm.rotation.x = Math.sin(attackProgress * Math.PI) * 1.5;
        } else {
            this.rightArm.rotation.x = 0;
        }

        // Walking animation
        if (this.velocity.length() > 0.1) {
            const walkCycle = Math.sin(time * 8);
            if (this.mesh.children[4]) { // left leg
                this.mesh.children[4].rotation.x = walkCycle * 0.3;
            }
            if (this.mesh.children[5]) { // right leg
                this.mesh.children[5].rotation.x = -walkCycle * 0.3;
            }
        }

        // Eye glow when aggro
        if (this.target) {
            this.leftEye.material.emissiveIntensity = 1 + Math.sin(time * 5) * 0.3;
            this.rightEye.material.emissiveIntensity = 1 + Math.sin(time * 5) * 0.3;
        } else {
            this.leftEye.material.emissiveIntensity = 0.3;
            this.rightEye.material.emissiveIntensity = 0.3;
        }
    }

    lookAt(target) {
        const direction = target.clone().sub(this.position);
        this.targetRotation = Math.atan2(direction.x, direction.z);
    }

    moveToward(target, deltaTime) {
        const direction = target.clone().sub(this.position);
        direction.y = 0;

        if (direction.length() > 0.5) {
            direction.normalize();
            this.velocity.copy(direction.multiplyScalar(this.speed));
            this.body.position.addScaledVector(this.velocity, deltaTime);
        } else {
            this.velocity.set(0, 0, 0);
        }

        this.lookAt(target);
    }

    attack() {
        if (this.attackCooldown > 0) return null;

        this.isAttacking = true;
        this.attackCooldown = 1 / this.attackSpeed;

        setTimeout(() => {
            this.isAttacking = false;
        }, 300);

        return {
            damage: this.attackDamage,
            position: this.position.clone(),
            range: this.attackRange
        };
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hitRecently = true;
        this.hitCooldown = 0.3;

        // Flash red
        this.mesh.children.forEach(child => {
            if (child.material && child.material.emissive) {
                child.material.emissive.setHex(0xff0000);
                setTimeout(() => {
                    child.material.emissive.setHex(
                        child.material === this.leftEye?.material ? 0xff0000 : 0x000000
                    );
                }, 100);
            }
        });

        return this.health <= 0;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.physicsSystem.removeBody(this.body);

        // Dispose geometries and materials
        this.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}

export class AISystem {
    constructor(scene, physicsSystem, castle) {
        this.scene = scene;
        this.physicsSystem = physicsSystem;
        this.castle = castle;
        this.enemies = [];

        // Create behavior trees for different enemy types
        this.behaviorTrees = {
            grunt: this.createGruntBehavior(),
            warrior: this.createWarriorBehavior(),
            assassin: this.createAssassinBehavior(),
            boss: this.createBossBehavior()
        };
    }

    createGruntBehavior() {
        return new BTSelector([
            // If hit recently, back off
            new BTSequence([
                new BTCondition((e) => e.hitRecently),
                new BTAction((e, ctx) => {
                    const awayDir = e.position.clone().sub(ctx.player.position).normalize();
                    const retreatPos = e.position.clone().add(awayDir.multiplyScalar(3));
                    e.moveToward(retreatPos, ctx.deltaTime);
                    return 'success';
                })
            ]),

            // If player in range, attack
            new BTSequence([
                new BTCondition((e, ctx) => {
                    const dist = e.position.distanceTo(ctx.player.position);
                    return dist < e.attackRange && e.attackCooldown <= 0;
                }),
                new BTAction((e, ctx) => {
                    e.lookAt(ctx.player.position);
                    const attack = e.attack();
                    if (attack) {
                        ctx.attacks.push({ enemy: e, ...attack });
                    }
                    return 'success';
                })
            ]),

            // If player visible, chase
            new BTSequence([
                new BTCondition((e, ctx) => {
                    const dist = e.position.distanceTo(ctx.player.position);
                    if (dist < e.detectionRange) {
                        e.target = ctx.player;
                        e.lastSeenPlayerPos = ctx.player.position.clone();
                        return true;
                    }
                    return false;
                }),
                new BTAction((e, ctx) => {
                    e.moveToward(ctx.player.position, ctx.deltaTime);
                    e.state = 'chase';
                    return 'running';
                })
            ]),

            // Go to last seen position
            new BTSequence([
                new BTCondition((e) => e.lastSeenPlayerPos !== null),
                new BTAction((e, ctx) => {
                    const dist = e.position.distanceTo(e.lastSeenPlayerPos);
                    if (dist < 1) {
                        e.lastSeenPlayerPos = null;
                        e.state = 'idle';
                        return 'success';
                    }
                    e.moveToward(e.lastSeenPlayerPos, ctx.deltaTime);
                    e.state = 'search';
                    return 'running';
                })
            ]),

            // Patrol
            new BTAction((e, ctx) => {
                if (e.patrolPath.length === 0) {
                    // Generate patrol path
                    const basePos = e.position.clone();
                    e.patrolPath = [
                        basePos.clone().add(new THREE.Vector3(5, 0, 0)),
                        basePos.clone().add(new THREE.Vector3(5, 0, 5)),
                        basePos.clone().add(new THREE.Vector3(0, 0, 5)),
                        basePos.clone()
                    ];
                }

                const target = e.patrolPath[e.patrolIndex];
                const dist = e.position.distanceTo(target);

                if (dist < 1) {
                    e.patrolIndex = (e.patrolIndex + 1) % e.patrolPath.length;
                    e.stateTimer = 0;
                }

                if (e.stateTimer < 1) {
                    e.velocity.set(0, 0, 0);
                    return 'running';
                }

                e.moveToward(target, ctx.deltaTime);
                e.state = 'patrol';
                return 'running';
            })
        ]);
    }

    createWarriorBehavior() {
        return new BTSelector([
            // Block if player is attacking
            new BTSequence([
                new BTCondition((e, ctx) => {
                    const dist = e.position.distanceTo(ctx.player.position);
                    return dist < 4 && ctx.player.isAttacking;
                }),
                new BTAction((e, ctx) => {
                    e.lookAt(ctx.player.position);
                    e.state = 'block';
                    e.velocity.set(0, 0, 0);
                    return 'running';
                })
            ]),

            // Strafe and attack
            new BTSequence([
                new BTCondition((e, ctx) => {
                    const dist = e.position.distanceTo(ctx.player.position);
                    return dist < e.detectionRange;
                }),
                new BTAction((e, ctx) => {
                    const dist = e.position.distanceTo(ctx.player.position);
                    e.lookAt(ctx.player.position);

                    if (dist < e.attackRange && e.attackCooldown <= 0) {
                        const attack = e.attack();
                        if (attack) {
                            ctx.attacks.push({ enemy: e, ...attack });
                        }
                        return 'success';
                    }

                    // Strafe while approaching
                    const toPlayer = ctx.player.position.clone().sub(e.position).normalize();
                    const strafeDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
                    const strafe = Math.sin(Date.now() * 0.002) * 0.5;

                    const moveDir = toPlayer.clone().add(strafeDir.multiplyScalar(strafe)).normalize();
                    const targetPos = e.position.clone().add(moveDir);
                    e.moveToward(targetPos, ctx.deltaTime);
                    e.state = 'combat';
                    return 'running';
                })
            ]),

            // Patrol (reuse grunt patrol)
            new BTAction((e, ctx) => {
                e.state = 'idle';
                e.velocity.set(0, 0, 0);
                return 'running';
            })
        ]);
    }

    createAssassinBehavior() {
        return new BTSelector([
            // Flank attack - circle behind player
            new BTSequence([
                new BTCondition((e, ctx) => {
                    const dist = e.position.distanceTo(ctx.player.position);
                    return dist < e.detectionRange;
                }),
                new BTAction((e, ctx) => {
                    const dist = e.position.distanceTo(ctx.player.position);
                    const playerForward = ctx.player.getForwardDirection();
                    const toEnemy = e.position.clone().sub(ctx.player.position).normalize();

                    // Check if behind player
                    const isBehind = playerForward.dot(toEnemy) < -0.3;

                    if (dist < e.attackRange && e.attackCooldown <= 0) {
                        const attack = e.attack();
                        if (attack) {
                            // Bonus damage from behind
                            if (isBehind) attack.damage *= 1.5;
                            ctx.attacks.push({ enemy: e, ...attack });
                        }
                        return 'success';
                    }

                    // Circle to get behind
                    const behindPos = ctx.player.position.clone()
                        .sub(playerForward.multiplyScalar(3));

                    if (!isBehind && dist > e.attackRange) {
                        e.moveToward(behindPos, ctx.deltaTime);
                    } else {
                        e.moveToward(ctx.player.position, ctx.deltaTime);
                    }

                    e.lookAt(ctx.player.position);
                    e.state = 'flank';
                    return 'running';
                })
            ]),

            // Hide and observe
            new BTAction((e, ctx) => {
                e.state = 'hide';
                e.velocity.set(0, 0, 0);
                return 'running';
            })
        ]);
    }

    createBossBehavior() {
        return new BTSelector([
            // Special attack at half health
            new BTSequence([
                new BTCondition((e) => e.health < e.maxHealth * 0.5 && !e.enraged),
                new BTAction((e, ctx) => {
                    e.enraged = true;
                    e.attackDamage *= 1.5;
                    e.speed *= 1.3;
                    e.mesh.children.forEach(child => {
                        if (child.material && child.material.color) {
                            child.material.emissive.setHex(0xff4400);
                            child.material.emissiveIntensity = 0.3;
                        }
                    });
                    return 'success';
                })
            ]),

            // Multi-attack combo
            new BTSequence([
                new BTCondition((e, ctx) => {
                    const dist = e.position.distanceTo(ctx.player.position);
                    return dist < e.attackRange && e.attackCooldown <= 0;
                }),
                new BTAction((e, ctx) => {
                    e.lookAt(ctx.player.position);

                    // Three-hit combo
                    for (let i = 0; i < 3; i++) {
                        setTimeout(() => {
                            if (e.health > 0) {
                                const attack = {
                                    damage: e.attackDamage * (1 + i * 0.2),
                                    position: e.position.clone(),
                                    range: e.attackRange
                                };
                                ctx.attacks.push({ enemy: e, ...attack });
                                e.isAttacking = true;
                                setTimeout(() => { e.isAttacking = false; }, 200);
                            }
                        }, i * 300);
                    }

                    e.attackCooldown = 2;
                    return 'success';
                })
            ]),

            // Aggressive chase
            new BTSequence([
                new BTCondition((e, ctx) => {
                    const dist = e.position.distanceTo(ctx.player.position);
                    return dist < e.detectionRange;
                }),
                new BTAction((e, ctx) => {
                    e.moveToward(ctx.player.position, ctx.deltaTime);
                    e.lookAt(ctx.player.position);
                    e.state = 'aggro';
                    return 'running';
                })
            ]),

            // Idle stomp
            new BTAction((e, ctx) => {
                e.state = 'idle';
                e.velocity.set(0, 0, 0);
                return 'running';
            })
        ]);
    }

    spawnEnemy(type, position) {
        const enemy = new Enemy(this.scene, position, type, this.physicsSystem);
        this.enemies.push(enemy);
        return enemy;
    }

    update(deltaTime, player) {
        const context = {
            player,
            deltaTime,
            attacks: [],
            castle: this.castle
        };

        // Update each enemy
        for (const enemy of this.enemies) {
            // Run behavior tree
            const tree = this.behaviorTrees[enemy.type];
            if (tree) {
                tree.tick(enemy, context);
            }

            // Update enemy
            enemy.update(deltaTime, context);
        }

        return context.attacks;
    }

    getEnemies() {
        return this.enemies;
    }

    getEnemyCount() {
        return this.enemies.length;
    }

    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
            enemy.destroy();
            this.enemies.splice(index, 1);
        }
    }

    clearAllEnemies() {
        for (const enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
    }

    getEnemiesInRange(position, range) {
        return this.enemies.filter(enemy =>
            enemy.position.distanceTo(position) <= range
        );
    }

    getEnemiesInCone(origin, direction, angle, range) {
        const halfAngle = angle / 2;
        return this.enemies.filter(enemy => {
            const toEnemy = enemy.position.clone().sub(origin);
            const distance = toEnemy.length();

            if (distance > range) return false;

            toEnemy.normalize();
            const dot = direction.dot(toEnemy);
            const enemyAngle = Math.acos(dot);

            return enemyAngle <= halfAngle;
        });
    }
}
