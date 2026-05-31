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
        this.staminaRegen = 30;
        this.staminaDrain = 15;

        // Combat
        this.attackDamage = 40;
        this.attackRange = 3;
        this.attackCooldown = 0;
        this.attackDuration = 0.3;
        this.comboCount = 0;
        this.lastAttackTime = 0;

        // Abilities
        this.abilities = {
            slash: { cooldown: 0, maxCooldown: 0.5, damage: 60, staminaCost: 5 },
            spin: { cooldown: 0, maxCooldown: 4, damage: 80, staminaCost: 20 },
            dash: { cooldown: 0, maxCooldown: 2, distance: 10, staminaCost: 15 },
            fireBlast: { cooldown: 0, maxCooldown: 6, damage: 120, staminaCost: 30 }
        };

        // Camera settings
        this.mouseSensitivity = 0.002;
        this.minPitch = -Math.PI / 2 + 0.1;
        this.maxPitch = Math.PI / 2 - 0.1;

        // Visual elements
        this.weaponModel = null;
        this.weaponSwingAnimation = null;

        // Animation state
        this.currentAnimation = 'idle';
        this.animationTime = 0;
        this.animationDuration = 0;
        this.activeAbility = null;

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

        // Katana blade - larger and more visible
        const bladeGeometry = new THREE.BoxGeometry(0.04, 1.1, 0.015);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0x222222,
            emissiveIntensity: 0.3
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = 0.6;
        weaponGroup.add(blade);

        // Blade edge (sharper look with glow)
        const edgeGeometry = new THREE.BoxGeometry(0.045, 1.1, 0.003);
        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 1,
            roughness: 0,
            emissive: 0x6666ff,
            emissiveIntensity: 0.5
        });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.position.set(0, 0.6, 0.009);
        weaponGroup.add(edge);

        // Handle (tsuka) - longer grip
        const handleGeometry = new THREE.CylinderGeometry(0.035, 0.03, 0.35, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.rotation.x = Math.PI / 2;
        handle.position.y = -0.12;
        weaponGroup.add(handle);

        // Handle wrap - red silk
        const wrapMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa0000,
            roughness: 0.7,
            emissive: 0x330000,
            emissiveIntensity: 0.2
        });
        for (let i = 0; i < 7; i++) {
            const wrapGeometry = new THREE.TorusGeometry(0.038, 0.008, 4, 8);
            const wrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
            wrap.rotation.y = Math.PI / 2;
            wrap.position.y = -0.25 + i * 0.045;
            weaponGroup.add(wrap);
        }

        // Guard (tsuba) - ornate
        const guardGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
        const guardMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.9,
            roughness: 0.2
        });
        const guard = new THREE.Mesh(guardGeometry, guardMaterial);
        guard.rotation.x = Math.PI / 2;
        guard.position.y = 0.05;
        weaponGroup.add(guard);

        // Pommel cap
        const pommelGeometry = new THREE.SphereGeometry(0.04, 8, 8);
        const pommel = new THREE.Mesh(pommelGeometry, guardMaterial);
        pommel.position.y = -0.32;
        weaponGroup.add(pommel);

        // Default idle position - more prominent in view
        weaponGroup.position.set(0.35, -0.35, -0.6);
        weaponGroup.rotation.set(-0.3, -0.4, 0.4);

        // Store default position for animations
        this.weaponDefaultPos = new THREE.Vector3(0.35, -0.35, -0.6);
        this.weaponDefaultRot = new THREE.Euler(-0.3, -0.4, 0.4);

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

        // Attack (left click) - trigger slash ability
        this.inputManager.onMouseDown(0, () => {
            this.useAbility('slash');
        });

        // Block (right click)
        this.inputManager.onMouseDown(2, () => {
            this.isBlocking = true;
        });

        this.inputManager.onMouseUp(2, () => {
            this.isBlocking = false;
        });

        // Abilities with keybinds shown in README (Q, E, Shift+Space, R)
        this.inputManager.onKeyDown('KeyQ', () => this.useAbility('slash'));
        this.inputManager.onKeyDown('KeyE', () => this.useAbility('spin'));
        this.inputManager.onKeyDown('KeyR', () => this.useAbility('fireBlast'));
        // Also keep number keys
        this.inputManager.onKeyDown('Digit1', () => this.useAbility('slash'));
        this.inputManager.onKeyDown('Digit2', () => this.useAbility('spin'));
        this.inputManager.onKeyDown('Digit3', () => this.useAbility('dash'));
        this.inputManager.onKeyDown('Digit4', () => this.useAbility('fireBlast'));
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

        // Ground collision - pass current Y to prevent teleporting to surfaces far above
        const groundHeight = this.physicsSystem.getGroundHeight(newPosition, this.position.y);
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

        // Update animation timer
        if (this.animationTime > 0) {
            this.animationTime -= deltaTime;
            if (this.animationTime <= 0) {
                this.currentAnimation = 'idle';
                this.activeAbility = null;
            }
        }

        // Idle sway
        const time = Date.now() * 0.001;
        const swayX = Math.sin(time) * 0.015;
        const swayY = Math.cos(time * 1.5) * 0.01;

        // Get animation progress (0 to 1)
        const progress = this.animationDuration > 0
            ? 1 - (this.animationTime / this.animationDuration)
            : 0;

        if (this.currentAnimation === 'attack') {
            // Basic attack - horizontal slash with combo variations
            // Alternate swing direction based on combo
            const direction = this.comboCount % 2 === 1 ? 1 : -1;

            // Three phases: windup (0-0.25), strike (0.25-0.7), recovery (0.7-1.0)
            if (progress < 0.25) {
                // Windup - pull weapon back
                const windupProgress = progress / 0.25;
                const ease = windupProgress * windupProgress; // ease in

                this.weaponModel.position.set(
                    0.35 + ease * 0.3 * direction,
                    -0.35 + ease * 0.2,
                    -0.6 + ease * 0.15
                );
                this.weaponModel.rotation.set(
                    -0.3 - ease * 0.5,
                    -0.4 - ease * 0.6 * direction,
                    0.4 - ease * 0.4 * direction
                );
            } else if (progress < 0.7) {
                // Strike - fast horizontal swing
                const strikeProgress = (progress - 0.25) / 0.45;
                const ease = 1 - Math.pow(1 - strikeProgress, 3); // ease out cubic

                this.weaponModel.position.set(
                    0.65 * direction - ease * 1.3 * direction,
                    -0.15 - ease * 0.1,
                    -0.45 - ease * 0.3
                );
                this.weaponModel.rotation.set(
                    -0.8 + ease * 0.3,
                    -1.0 * direction + ease * 1.8 * direction,
                    -0.4 * direction + ease * 0.8 * direction
                );
            } else {
                // Recovery - return to ready position
                const recoveryProgress = (progress - 0.7) / 0.3;
                const startX = -0.65 * direction;
                const startY = -0.25;
                const startZ = -0.75;
                const startRotX = -0.5;
                const startRotY = 0.8 * direction;
                const startRotZ = 0.4 * direction;

                this.weaponModel.position.set(
                    startX + (0.35 - startX) * recoveryProgress,
                    startY + (-0.35 - startY) * recoveryProgress,
                    startZ + (-0.6 - startZ) * recoveryProgress
                );
                this.weaponModel.rotation.set(
                    startRotX + (-0.3 - startRotX) * recoveryProgress,
                    startRotY + (-0.4 - startRotY) * recoveryProgress,
                    startRotZ + (0.4 - startRotZ) * recoveryProgress
                );
            }
        } else if (this.currentAnimation === 'slash') {
            // Slash ability - powerful diagonal cut
            const windUp = progress < 0.3 ? progress / 0.3 : 1;
            const strike = progress >= 0.3 ? (progress - 0.3) / 0.7 : 0;

            if (progress < 0.3) {
                // Wind up - pull back
                this.weaponModel.position.set(
                    0.5 + windUp * 0.2,
                    -0.2 + windUp * 0.3,
                    -0.5 + windUp * 0.1
                );
                this.weaponModel.rotation.set(
                    -0.5 - windUp * 0.8,
                    -0.8 - windUp * 0.5,
                    0.6 + windUp * 0.3
                );
            } else {
                // Strike down
                const strikeEase = Math.sin(strike * Math.PI * 0.5);
                this.weaponModel.position.set(
                    0.7 - strikeEase * 0.5,
                    0.1 - strikeEase * 0.6,
                    -0.4 - strikeEase * 0.4
                );
                this.weaponModel.rotation.set(
                    -1.3 + strikeEase * 2.0,
                    -1.3 + strikeEase * 1.2,
                    0.9 - strikeEase * 1.2
                );
            }
        } else if (this.currentAnimation === 'spin') {
            // Spin ability - 360 degree rotation
            const spinAngle = progress * Math.PI * 2;
            const bobHeight = Math.sin(progress * Math.PI) * 0.1;

            this.weaponModel.position.set(
                0.35 + Math.cos(spinAngle) * 0.3,
                -0.35 + bobHeight,
                -0.6 + Math.sin(spinAngle) * 0.3
            );
            this.weaponModel.rotation.set(
                -0.3,
                -0.4 + spinAngle,
                0.4 + Math.sin(spinAngle * 2) * 0.3
            );
        } else if (this.currentAnimation === 'fireBlast') {
            // Fire blast - thrust forward
            const thrust = Math.sin(progress * Math.PI);
            const charge = progress < 0.4 ? progress / 0.4 : 1;

            if (progress < 0.4) {
                // Charge up - pull back and glow
                this.weaponModel.position.set(
                    0.35 + charge * 0.1,
                    -0.35 + charge * 0.2,
                    -0.6 + charge * 0.2
                );
                this.weaponModel.rotation.set(
                    -0.3 - charge * 0.5,
                    -0.4,
                    0.4
                );
            } else {
                // Thrust forward
                const thrustProgress = (progress - 0.4) / 0.6;
                const thrustEase = Math.sin(thrustProgress * Math.PI * 0.5);
                this.weaponModel.position.set(
                    0.45 - thrustEase * 0.3,
                    -0.15 - thrustEase * 0.1,
                    -0.4 - thrustEase * 0.5
                );
                this.weaponModel.rotation.set(
                    -0.8 + thrustEase * 0.6,
                    -0.4,
                    0.4 - thrustEase * 0.2
                );
            }
        } else if (this.currentAnimation === 'dash') {
            // Dash - quick motion blur effect
            const dashPhase = Math.sin(progress * Math.PI);
            this.weaponModel.position.set(
                0.35 - dashPhase * 0.2,
                -0.35 - dashPhase * 0.1,
                -0.6 - dashPhase * 0.3
            );
            this.weaponModel.rotation.set(
                -0.3 + dashPhase * 0.5,
                -0.4 - dashPhase * 0.3,
                0.4
            );
        } else if (this.isBlocking) {
            // Block stance - sword held horizontally in front
            this.weaponModel.position.set(0.1, -0.15, -0.45);
            this.weaponModel.rotation.set(0.3, 0.8, -0.7);
        } else {
            // Default idle position with subtle sway
            this.weaponModel.position.set(
                this.weaponDefaultPos.x + swayX,
                this.weaponDefaultPos.y + swayY,
                this.weaponDefaultPos.z
            );
            this.weaponModel.rotation.set(
                this.weaponDefaultRot.x + swayY * 0.5,
                this.weaponDefaultRot.y + swayX * 0.5,
                this.weaponDefaultRot.z
            );
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

        // Trigger attack animation
        this.currentAnimation = 'attack';
        this.animationTime = this.attackDuration;
        this.animationDuration = this.attackDuration;

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

        // Animation durations for each ability
        const animationDurations = {
            slash: 0.5,
            spin: 0.8,
            dash: 0.3,
            fireBlast: 0.7
        };

        // Trigger ability animation
        this.currentAnimation = abilityName;
        this.animationTime = animationDurations[abilityName] || 0.5;
        this.animationDuration = this.animationTime;
        this.activeAbility = abilityName;

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
                const dashGroundHeight = this.physicsSystem.getGroundHeight(dashTarget, this.position.y);
                dashTarget.y = dashGroundHeight + 1.7;
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
