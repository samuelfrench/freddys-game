/**
 * Player Entity - First-person ninja character with combat abilities
 */

import * as THREE from 'three';

export class Player {
    constructor(scene, camera, inputManager, physicsSystem) {
        this.scene = scene;
        this.camera = camera;
        this.inputManager = inputManager;
        this.physicsSystem = physicsSystem;

        // Position and movement
        this.position = new THREE.Vector3(0, 1.7, 20);
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        // Movement settings
        this.walkSpeed = 8;
        this.sprintSpeed = 14;
        this.jumpForce = 8;
        this.gravity = 25;
        this.friction = 10;

        // Player state
        this.isGrounded = false;
        this.isSprinting = false;
        this.isBlocking = false;
        this.isAttacking = false;

        // Stats
        this.maxHealth = 100;
        this.health = 100;
        this.maxStamina = 100;
        this.stamina = 100;
        this.staminaRegen = 15;
        this.staminaDrain = 20;

        // Combat
        this.attackDamage = 25;
        this.attackRange = 3;
        this.attackCooldown = 0;
        this.attackDuration = 0.3;
        this.comboCount = 0;
        this.lastAttackTime = 0;

        // Abilities
        this.abilities = {
            slash: { cooldown: 0, maxCooldown: 1, damage: 35, staminaCost: 15 },
            spin: { cooldown: 0, maxCooldown: 5, damage: 50, staminaCost: 30 },
            dash: { cooldown: 0, maxCooldown: 3, distance: 10, staminaCost: 20 },
            fireBlast: { cooldown: 0, maxCooldown: 8, damage: 80, staminaCost: 40 }
        };

        // Camera settings
        this.mouseSensitivity = 0.002;
        this.minPitch = -Math.PI / 2 + 0.1;
        this.maxPitch = Math.PI / 2 - 0.1;

        // Visual elements
        this.weaponModel = null;
        this.weaponSwingAnimation = null;

        // Head bobbing
        this.bobTimer = 0;
        this.bobAmount = 0.05;
        this.bobSpeed = 10;
    }

    async init() {
        // Set initial camera position
        this.camera.position.copy(this.position);
        this.camera.rotation.order = 'YXZ';

        // Create weapon model (katana)
        this.createWeaponModel();

        // Setup input handlers
        this.setupInputHandlers();

        // Create player collider
        this.collider = {
            type: 'capsule',
            position: this.position.clone(),
            radius: 0.4,
            height: 1.7
        };
    }

    createWeaponModel() {
        const weaponGroup = new THREE.Group();

        // Katana blade
        const bladeGeometry = new THREE.BoxGeometry(0.03, 0.8, 0.01);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            metalness: 0.95,
            roughness: 0.1,
            envMapIntensity: 1.5
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = 0.45;
        weaponGroup.add(blade);

        // Blade edge (sharper look)
        const edgeGeometry = new THREE.BoxGeometry(0.035, 0.8, 0.002);
        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 1,
            roughness: 0,
            emissive: 0x444444
        });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.position.set(0, 0.45, 0.006);
        weaponGroup.add(edge);

        // Handle (tsuka)
        const handleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.rotation.x = Math.PI / 2;
        handle.position.y = -0.05;
        weaponGroup.add(handle);

        // Handle wrap
        const wrapMaterial = new THREE.MeshStandardMaterial({
            color: 0x800000,
            roughness: 0.8
        });
        for (let i = 0; i < 5; i++) {
            const wrapGeometry = new THREE.TorusGeometry(0.028, 0.005, 4, 8);
            const wrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
            wrap.rotation.y = Math.PI / 2;
            wrap.position.y = -0.15 + i * 0.05;
            weaponGroup.add(wrap);
        }

        // Guard (tsuba)
        const guardGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 16);
        const guardMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.3
        });
        const guard = new THREE.Mesh(guardGeometry, guardMaterial);
        guard.rotation.x = Math.PI / 2;
        guard.position.y = 0.05;
        weaponGroup.add(guard);

        // Position weapon in view
        weaponGroup.position.set(0.3, -0.3, -0.5);
        weaponGroup.rotation.set(0, -0.2, 0.3);

        this.weaponModel = weaponGroup;
        this.camera.add(weaponGroup);
    }

    setupInputHandlers() {
        // Mouse look
        this.inputManager.onMouseMove((deltaX, deltaY) => {
            this.rotation.y -= deltaX * this.mouseSensitivity;
            this.rotation.x -= deltaY * this.mouseSensitivity;
            this.rotation.x = Math.max(this.minPitch, Math.min(this.maxPitch, this.rotation.x));
        });

        // Attack (left click)
        this.inputManager.onMouseDown(0, () => {
            this.performAttack();
        });

        // Block (right click)
        this.inputManager.onMouseDown(2, () => {
            this.isBlocking = true;
        });

        this.inputManager.onMouseUp(2, () => {
            this.isBlocking = false;
        });

        // Abilities
        this.inputManager.onKeyDown('1', () => this.useAbility('slash'));
        this.inputManager.onKeyDown('2', () => this.useAbility('spin'));
        this.inputManager.onKeyDown('3', () => this.useAbility('dash'));
        this.inputManager.onKeyDown('4', () => this.useAbility('fireBlast'));
    }

    update(deltaTime) {
        // Update cooldowns
        this.updateCooldowns(deltaTime);

        // Handle movement input
        this.handleMovement(deltaTime);

        // Apply physics
        this.applyPhysics(deltaTime);

        // Update camera
        this.updateCamera(deltaTime);

        // Update weapon animation
        this.updateWeaponAnimation(deltaTime);

        // Regenerate stamina
        if (!this.isSprinting && !this.isAttacking) {
            this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * deltaTime);
        }
    }

    handleMovement(deltaTime) {
        const input = this.inputManager.getMovementInput();
        this.isSprinting = this.inputManager.isKeyDown('ShiftLeft') && this.stamina > 0;

        // Calculate movement direction
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);

        forward.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        right.applyEuler(new THREE.Euler(0, this.rotation.y, 0));

        const moveDirection = new THREE.Vector3();
        moveDirection.addScaledVector(forward, input.z);
        moveDirection.addScaledVector(right, input.x);

        if (moveDirection.length() > 0) {
            moveDirection.normalize();

            const speed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
            this.velocity.x = moveDirection.x * speed;
            this.velocity.z = moveDirection.z * speed;

            // Drain stamina while sprinting
            if (this.isSprinting) {
                this.stamina = Math.max(0, this.stamina - this.staminaDrain * deltaTime);
            }
        } else {
            // Apply friction
            this.velocity.x *= (1 - this.friction * deltaTime);
            this.velocity.z *= (1 - this.friction * deltaTime);
        }

        // Jump
        if (this.inputManager.isKeyDown('Space') && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }
    }

    applyPhysics(deltaTime) {
        // Apply gravity
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * deltaTime;
        }

        // Calculate new position
        const newPosition = this.position.clone();
        newPosition.addScaledVector(this.velocity, deltaTime);

        // Ground collision
        const groundHeight = this.physicsSystem.getGroundHeight(newPosition);
        if (newPosition.y < groundHeight + 1.7) {
            newPosition.y = groundHeight + 1.7;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Wall collision
        const collision = this.physicsSystem.checkCollision(this.collider, newPosition);
        if (collision.collided) {
            newPosition.add(collision.pushback);
        }

        // Update position
        this.position.copy(newPosition);
        this.collider.position.copy(this.position);
    }

    updateCamera(deltaTime) {
        // Base camera position
        this.camera.position.copy(this.position);
        this.camera.rotation.copy(this.rotation);

        // Head bobbing while moving
        const horizontalSpeed = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.z * this.velocity.z
        );

        if (horizontalSpeed > 0.5 && this.isGrounded) {
            this.bobTimer += deltaTime * this.bobSpeed * (this.isSprinting ? 1.5 : 1);
            const bobOffset = Math.sin(this.bobTimer) * this.bobAmount;
            const bobSide = Math.cos(this.bobTimer * 0.5) * this.bobAmount * 0.5;

            this.camera.position.y += bobOffset;
            this.camera.position.x += bobSide;
        } else {
            this.bobTimer = 0;
        }
    }

    updateWeaponAnimation(deltaTime) {
        if (!this.weaponModel) return;

        // Idle sway
        const swayX = Math.sin(Date.now() * 0.001) * 0.01;
        const swayY = Math.cos(Date.now() * 0.0015) * 0.01;

        if (this.isAttacking && this.attackCooldown > 0) {
            // Attack animation
            const attackProgress = 1 - (this.attackCooldown / this.attackDuration);
            const swingAngle = Math.sin(attackProgress * Math.PI) * 1.5;

            this.weaponModel.rotation.x = swingAngle;
            this.weaponModel.position.z = -0.5 - attackProgress * 0.3;
        } else if (this.isBlocking) {
            // Block stance
            this.weaponModel.rotation.set(0.5, 0.5, -0.5);
            this.weaponModel.position.set(0.1, -0.1, -0.4);
        } else {
            // Default idle position
            this.weaponModel.position.set(0.3 + swayX, -0.3 + swayY, -0.5);
            this.weaponModel.rotation.set(0, -0.2, 0.3);
        }
    }

    updateCooldowns(deltaTime) {
        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
            if (this.attackCooldown <= 0) {
                this.isAttacking = false;
            }
        }

        // Ability cooldowns
        for (const ability of Object.values(this.abilities)) {
            if (ability.cooldown > 0) {
                ability.cooldown -= deltaTime;
            }
        }
    }

    performAttack() {
        if (this.attackCooldown > 0 || this.isBlocking) return;

        // Check combo timing
        const now = Date.now();
        if (now - this.lastAttackTime < 500) {
            this.comboCount = Math.min(3, this.comboCount + 1);
        } else {
            this.comboCount = 1;
        }
        this.lastAttackTime = now;

        this.isAttacking = true;
        this.attackCooldown = this.attackDuration;

        // Calculate damage based on combo
        const comboDamage = this.attackDamage * (1 + this.comboCount * 0.2);

        return {
            type: 'melee',
            damage: comboDamage,
            position: this.position.clone(),
            direction: this.getForwardDirection(),
            range: this.attackRange,
            combo: this.comboCount
        };
    }

    useAbility(abilityName) {
        const ability = this.abilities[abilityName];
        if (!ability || ability.cooldown > 0) return null;
        if (this.stamina < ability.staminaCost) return null;

        // Consume stamina and start cooldown
        this.stamina -= ability.staminaCost;
        ability.cooldown = ability.maxCooldown;

        const direction = this.getForwardDirection();

        switch (abilityName) {
            case 'slash':
                return {
                    type: 'slash',
                    damage: ability.damage,
                    position: this.position.clone(),
                    direction: direction,
                    range: 4
                };

            case 'spin':
                return {
                    type: 'spin',
                    damage: ability.damage,
                    position: this.position.clone(),
                    radius: 3
                };

            case 'dash':
                // Teleport forward
                const dashTarget = this.position.clone();
                dashTarget.addScaledVector(direction, ability.distance);
                const groundHeight = this.physicsSystem.getGroundHeight(dashTarget);
                dashTarget.y = groundHeight + 1.7;
                this.position.copy(dashTarget);
                return {
                    type: 'dash',
                    from: this.position.clone(),
                    to: dashTarget
                };

            case 'fireBlast':
                return {
                    type: 'fireBlast',
                    damage: ability.damage,
                    position: this.position.clone(),
                    direction: direction,
                    range: 15
                };
        }

        return null;
    }

    getForwardDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(new THREE.Euler(this.rotation.x, this.rotation.y, 0));
        return direction.normalize();
    }

    takeDamage(amount, fromDirection) {
        if (this.isBlocking) {
            // Check if blocking in the right direction
            const blockDir = this.getForwardDirection();
            const attackDir = fromDirection.clone().normalize();

            if (blockDir.dot(attackDir) < -0.5) {
                // Successful block - reduce damage significantly
                amount *= 0.2;
            }
        }

        this.health = Math.max(0, this.health - amount);
        return amount;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    reset() {
        this.position.set(0, 1.7, 20);
        this.velocity.set(0, 0, 0);
        this.rotation.set(0, 0, 0);
        this.health = this.maxHealth;
        this.stamina = this.maxStamina;

        for (const ability of Object.values(this.abilities)) {
            ability.cooldown = 0;
        }

        this.isGrounded = false;
        this.isBlocking = false;
        this.isAttacking = false;
        this.comboCount = 0;
    }

    getAbilityCooldowns() {
        const cooldowns = {};
        for (const [name, ability] of Object.entries(this.abilities)) {
            cooldowns[name] = {
                current: Math.max(0, ability.cooldown),
                max: ability.maxCooldown,
                ready: ability.cooldown <= 0
            };
        }
        return cooldowns;
    }
}
