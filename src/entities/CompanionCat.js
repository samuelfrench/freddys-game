/**
 * Companion Cat - A helpful green cat that follows and assists the player
 */

import * as THREE from 'three';

export class CompanionCat {
    constructor(scene, player, aiSystem) {
        this.scene = scene;
        this.player = player;
        this.aiSystem = aiSystem;

        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();

        // Cat properties
        this.speed = 8; // Slower, more relaxed following
        this.followDistance = 3;
        this.sideOffset = 3; // Stay to the side, not behind
        this.attackRange = 8; // Larger range to help more
        this.attackDamage = 20;
        this.attackCooldown = 0;
        this.attackCooldownMax = 1.0; // Attack faster

        // Animation state
        this.animationTime = 0;
        this.isIdle = true;
        this.isAttacking = false;
        this.tailPhase = Math.random() * Math.PI * 2;

        // Create the cat mesh
        this.mesh = this.createCatMesh();
        this.mesh.scale.set(2, 2, 2); // Make cat bigger and more visible
        this.scene.add(this.mesh);

        // Initialize position near player
        this.position.copy(player.position);
        this.position.x += 3;
        this.position.z += 3;
        this.position.y = 0;
        this.mesh.position.copy(this.position);
    }

    createCatMesh() {
        const cat = new THREE.Group();

        // Materials
        const furMaterial = new THREE.MeshStandardMaterial({
            color: 0x44dd66, // Green!
            roughness: 0.8,
            metalness: 0.0
        });

        const darkFurMaterial = new THREE.MeshStandardMaterial({
            color: 0x228844,
            roughness: 0.8
        });

        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xaaaa00,
            emissiveIntensity: 0.5
        });

        const noseMaterial = new THREE.MeshStandardMaterial({
            color: 0xff9999
        });

        // Body
        const bodyGeometry = new THREE.CapsuleGeometry(0.25, 0.5, 8, 16);
        const body = new THREE.Mesh(bodyGeometry, furMaterial);
        body.rotation.z = Math.PI / 2;
        body.position.y = 0.35;
        body.castShadow = true;
        cat.add(body);
        this.body = body;

        // Head
        const headGeometry = new THREE.SphereGeometry(0.22, 16, 16);
        const head = new THREE.Mesh(headGeometry, furMaterial);
        head.position.set(0.4, 0.45, 0);
        head.scale.set(1, 0.9, 0.85);
        head.castShadow = true;
        cat.add(head);
        this.head = head;

        // Ears
        const earGeometry = new THREE.ConeGeometry(0.08, 0.15, 4);
        const leftEar = new THREE.Mesh(earGeometry, furMaterial);
        leftEar.position.set(0.45, 0.65, 0.1);
        leftEar.rotation.x = -0.2;
        cat.add(leftEar);
        this.leftEar = leftEar;

        const rightEar = new THREE.Mesh(earGeometry, furMaterial);
        rightEar.position.set(0.45, 0.65, -0.1);
        rightEar.rotation.x = 0.2;
        cat.add(rightEar);
        this.rightEar = rightEar;

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.55, 0.48, 0.08);
        cat.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.55, 0.48, -0.08);
        cat.add(rightEye);

        // Pupils
        const pupilGeometry = new THREE.SphereGeometry(0.025, 8, 8);
        const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(0.58, 0.48, 0.08);
        cat.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.58, 0.48, -0.08);
        cat.add(rightPupil);

        // Nose
        const noseGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0.6, 0.4, 0);
        cat.add(nose);

        // Whiskers (thin cylinders)
        const whiskerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const whiskerGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.15, 4);

        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 3; i++) {
                const whisker = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
                whisker.position.set(0.55, 0.38 + i * 0.03, side * 0.1);
                whisker.rotation.z = Math.PI / 2;
                whisker.rotation.y = side * (0.2 + i * 0.1);
                cat.add(whisker);
            }
        }

        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.04, 0.25, 8);

        // Front legs
        const frontLeftLeg = new THREE.Mesh(legGeometry, furMaterial);
        frontLeftLeg.position.set(0.25, 0.12, 0.12);
        cat.add(frontLeftLeg);
        this.frontLeftLeg = frontLeftLeg;

        const frontRightLeg = new THREE.Mesh(legGeometry, furMaterial);
        frontRightLeg.position.set(0.25, 0.12, -0.12);
        cat.add(frontRightLeg);
        this.frontRightLeg = frontRightLeg;

        // Back legs
        const backLeftLeg = new THREE.Mesh(legGeometry, furMaterial);
        backLeftLeg.position.set(-0.25, 0.12, 0.12);
        cat.add(backLeftLeg);
        this.backLeftLeg = backLeftLeg;

        const backRightLeg = new THREE.Mesh(legGeometry, furMaterial);
        backRightLeg.position.set(-0.25, 0.12, -0.12);
        cat.add(backRightLeg);
        this.backRightLeg = backRightLeg;

        // Tail
        const tailGroup = new THREE.Group();
        const tailSegments = 5;
        const tailMaterial = furMaterial;

        for (let i = 0; i < tailSegments; i++) {
            const segmentSize = 0.06 - i * 0.008;
            const segmentGeometry = new THREE.SphereGeometry(segmentSize, 8, 8);
            const segment = new THREE.Mesh(segmentGeometry, tailMaterial);
            segment.position.x = -i * 0.1;
            segment.position.y = i * 0.05;
            tailGroup.add(segment);
        }
        tailGroup.position.set(-0.4, 0.4, 0);
        cat.add(tailGroup);
        this.tail = tailGroup;

        // Stripes (darker green markings)
        const stripeGeometry = new THREE.BoxGeometry(0.05, 0.15, 0.3);
        for (let i = 0; i < 3; i++) {
            const stripe = new THREE.Mesh(stripeGeometry, darkFurMaterial);
            stripe.position.set(-0.1 + i * 0.15, 0.45, 0);
            stripe.rotation.z = 0.3 - i * 0.15;
            cat.add(stripe);
        }

        // Add a bright glow effect to make cat visible
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x44ff66,
            transparent: true,
            opacity: 0.25
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 0.35;
        cat.add(glow);
        this.glow = glow;

        return cat;
    }

    update(deltaTime) {
        this.animationTime += deltaTime;
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);

        // Get player ground position
        const playerGroundPos = this.player.position.clone();
        playerGroundPos.y = 0;

        // Calculate desired position (to the side of player, slightly behind)
        // This keeps the cat visible instead of always behind the player
        const playerForward = this.player.getForwardDirection();
        const sideDir = new THREE.Vector3(-playerForward.z, 0, playerForward.x);

        this.targetPosition.copy(playerGroundPos);
        this.targetPosition.addScaledVector(playerForward, -1); // Only slightly behind
        this.targetPosition.addScaledVector(sideDir, this.sideOffset); // More to the side

        // Check for nearby enemies to attack
        const nearestEnemy = this.findNearestEnemy();
        if (nearestEnemy && this.attackCooldown <= 0) {
            this.attackEnemy(nearestEnemy);
        }

        // Move toward target position
        const toTarget = this.targetPosition.clone().sub(this.position);
        const distance = toTarget.length();

        if (distance > 1.5) { // More slack before moving
            this.isIdle = false;
            toTarget.normalize();

            // Move faster only if really far from player
            const speedMultiplier = distance > 15 ? 2.5 : 1;
            // Slower lerp for more relaxed following
            this.velocity.lerp(toTarget.multiplyScalar(this.speed * speedMultiplier), deltaTime * 2);

            this.position.addScaledVector(this.velocity, deltaTime);

            // Face movement direction
            if (this.velocity.length() > 0.1) {
                const angle = Math.atan2(this.velocity.x, this.velocity.z);
                this.mesh.rotation.y = angle - Math.PI / 2;
            }
        } else {
            this.isIdle = true;
            this.velocity.multiplyScalar(0.85); // Slower deceleration
        }

        // Keep on ground
        this.position.y = 0;
        this.mesh.position.copy(this.position);
        this.mesh.position.y = 0;

        // Animations
        this.animate(deltaTime);
    }

    animate(deltaTime) {
        const t = this.animationTime;

        // Tail wagging
        const tailWag = Math.sin(t * 8 + this.tailPhase) * 0.4;
        this.tail.rotation.z = tailWag;
        this.tail.rotation.y = Math.sin(t * 6) * 0.2;

        // Ear twitching
        this.leftEar.rotation.z = Math.sin(t * 3) * 0.1;
        this.rightEar.rotation.z = Math.sin(t * 3.5 + 1) * 0.1;

        // Walking animation
        if (!this.isIdle) {
            const walkCycle = t * 15;
            this.frontLeftLeg.rotation.x = Math.sin(walkCycle) * 0.4;
            this.frontRightLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.4;
            this.backLeftLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.4;
            this.backRightLeg.rotation.x = Math.sin(walkCycle) * 0.4;

            // Body bob
            this.body.position.y = 0.35 + Math.sin(walkCycle * 2) * 0.02;
        } else {
            // Idle breathing
            this.body.scale.x = 1 + Math.sin(t * 2) * 0.02;
            this.body.scale.z = 1 + Math.sin(t * 2) * 0.02;

            // Occasionally look around
            this.head.rotation.y = Math.sin(t * 0.5) * 0.2;
        }

        // Glow pulse
        this.glow.material.opacity = 0.08 + Math.sin(t * 3) * 0.04;

        // Attack animation
        if (this.isAttacking) {
            this.mesh.position.y = Math.sin(t * 20) * 0.1;
        }
    }

    findNearestEnemy() {
        const enemies = this.aiSystem.getEnemies();
        let nearest = null;
        let nearestDist = this.attackRange;

        for (const enemy of enemies) {
            const dist = this.position.distanceTo(enemy.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    attackEnemy(enemy) {
        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownMax;

        // Jump toward enemy
        const toEnemy = enemy.position.clone().sub(this.position).normalize();
        this.velocity.copy(toEnemy.multiplyScalar(15));

        // Deal damage
        const killed = enemy.takeDamage(this.attackDamage);

        // Face enemy
        const angle = Math.atan2(toEnemy.x, toEnemy.z);
        this.mesh.rotation.y = angle - Math.PI / 2;

        // Create attack effect
        this.createAttackEffect(enemy.position);

        setTimeout(() => {
            this.isAttacking = false;
        }, 200);

        return killed;
    }

    createAttackEffect(position) {
        // Green sparkle effect
        const sparkleCount = 8;
        const sparkles = new THREE.Group();

        const sparkleMaterial = new THREE.MeshBasicMaterial({
            color: 0x88ffaa,
            transparent: true,
            opacity: 1
        });

        for (let i = 0; i < sparkleCount; i++) {
            const sparkleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial.clone());
            const angle = (i / sparkleCount) * Math.PI * 2;
            sparkle.position.set(
                Math.cos(angle) * 0.3,
                0.5 + Math.random() * 0.5,
                Math.sin(angle) * 0.3
            );
            sparkle.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(angle) * 2,
                    2 + Math.random() * 2,
                    Math.sin(angle) * 2
                )
            };
            sparkles.add(sparkle);
        }

        sparkles.position.copy(position);
        this.scene.add(sparkles);

        // Animate and remove
        let elapsed = 0;
        const animate = () => {
            elapsed += 0.016;
            if (elapsed > 0.5) {
                this.scene.remove(sparkles);
                return;
            }

            sparkles.children.forEach(sparkle => {
                sparkle.position.add(sparkle.userData.velocity.clone().multiplyScalar(0.016));
                sparkle.userData.velocity.y -= 5 * 0.016;
                sparkle.material.opacity = 1 - elapsed * 2;
                sparkle.scale.multiplyScalar(0.95);
            });

            requestAnimationFrame(animate);
        };
        animate();
    }

    // Teleport to player if too far
    teleportToPlayer() {
        this.position.copy(this.player.position);
        this.position.x += 2;
        this.position.y = 0;
        this.mesh.position.copy(this.position);
    }
}
