/**
 * In-world waypoint marker for the active campaign objective.
 */

import * as THREE from 'three';

export class ObjectiveMarker {
    constructor(scene) {
        this.scene = scene;
        this.objective = null;
        this.group = new THREE.Group();
        this.group.visible = false;

        this.ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.82,
            side: THREE.DoubleSide
        });
        this.beamMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.28,
            depthWrite: false
        });
        this.arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95
        });

        this.ring = new THREE.Mesh(
            new THREE.TorusGeometry(2.2, 0.08, 8, 48),
            this.ringMaterial
        );
        this.ring.rotation.x = Math.PI / 2;
        this.ring.position.y = 0.08;
        this.group.add(this.ring);

        this.beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 1.1, 9, 24, 1, true),
            this.beamMaterial
        );
        this.beam.position.y = 4.5;
        this.group.add(this.beam);

        this.arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.7, 1.4, 4),
            this.arrowMaterial
        );
        this.arrow.position.y = 9.7;
        this.arrow.rotation.y = Math.PI / 4;
        this.group.add(this.arrow);

        this.scene.add(this.group);
    }

    setObjective(objective) {
        if (!objective?.position) {
            this.hide();
            return;
        }

        this.objective = objective;
        this.group.userData.levelId = objective.levelId;
        this.group.userData.label = objective.label;
        this.group.position.copy(objective.position);
        this.group.position.y = 0.05;

        const color = new THREE.Color(objective.color || '#ffffff');
        this.ringMaterial.color.copy(color);
        this.beamMaterial.color.copy(color);
        this.arrowMaterial.color.copy(color);
        this.group.visible = true;
    }

    update(playerPosition, elapsedTime = 0, objective = this.objective) {
        if (!objective) {
            this.hide();
            return;
        }

        if (objective !== this.objective || !this.group.visible) {
            this.setObjective(objective);
        } else if (objective.position) {
            this.group.position.copy(objective.position);
            this.group.position.y = 0.05;
        }

        const pulse = 1 + Math.sin(elapsedTime * 4) * 0.08;
        this.ring.scale.setScalar(pulse);
        this.arrow.position.y = 9.7 + Math.sin(elapsedTime * 3) * 0.35;
        this.beam.material.opacity = 0.2 + Math.sin(elapsedTime * 5) * 0.06;

        if (playerPosition) {
            const distance = playerPosition.distanceTo(objective.position);
            this.group.visible = distance > Math.max(2, objective.radius || 0);
        }
    }

    hide() {
        this.group.visible = false;
    }

    destroy() {
        this.scene.remove(this.group);
        this.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}
