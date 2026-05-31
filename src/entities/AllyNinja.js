/**
 * Ally Ninja - teammate fighter used in the final boss encounter.
 */

import * as THREE from 'three';

export class AllyNinja {
    constructor(scene, player, aiSystem, options = {}) {
        this.scene = scene;
        this.player = player;
        this.aiSystem = aiSystem;
        this.name = options.name || 'Ally';
        this.sideOffset = options.sideOffset ?? 3;
        this.followBackOffset = options.followBackOffset ?? 2;
        this.onEnemyDefeated = options.onEnemyDefeated || (() => {});

        this.position = player.position.clone();
        this.position.x += this.sideOffset;
        this.position.z += 2;
        this.position.y = 0;
        this.velocity = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();

        this.speed = 9;
        this.attackRange = 7.5;
        this.attackDamage = options.attackDamage || 28;
        this.attackCooldown = 0;
        this.attackCooldownMax = options.attackCooldownMax || 0.9;
        this.animationTime = 0;
        this.isAttacking = false;

        this.mesh = this.createMesh(options);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    createMesh(options) {
        const ally = new THREE.Group();
        ally.userData.entity = 'ally-ninja';
        ally.userData.name = this.name;

        const clothColor = options.color || 0x1f7aff;
        const clothMaterial = new THREE.MeshStandardMaterial({
            color: clothColor,
            roughness: 0.65,
            metalness: 0.15
        });
        const darkMaterial = new THREE.MeshStandardMaterial({
            color: 0x121827,
            roughness: 0.85
        });
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xdfefff,
            roughness: 0.18,
            metalness: 0.85,
            emissive: 0x3a8dff,
            emissiveIntensity: 0.15
        });
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0x8fd8ff,
            emissive: 0x4fb3ff,
            emissiveIntensity: 0.8
        });

        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.85, 8, 16), clothMaterial);
        body.position.y = 0.9;
        body.castShadow = true;
        ally.add(body);
        this.body = body;

        const sash = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 18), bladeMaterial);
        sash.position.y = 0.95;
        sash.rotation.x = Math.PI / 2;
        ally.add(sash);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), clothMaterial);
        head.position.y = 1.57;
        head.castShadow = true;
        ally.add(head);
        this.head = head;

        const mask = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.08), darkMaterial);
        mask.position.set(0, 1.58, 0.2);
        ally.add(mask);

        const eyeGeometry = new THREE.SphereGeometry(0.035, 8, 8);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.075, 1.61, 0.245);
        ally.add(leftEye);
        const rightEye = leftEye.clone();
        rightEye.position.x = 0.075;
        ally.add(rightEye);
        this.leftEye = leftEye;
        this.rightEye = rightEye;

        const limbGeometry = new THREE.CapsuleGeometry(0.07, 0.48, 5, 8);
        const leftArm = new THREE.Mesh(limbGeometry, clothMaterial);
        leftArm.position.set(-0.42, 1.08, 0);
        leftArm.rotation.z = 0.2;
        ally.add(leftArm);
        const rightArm = new THREE.Mesh(limbGeometry, clothMaterial);
        rightArm.position.set(0.42, 1.08, 0);
        rightArm.rotation.z = -0.2;
        ally.add(rightArm);
        this.leftArm = leftArm;
        this.rightArm = rightArm;

        const legGeometry = new THREE.CapsuleGeometry(0.09, 0.5, 5, 8);
        const leftLeg = new THREE.Mesh(legGeometry, darkMaterial);
        leftLeg.position.set(-0.15, 0.32, 0);
        ally.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeometry, darkMaterial);
        rightLeg.position.set(0.15, 0.32, 0);
        ally.add(rightLeg);
        this.leftLeg = leftLeg;
        this.rightLeg = rightLeg;

        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.9, 0.018), bladeMaterial);
        blade.position.set(0.58, 1.04, -0.12);
        blade.rotation.z = -0.55;
        ally.add(blade);
        this.blade = blade;

        const aura = new THREE.Mesh(
            new THREE.SphereGeometry(0.72, 16, 12),
            new THREE.MeshBasicMaterial({
                color: clothColor,
                transparent: true,
                opacity: 0.13
            })
        );
        aura.position.y = 0.9;
        ally.add(aura);
        this.aura = aura;

        ally.scale.setScalar(1.15);
        return ally;
    }

    update(deltaTime) {
        this.animationTime += deltaTime;
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);

        const nearestEnemy = this.findNearestEnemy();
        if (nearestEnemy && this.attackCooldown <= 0) {
            this.attackEnemy(nearestEnemy);
        }

        this.updateFollowPosition(deltaTime);
        this.animate();
    }

    updateFollowPosition(deltaTime) {
        const playerGroundPos = this.player.position.clone();
        playerGroundPos.y = 0;

        const playerForward = this.player.getForwardDirection();
        const sideDir = new THREE.Vector3(-playerForward.z, 0, playerForward.x);

        this.targetPosition.copy(playerGroundPos);
        this.targetPosition.addScaledVector(playerForward, -this.followBackOffset);
        this.targetPosition.addScaledVector(sideDir, this.sideOffset);

        const toTarget = this.targetPosition.clone().sub(this.position);
        const distance = toTarget.length();

        if (distance > 1.2) {
            toTarget.normalize();
            const speedMultiplier = distance > 18 ? 2.2 : 1;
            this.velocity.lerp(toTarget.multiplyScalar(this.speed * speedMultiplier), deltaTime * 4);
            this.position.addScaledVector(this.velocity, deltaTime);
        } else {
            this.velocity.multiplyScalar(0.82);
        }

        this.position.y = 0;
        this.mesh.position.copy(this.position);

        if (this.velocity.length() > 0.1) {
            this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
        }
    }

    findNearestEnemy() {
        let nearest = null;
        let nearestDistance = this.attackRange;

        for (const enemy of this.aiSystem.getEnemies()) {
            const distance = this.position.distanceTo(enemy.position);
            if (distance < nearestDistance) {
                nearest = enemy;
                nearestDistance = distance;
            }
        }

        return nearest;
    }

    attackEnemy(enemy) {
        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownMax;

        const toEnemy = enemy.position.clone().sub(this.position).normalize();
        this.velocity.copy(toEnemy.multiplyScalar(12));
        this.mesh.rotation.y = Math.atan2(toEnemy.x, toEnemy.z);

        const killed = enemy.takeDamage(this.attackDamage);
        if (killed) {
            this.onEnemyDefeated(enemy, this);
        }

        setTimeout(() => {
            this.isAttacking = false;
        }, 180);

        return killed;
    }

    animate() {
        const t = this.animationTime;
        const walk = Math.sin(t * 13);

        this.body.position.y = 0.9 + Math.sin(t * 4) * 0.025;
        this.leftLeg.rotation.x = walk * 0.35;
        this.rightLeg.rotation.x = -walk * 0.35;
        this.leftArm.rotation.x = -walk * 0.25;
        this.rightArm.rotation.x = this.isAttacking ? -1.3 : walk * 0.25;
        this.blade.rotation.x = this.isAttacking ? Math.sin(t * 30) * 0.45 : 0;
        this.aura.material.opacity = 0.09 + Math.sin(t * 5) * 0.035;
        this.leftEye.material.emissiveIntensity = this.isAttacking ? 1.5 : 0.8;
        this.rightEye.material.emissiveIntensity = this.leftEye.material.emissiveIntensity;
    }

    teleportToPlayer() {
        this.position.copy(this.player.position);
        this.position.x += this.sideOffset;
        this.position.z += 2;
        this.position.y = 0;
        this.mesh.position.copy(this.position);
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.mesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((material) => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}
