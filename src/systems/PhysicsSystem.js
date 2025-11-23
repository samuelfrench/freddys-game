/**
 * Physics System - Simple physics simulation for game entities
 */

import * as THREE from 'three';

export class PhysicsSystem {
    constructor() {
        this.staticBodies = [];
        this.dynamicBodies = [];

        // Default ground plane at y = 0
        this.groundPlane = {
            position: new THREE.Vector3(0, 0, 0),
            normal: new THREE.Vector3(0, 1, 0)
        };
    }

    addStaticBody(body) {
        this.staticBodies.push(body);
    }

    addDynamicBody(body) {
        this.dynamicBodies.push(body);
        return body;
    }

    removeBody(body) {
        const staticIndex = this.staticBodies.indexOf(body);
        if (staticIndex !== -1) {
            this.staticBodies.splice(staticIndex, 1);
        }

        const dynamicIndex = this.dynamicBodies.indexOf(body);
        if (dynamicIndex !== -1) {
            this.dynamicBodies.splice(dynamicIndex, 1);
        }
    }

    update(deltaTime) {
        // Update dynamic bodies
        for (const body of this.dynamicBodies) {
            if (body.velocity) {
                body.position.addScaledVector(body.velocity, deltaTime);
            }
        }
    }

    getGroundHeight(position) {
        let maxHeight = 0;

        // Check against all static bodies that could act as ground
        for (const body of this.staticBodies) {
            if (body.type === 'box') {
                // Check if position is above this box
                const halfSize = body.size.clone().multiplyScalar(0.5);
                const minX = body.position.x - halfSize.x;
                const maxX = body.position.x + halfSize.x;
                const minZ = body.position.z - halfSize.z;
                const maxZ = body.position.z + halfSize.z;

                if (position.x >= minX && position.x <= maxX &&
                    position.z >= minZ && position.z <= maxZ) {
                    const topY = body.position.y + halfSize.y;
                    if (topY > maxHeight) {
                        maxHeight = topY;
                    }
                }
            }
        }

        return maxHeight;
    }

    checkCollision(collider, newPosition) {
        const result = {
            collided: false,
            pushback: new THREE.Vector3()
        };

        for (const body of this.staticBodies) {
            if (body.type === 'box') {
                const collision = this.capsuleBoxCollision(
                    newPosition,
                    collider.radius,
                    collider.height,
                    body
                );

                if (collision.collided) {
                    result.collided = true;
                    result.pushback.add(collision.pushback);
                }
            }
        }

        return result;
    }

    capsuleBoxCollision(capsulePos, radius, height, box) {
        // Simplified collision - treat capsule as cylinder
        const halfSize = box.size.clone().multiplyScalar(0.5);
        const boxMin = box.position.clone().sub(halfSize);
        const boxMax = box.position.clone().add(halfSize);

        // Find closest point on box to capsule center
        const closest = new THREE.Vector3(
            Math.max(boxMin.x, Math.min(capsulePos.x, boxMax.x)),
            Math.max(boxMin.y, Math.min(capsulePos.y, boxMax.y)),
            Math.max(boxMin.z, Math.min(capsulePos.z, boxMax.z))
        );

        // Check distance (ignoring y for side collisions)
        const diff = new THREE.Vector3(
            capsulePos.x - closest.x,
            0,
            capsulePos.z - closest.z
        );
        const distance = diff.length();

        if (distance < radius && distance > 0) {
            // Only collide if we're at the right height
            if (capsulePos.y < boxMax.y + height && capsulePos.y > boxMin.y) {
                const pushback = diff.normalize().multiplyScalar(radius - distance);
                return { collided: true, pushback };
            }
        }

        return { collided: false, pushback: new THREE.Vector3() };
    }

    raycast(origin, direction, maxDistance = 100) {
        const results = [];

        for (const body of this.staticBodies) {
            if (body.type === 'box') {
                const hit = this.rayBoxIntersection(origin, direction, body);
                if (hit && hit.distance <= maxDistance) {
                    results.push(hit);
                }
            }
        }

        // Sort by distance
        results.sort((a, b) => a.distance - b.distance);
        return results[0] || null;
    }

    rayBoxIntersection(origin, direction, box) {
        const halfSize = box.size.clone().multiplyScalar(0.5);
        const boxMin = box.position.clone().sub(halfSize);
        const boxMax = box.position.clone().add(halfSize);

        let tMin = -Infinity;
        let tMax = Infinity;

        for (let i = 0; i < 3; i++) {
            const axis = ['x', 'y', 'z'][i];
            const invD = 1 / direction[axis];
            let t0 = (boxMin[axis] - origin[axis]) * invD;
            let t1 = (boxMax[axis] - origin[axis]) * invD;

            if (invD < 0) [t0, t1] = [t1, t0];

            tMin = Math.max(tMin, t0);
            tMax = Math.min(tMax, t1);

            if (tMax < tMin) return null;
        }

        if (tMin < 0) return null;

        const hitPoint = origin.clone().addScaledVector(direction, tMin);
        return {
            distance: tMin,
            point: hitPoint,
            body: box
        };
    }

    // Check sphere overlap (for ability effects)
    sphereOverlap(center, radius) {
        const overlapping = [];

        for (const body of this.dynamicBodies) {
            if (body.position) {
                const distance = center.distanceTo(body.position);
                if (distance < radius + (body.radius || 0.5)) {
                    overlapping.push(body);
                }
            }
        }

        return overlapping;
    }

    // Check cone (for directional attacks)
    coneOverlap(origin, direction, angle, range) {
        const overlapping = [];
        const halfAngle = angle / 2;

        for (const body of this.dynamicBodies) {
            if (body.position) {
                const toBody = body.position.clone().sub(origin);
                const distance = toBody.length();

                if (distance <= range) {
                    toBody.normalize();
                    const dot = direction.dot(toBody);
                    const bodyAngle = Math.acos(dot);

                    if (bodyAngle <= halfAngle) {
                        overlapping.push(body);
                    }
                }
            }
        }

        return overlapping;
    }
}
