/**
 * Ninja Castle - Procedurally generated Japanese castle environment
 * With frustum culling and LOD support for performance
 */

import * as THREE from 'three';
import { qualitySettings } from '../systems/QualitySettings.js';

export class NinjaCastle {
    constructor(scene, physicsSystem) {
        this.scene = scene;
        this.physicsSystem = physicsSystem;
        this.castle = new THREE.Group();
        this.lights = [];
        this.torches = [];
        this.animatedObjects = [];

        // Performance: Track meshes for frustum culling
        this.culledMeshes = [];
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();

        // Castle layout
        this.bounds = {
            minX: -50,
            maxX: 50,
            minZ: -50,
            maxZ: 50
        };

        // Spawn points for enemies
        this.spawnPoints = [];

        // Navigation mesh points for AI
        this.navPoints = [];
    }

    async build() {
        // Create materials
        this.createMaterials();

        // Build ground
        this.createGround();

        // Build main castle structure
        this.createMainCastle();

        // Create walls and towers
        this.createWallsAndTowers();

        // Add platforms and walkways
        this.createPlatforms();

        // Add decorations
        this.createDecorations();

        // Setup lighting
        this.createLighting();

        // Create spawn points
        this.createSpawnPoints();

        // Create navigation mesh
        this.createNavMesh();

        // Add castle to scene
        this.scene.add(this.castle);
    }

    createMaterials() {
        // Wood material for structures
        this.woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3728,
            roughness: 0.9,
            metalness: 0.0
        });

        // Dark wood for accents
        this.darkWoodMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a1f18,
            roughness: 0.85,
            metalness: 0.0
        });

        // Stone material
        this.stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.95,
            metalness: 0.0
        });

        // Roof tiles
        this.roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.7,
            metalness: 0.2
        });

        // Gold accents
        this.goldMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xffd700,
            emissiveIntensity: 0.1
        });

        // Paper/shoji screens
        this.paperMaterial = new THREE.MeshStandardMaterial({
            color: 0xf5f5dc,
            roughness: 0.9,
            metalness: 0.0,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        // Ground material
        this.groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d2d3a,
            roughness: 0.95,
            metalness: 0.0
        });

        // Water material
        this.waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a3a4a,
            roughness: 0.1,
            metalness: 0.5,
            transparent: true,
            opacity: 0.8
        });
    }

    createGround() {
        // Main ground plane
        const groundGeometry = new THREE.PlaneGeometry(120, 120, 20, 20);
        const ground = new THREE.Mesh(groundGeometry, this.groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.castle.add(ground);

        // Add physics collider for ground
        this.physicsSystem.addStaticBody({
            type: 'plane',
            position: new THREE.Vector3(0, 0, 0),
            normal: new THREE.Vector3(0, 1, 0)
        });

        // Decorative stone path
        this.createStonePath();

        // Koi pond
        this.createKoiPond();
    }

    createStonePath() {
        const pathGeometry = new THREE.BoxGeometry(2, 0.05, 80);
        const path = new THREE.Mesh(pathGeometry, this.stoneMaterial);
        path.position.set(0, 0.025, 0);
        path.receiveShadow = true;
        this.castle.add(path);

        // Add stepping stones
        for (let z = -35; z <= 35; z += 3) {
            const stoneGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.1, 8);
            const stone = new THREE.Mesh(stoneGeometry, this.stoneMaterial);
            stone.position.set(
                (Math.random() - 0.5) * 1.5,
                0.05,
                z + (Math.random() - 0.5) * 0.5
            );
            stone.receiveShadow = true;
            this.castle.add(stone);
        }
    }

    createKoiPond() {
        const pondShape = new THREE.Shape();
        pondShape.ellipse(0, 0, 8, 5, 0, Math.PI * 2);

        const pondGeometry = new THREE.ShapeGeometry(pondShape);
        const pond = new THREE.Mesh(pondGeometry, this.waterMaterial);
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(-25, 0.01, -15);
        this.castle.add(pond);

        // Pond border
        const borderGeometry = new THREE.TorusGeometry(6.5, 0.3, 8, 32);
        const border = new THREE.Mesh(borderGeometry, this.stoneMaterial);
        border.rotation.x = Math.PI / 2;
        border.position.set(-25, 0.15, -15);
        border.scale.set(1, 0.7, 1);
        this.castle.add(border);

        this.animatedObjects.push({
            mesh: pond,
            type: 'water'
        });
    }

    createMainCastle() {
        // Central tower (main keep)
        this.createTower(0, 0, 6, 15, true);

        // Secondary towers
        this.createTower(-15, -15, 4, 10, false);
        this.createTower(15, -15, 4, 10, false);
        this.createTower(-15, 15, 4, 10, false);
        this.createTower(15, 15, 4, 10, false);

        // Connecting structures
        this.createConnectingBuilding(-7.5, -15, 7, 4, 6);
        this.createConnectingBuilding(7.5, -15, 7, 4, 6);
        this.createConnectingBuilding(-7.5, 15, 7, 4, 6);
        this.createConnectingBuilding(7.5, 15, 7, 4, 6);
    }

    createTower(x, z, baseSize, height, isMain) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Stone foundation
        const foundationGeometry = new THREE.BoxGeometry(
            baseSize + 2,
            2,
            baseSize + 2
        );
        const foundation = new THREE.Mesh(foundationGeometry, this.stoneMaterial);
        foundation.position.y = 1;
        foundation.castShadow = true;
        foundation.receiveShadow = true;
        group.add(foundation);

        // Physics for foundation
        this.physicsSystem.addStaticBody({
            type: 'box',
            position: new THREE.Vector3(x, 1, z),
            size: new THREE.Vector3(baseSize + 2, 2, baseSize + 2)
        });

        // Tower levels
        const levels = isMain ? 4 : 2;
        let currentY = 2;
        let currentSize = baseSize;

        // Add spiral stairs to climb the tower
        this.createSpiralStairs(group, x, z, baseSize, levels, isMain);

        for (let i = 0; i < levels; i++) {
            // Wall section
            const wallHeight = isMain ? 3 : 3.5;
            const wallGeometry = new THREE.BoxGeometry(currentSize, wallHeight, currentSize);
            const wall = new THREE.Mesh(wallGeometry, this.woodMaterial);
            wall.position.y = currentY + wallHeight / 2;
            wall.castShadow = true;
            wall.receiveShadow = true;
            group.add(wall);

            // Physics for wall
            this.physicsSystem.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(x, currentY + wallHeight / 2, z),
                size: new THREE.Vector3(currentSize, wallHeight, currentSize)
            });

            // Add windows
            this.addWindows(group, currentSize, currentY + wallHeight / 2);

            // Roof/balcony platform
            this.createRoof(group, currentSize + 1, currentY + wallHeight);

            // Add walkable platform at each level
            this.createTowerPlatform(group, x, z, currentSize + 0.5, currentY + wallHeight);

            currentY += wallHeight + 1;
            currentSize -= 0.5;
        }

        // Top decorative roof
        this.createPagodaRoof(group, currentSize, currentY, isMain);

        // Add decorative spire on main tower (traditional Japanese castle finial)
        if (isMain) {
            const spireGroup = new THREE.Group();
            spireGroup.position.y = currentY + 2.5;

            // Spire pole
            const poleGeometry = new THREE.CylinderGeometry(0.08, 0.12, 3, 8);
            const pole = new THREE.Mesh(poleGeometry, this.goldMaterial);
            pole.position.y = 1.5;
            spireGroup.add(pole);

            // Decorative rings on the spire
            for (let i = 0; i < 4; i++) {
                const ringGeometry = new THREE.TorusGeometry(0.2 - i * 0.03, 0.05, 8, 16);
                const ring = new THREE.Mesh(ringGeometry, this.goldMaterial);
                ring.rotation.x = Math.PI / 2;
                ring.position.y = 0.5 + i * 0.5;
                spireGroup.add(ring);
            }

            // Top ornament - glowing orb
            const orbGeometry = new THREE.SphereGeometry(0.25, 16, 16);
            const orbMaterial = new THREE.MeshStandardMaterial({
                color: 0xffd700,
                emissive: 0xffaa00,
                emissiveIntensity: 0.8,
                metalness: 0.9,
                roughness: 0.1
            });
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            orb.position.y = 3.2;
            spireGroup.add(orb);

            // Light at the top to make it visible
            const topLight = new THREE.PointLight(0xffdd88, 0.5, 10);
            topLight.position.y = 3.2;
            spireGroup.add(topLight);

            group.add(spireGroup);
        }

        this.castle.add(group);
    }

    createSpiralStairs(parent, towerX, towerZ, baseSize, levels, isMain) {
        const wallHeight = isMain ? 3 : 3.5;
        const totalHeight = (wallHeight + 1) * levels;
        const stepsPerLevel = 32;
        const totalSteps = stepsPerLevel * levels;
        const radius = baseSize / 2 + 1.5;

        // Create entry ramp from ground level (y=0) up to the spiral stairs start (y=2)
        // Use fewer, longer steps that are spaced further apart
        const entrySteps = 3;
        const entryAngle = 0; // Start angle for spiral stairs
        for (let i = 0; i < entrySteps; i++) {
            const stepY = (i + 1) * 0.65; // ~0.65 units per step
            const stepX = Math.cos(entryAngle) * (radius + 3 - i * 1.2);
            const stepZ = Math.sin(entryAngle) * (radius + 3 - i * 1.2);

            // Visual step - wide platform-like steps
            const stepGeometry = new THREE.BoxGeometry(5.0, 0.25, 3.0);
            const step = new THREE.Mesh(stepGeometry, this.woodMaterial);
            step.position.set(stepX, stepY, stepZ);
            step.rotation.y = entryAngle + Math.PI / 2;
            step.castShadow = true;
            step.receiveShadow = true;
            parent.add(step);

            // Collision for entry step - wide platforms
            this.physicsSystem.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(towerX + stepX, stepY, towerZ + stepZ),
                size: new THREE.Vector3(6.0, 0.3, 4.0)
            });
        }

        // Create visual steps
        for (let i = 0; i < totalSteps; i++) {
            const angle = (i / stepsPerLevel) * Math.PI * 2;
            const y = 2 + (i / totalSteps) * totalHeight;

            const stepX = Math.cos(angle) * radius;
            const stepZ = Math.sin(angle) * radius;

            const stepGeometry = new THREE.BoxGeometry(2.5, 0.3, 1.5);
            const step = new THREE.Mesh(stepGeometry, this.woodMaterial);
            step.position.set(stepX, y, stepZ);
            step.rotation.y = angle + Math.PI / 2;
            step.castShadow = true;
            step.receiveShadow = true;
            parent.add(step);

            // Support posts
            if (i % 6 === 0) {
                const postGeometry = new THREE.CylinderGeometry(0.08, 0.08, y, 8);
                const post = new THREE.Mesh(postGeometry, this.darkWoodMaterial);
                post.position.set(stepX, y / 2, stepZ);
                post.castShadow = true;
                parent.add(post);
            }
        }

        // Create collision for each visual step - more accurate than segments
        // Use every 4th step for collision to reduce overlap issues
        for (let i = 0; i < totalSteps; i += 4) {
            const angle = (i / stepsPerLevel) * Math.PI * 2;
            const y = 2 + (i / totalSteps) * totalHeight;

            const stepX = Math.cos(angle) * radius;
            const stepZ = Math.sin(angle) * radius;

            // Create collision box aligned with step
            // Use larger box to cover multiple visual steps
            this.physicsSystem.addStaticBody({
                type: 'box',
                position: new THREE.Vector3(towerX + stepX, y, towerZ + stepZ),
                size: new THREE.Vector3(4.0, 0.3, 3.5)
            });
        }
    }

    createTowerPlatform(parent, towerX, towerZ, size, y) {
        // Circular walkable platform at tower level
        const platformGeometry = new THREE.CylinderGeometry(size, size, 0.3, 8);
        const platform = new THREE.Mesh(platformGeometry, this.woodMaterial);
        platform.position.y = y + 0.15;
        platform.castShadow = true;
        platform.receiveShadow = true;
        parent.add(platform);

        // Add physics for platform
        this.physicsSystem.addStaticBody({
            type: 'box',
            position: new THREE.Vector3(towerX, y + 0.15, towerZ),
            size: new THREE.Vector3(size * 2, 0.3, size * 2)
        });
    }

    createRoof(parent, size, y) {
        const roofGeometry = new THREE.BoxGeometry(size, 0.3, size);
        const roof = new THREE.Mesh(roofGeometry, this.roofMaterial);
        roof.position.y = y + 0.15;
        roof.castShadow = true;
        parent.add(roof);

        // Curved edges
        const edgeGeometry = new THREE.TorusGeometry(size / 2, 0.15, 4, 4, Math.PI / 2);

        for (let i = 0; i < 4; i++) {
            const edge = new THREE.Mesh(edgeGeometry, this.roofMaterial);
            edge.rotation.x = Math.PI / 2;
            edge.rotation.z = (Math.PI / 2) * i;
            edge.position.y = y;

            const angle = (Math.PI / 4) + (Math.PI / 2) * i;
            edge.position.x = Math.cos(angle) * size / 2;
            edge.position.z = Math.sin(angle) * size / 2;

            parent.add(edge);
        }
    }

    createPagodaRoof(parent, size, y, isMain) {
        // Multi-tiered pagoda roof
        const tiers = isMain ? 3 : 2;

        for (let t = 0; t < tiers; t++) {
            const tierSize = size - t * 0.4;
            const tierY = y + t * 0.8;

            // Curved roof section
            const roofShape = new THREE.Shape();
            roofShape.moveTo(-tierSize / 2, 0);
            roofShape.quadraticCurveTo(0, 0.8, tierSize / 2, 0);
            roofShape.lineTo(tierSize / 2 - 0.2, -0.2);
            roofShape.lineTo(-tierSize / 2 + 0.2, -0.2);
            roofShape.closePath();

            const extrudeSettings = {
                steps: 1,
                depth: tierSize,
                bevelEnabled: false
            };

            const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
            const roof1 = new THREE.Mesh(roofGeometry, this.roofMaterial);
            roof1.position.set(0, tierY, -tierSize / 2);
            roof1.castShadow = true;
            parent.add(roof1);

            const roof2 = roof1.clone();
            roof2.rotation.y = Math.PI / 2;
            roof2.position.set(-tierSize / 2, tierY, 0);
            parent.add(roof2);

            const roof3 = roof1.clone();
            roof3.rotation.y = Math.PI;
            roof3.position.set(0, tierY, tierSize / 2);
            parent.add(roof3);

            const roof4 = roof1.clone();
            roof4.rotation.y = -Math.PI / 2;
            roof4.position.set(tierSize / 2, tierY, 0);
            parent.add(roof4);
        }
    }

    addWindows(parent, size, y) {
        const windowGeometry = new THREE.PlaneGeometry(0.8, 1.2);

        // Four sides
        for (let i = 0; i < 4; i++) {
            const window1 = new THREE.Mesh(windowGeometry, this.paperMaterial);
            window1.rotation.y = (Math.PI / 2) * i;

            const offset = size / 2 + 0.01;
            switch (i) {
                case 0:
                    window1.position.set(0, y, offset);
                    break;
                case 1:
                    window1.position.set(offset, y, 0);
                    break;
                case 2:
                    window1.position.set(0, y, -offset);
                    break;
                case 3:
                    window1.position.set(-offset, y, 0);
                    break;
            }

            parent.add(window1);

            // Add glow behind window
            const glowLight = new THREE.PointLight(0xffaa44, 0.5, 3);
            glowLight.position.copy(window1.position);
            parent.add(glowLight);
        }
    }

    createConnectingBuilding(x, z, width, depth, height) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Main structure
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const building = new THREE.Mesh(buildingGeometry, this.woodMaterial);
        building.position.y = height / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);

        // Physics
        this.physicsSystem.addStaticBody({
            type: 'box',
            position: new THREE.Vector3(x, height / 2, z),
            size: new THREE.Vector3(width, height, depth)
        });

        // Roof
        this.createSimpleRoof(group, width + 1, depth + 1, height);

        this.castle.add(group);
    }

    createSimpleRoof(parent, width, depth, y) {
        const roofGeometry = new THREE.BoxGeometry(width, 0.4, depth);
        const roof = new THREE.Mesh(roofGeometry, this.roofMaterial);
        roof.position.y = y + 0.2;
        roof.castShadow = true;
        parent.add(roof);
    }

    createWallsAndTowers() {
        // Outer walls
        const wallHeight = 5;
        const wallThickness = 1;

        // North wall
        this.createWall(-40, -40, 80, wallThickness, wallHeight, 0);
        // South wall
        this.createWall(-40, 40, 80, wallThickness, wallHeight, 0);
        // East wall
        this.createWall(40, -40, wallThickness, 80, wallHeight, 0);
        // West wall
        this.createWall(-40, -40, wallThickness, 80, wallHeight, 0);

        // Corner watchtowers
        this.createWatchtower(-40, -40, 8);
        this.createWatchtower(40, -40, 8);
        this.createWatchtower(-40, 40, 8);
        this.createWatchtower(40, 40, 8);
    }

    createWall(x, z, width, depth, height, rotation) {
        const group = new THREE.Group();

        // Wall base
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const wall = new THREE.Mesh(wallGeometry, this.stoneMaterial);
        wall.position.set(x + width / 2, height / 2, z + depth / 2);
        wall.rotation.y = rotation;
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.castle.add(wall);

        // Physics
        this.physicsSystem.addStaticBody({
            type: 'box',
            position: new THREE.Vector3(x + width / 2, height / 2, z + depth / 2),
            size: new THREE.Vector3(width, height, depth)
        });

        // Battlements
        const merlonCount = Math.floor(width / 3);
        for (let i = 0; i < merlonCount; i++) {
            const merlonGeometry = new THREE.BoxGeometry(1, 1.5, depth);
            const merlon = new THREE.Mesh(merlonGeometry, this.stoneMaterial);
            merlon.position.set(x + 1.5 + i * 3, height + 0.75, z + depth / 2);
            merlon.castShadow = true;
            this.castle.add(merlon);
        }
    }

    createWatchtower(x, z, height) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Tower body
        const towerGeometry = new THREE.CylinderGeometry(2, 2.5, height, 8);
        const tower = new THREE.Mesh(towerGeometry, this.stoneMaterial);
        tower.position.y = height / 2;
        tower.castShadow = true;
        tower.receiveShadow = true;
        group.add(tower);

        // Conical roof
        const roofGeometry = new THREE.ConeGeometry(3, 3, 8);
        const roof = new THREE.Mesh(roofGeometry, this.roofMaterial);
        roof.position.y = height + 1.5;
        roof.castShadow = true;
        group.add(roof);

        // Torch
        this.addTorch(group, 2.5, height - 1, 0);

        this.castle.add(group);
    }

    createPlatforms() {
        // Training platforms
        this.createPlatform(-25, 0, 8, 0.5, 8);
        this.createPlatform(25, 0, 8, 0.5, 8);

        // Elevated walkways
        this.createWalkway(-20, 3, -35, 20, true);
        this.createWalkway(20, 3, -35, 20, true);
        this.createWalkway(-35, 3, -20, 20, false);
        this.createWalkway(35, 3, -20, 20, false);
    }

    createPlatform(x, z, width, height, depth) {
        const platformGeometry = new THREE.BoxGeometry(width, height, depth);
        const platform = new THREE.Mesh(platformGeometry, this.woodMaterial);
        platform.position.set(x, height / 2, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        this.castle.add(platform);

        // Physics
        this.physicsSystem.addStaticBody({
            type: 'box',
            position: new THREE.Vector3(x, height / 2, z),
            size: new THREE.Vector3(width, height, depth)
        });

        // Pillars
        const pillarPositions = [
            [-width / 2 + 0.3, -depth / 2 + 0.3],
            [width / 2 - 0.3, -depth / 2 + 0.3],
            [-width / 2 + 0.3, depth / 2 - 0.3],
            [width / 2 - 0.3, depth / 2 - 0.3]
        ];

        for (const [px, pz] of pillarPositions) {
            const pillarGeometry = new THREE.CylinderGeometry(0.15, 0.2, height, 8);
            const pillar = new THREE.Mesh(pillarGeometry, this.darkWoodMaterial);
            pillar.position.set(x + px, height / 2, z + pz);
            pillar.castShadow = true;
            this.castle.add(pillar);
        }
    }

    createWalkway(x, y, z, length, isNorthSouth) {
        const width = 2;
        const walkwayGeometry = new THREE.BoxGeometry(
            isNorthSouth ? width : length,
            0.3,
            isNorthSouth ? length : width
        );
        const walkway = new THREE.Mesh(walkwayGeometry, this.woodMaterial);
        walkway.position.set(
            x + (isNorthSouth ? 0 : length / 2),
            y,
            z + (isNorthSouth ? length / 2 : 0)
        );
        walkway.castShadow = true;
        walkway.receiveShadow = true;
        this.castle.add(walkway);

        // Railings
        const railingGeometry = new THREE.BoxGeometry(
            isNorthSouth ? 0.1 : length,
            0.8,
            isNorthSouth ? length : 0.1
        );

        for (let side = -1; side <= 1; side += 2) {
            const railing = new THREE.Mesh(railingGeometry, this.darkWoodMaterial);
            railing.position.set(
                x + (isNorthSouth ? side * (width / 2) : length / 2),
                y + 0.5,
                z + (isNorthSouth ? length / 2 : side * (width / 2))
            );
            this.castle.add(railing);
        }
    }

    createDecorations() {
        // Lanterns on ground with posts
        this.createGroundLantern(-5, 10);
        this.createGroundLantern(5, 10);
        this.createGroundLantern(-5, -10);
        this.createGroundLantern(5, -10);

        // Torii gates
        this.createToriiGate(0, 35);
        this.createToriiGate(0, -35);

        // Cherry blossom trees
        this.createTree(-30, 0, 10, 0xff69b4);
        this.createTree(30, 0, 10, 0xff69b4);
        this.createTree(-30, 0, -10, 0x90ee90);
        this.createTree(30, 0, -10, 0x90ee90);

        // Training dummies on ground
        this.createTrainingDummy(-25, 0, -2);
        this.createTrainingDummy(-25, 0, 2);
        this.createTrainingDummy(25, 0, -2);
        this.createTrainingDummy(25, 0, 2);

        // Weapon racks on ground
        this.createWeaponRack(-10, 5);
        this.createWeaponRack(10, 5);
    }

    createGroundLantern(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Post to hold lantern
        const postGeometry = new THREE.CylinderGeometry(0.08, 0.1, 2.5, 8);
        const post = new THREE.Mesh(postGeometry, this.darkWoodMaterial);
        post.position.y = 1.25;
        post.castShadow = true;
        group.add(post);

        // Lantern body at top of post
        const lanternGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.6);
        const lantern = new THREE.Mesh(lanternGeometry, this.paperMaterial);
        lantern.position.y = 2.5;
        group.add(lantern);

        // Frame
        const frameGeometry = new THREE.BoxGeometry(0.65, 0.1, 0.65);
        const topFrame = new THREE.Mesh(frameGeometry, this.darkWoodMaterial);
        topFrame.position.y = 2.9;
        group.add(topFrame);

        const bottomFrame = topFrame.clone();
        bottomFrame.position.y = 2.1;
        group.add(bottomFrame);

        // Light
        const light = new THREE.PointLight(0xffaa44, 0.8, 8);
        light.position.y = 2.5;
        light.castShadow = true;
        light.shadow.mapSize.width = 256;
        light.shadow.mapSize.height = 256;
        group.add(light);

        this.lights.push(light);
        this.castle.add(group);
    }

    createLantern(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Lantern body
        const lanternGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.6);
        const lantern = new THREE.Mesh(lanternGeometry, this.paperMaterial);
        group.add(lantern);

        // Frame
        const frameGeometry = new THREE.BoxGeometry(0.65, 0.1, 0.65);
        const topFrame = new THREE.Mesh(frameGeometry, this.darkWoodMaterial);
        topFrame.position.y = 0.4;
        group.add(topFrame);

        const bottomFrame = topFrame.clone();
        bottomFrame.position.y = -0.4;
        group.add(bottomFrame);

        // Light
        const light = new THREE.PointLight(0xffaa44, 0.8, 8);
        light.castShadow = true;
        light.shadow.mapSize.width = 256;
        light.shadow.mapSize.height = 256;
        group.add(light);

        this.lights.push(light);
        this.castle.add(group);
    }

    createToriiGate(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0xcc0000,
            roughness: 0.6,
            metalness: 0.1
        });

        // Posts
        const postGeometry = new THREE.CylinderGeometry(0.3, 0.35, 8, 12);
        const leftPost = new THREE.Mesh(postGeometry, postMaterial);
        leftPost.position.set(-3, 4, 0);
        leftPost.castShadow = true;
        group.add(leftPost);

        const rightPost = leftPost.clone();
        rightPost.position.set(3, 4, 0);
        group.add(rightPost);

        // Top beam
        const topBeamGeometry = new THREE.BoxGeometry(8, 0.5, 0.8);
        const topBeam = new THREE.Mesh(topBeamGeometry, postMaterial);
        topBeam.position.y = 8;
        topBeam.castShadow = true;
        group.add(topBeam);

        // Secondary beam
        const secBeam = new THREE.Mesh(topBeamGeometry, postMaterial);
        secBeam.position.y = 7;
        secBeam.scale.set(0.85, 0.8, 0.8);
        group.add(secBeam);

        // Curved top
        const curveGeometry = new THREE.TorusGeometry(4, 0.25, 8, 16, Math.PI);
        const curve = new THREE.Mesh(curveGeometry, postMaterial);
        curve.rotation.z = Math.PI;
        curve.position.y = 8.3;
        group.add(curve);

        this.castle.add(group);
    }

    createTree(x, y, z, leafColor) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3020,
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        trunk.castShadow = true;
        group.add(trunk);

        // Branches/leaves as multiple spheres
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: leafColor,
            roughness: 0.8
        });

        const leafPositions = [
            [0, 4.5, 0, 2],
            [-1, 3.5, 0.5, 1.2],
            [1, 4, -0.5, 1.3],
            [0.5, 3, 1, 1],
            [-0.5, 5, -0.5, 1]
        ];

        for (const [lx, ly, lz, size] of leafPositions) {
            const leafGeometry = new THREE.SphereGeometry(size, 8, 8);
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.position.set(lx, ly, lz);
            leaf.castShadow = true;
            group.add(leaf);
        }

        this.castle.add(group);
    }

    createTrainingDummy(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const dummyMaterial = new THREE.MeshStandardMaterial({
            color: 0xc4a574,
            roughness: 0.9
        });

        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.25, 1.2, 8);
        const body = new THREE.Mesh(bodyGeometry, dummyMaterial);
        body.position.y = 0.8;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const head = new THREE.Mesh(headGeometry, dummyMaterial);
        head.position.y = 1.6;
        head.castShadow = true;
        group.add(head);

        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6);
        const leftArm = new THREE.Mesh(armGeometry, dummyMaterial);
        leftArm.position.set(-0.5, 1, 0);
        leftArm.rotation.z = Math.PI / 2;
        group.add(leftArm);

        const rightArm = leftArm.clone();
        rightArm.position.set(0.5, 1, 0);
        group.add(rightArm);

        // Post
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6);
        const post = new THREE.Mesh(postGeometry, this.woodMaterial);
        post.position.y = 0.1;
        group.add(post);

        this.castle.add(group);
    }

    createWeaponRack(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Frame
        const frameMaterial = this.woodMaterial;
        const frameGeometry = new THREE.BoxGeometry(2, 0.1, 0.3);

        const topFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        topFrame.position.y = 1.5;
        group.add(topFrame);

        const bottomFrame = topFrame.clone();
        bottomFrame.position.y = 0.5;
        group.add(bottomFrame);

        // Legs
        const legGeometry = new THREE.BoxGeometry(0.1, 1.6, 0.3);
        const leftLeg = new THREE.Mesh(legGeometry, frameMaterial);
        leftLeg.position.set(-0.9, 0.8, 0);
        group.add(leftLeg);

        const rightLeg = leftLeg.clone();
        rightLeg.position.set(0.9, 0.8, 0);
        group.add(rightLeg);

        // Swords
        const swordMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.9,
            roughness: 0.2
        });

        for (let i = 0; i < 3; i++) {
            const bladeGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.02);
            const blade = new THREE.Mesh(bladeGeometry, swordMaterial);
            blade.position.set(-0.5 + i * 0.5, 1, 0);
            blade.rotation.z = 0.1;
            group.add(blade);

            const handleGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.03);
            const handle = new THREE.Mesh(handleGeometry, this.darkWoodMaterial);
            handle.position.set(-0.5 + i * 0.5, 0.5, 0);
            handle.rotation.z = 0.1;
            group.add(handle);
        }

        this.castle.add(group);
    }

    addTorch(parent, x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Torch holder
        const holderGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.4, 6);
        const holder = new THREE.Mesh(holderGeometry, this.darkWoodMaterial);
        holder.rotation.z = Math.PI / 6;
        group.add(holder);

        // Flame (emissive material)
        const flameGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
        const flameMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff4400,
            emissiveIntensity: 2
        });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.set(0.15, 0.3, 0);
        group.add(flame);

        // Light
        const light = new THREE.PointLight(0xff6600, 1, 15);
        light.position.set(0.15, 0.3, 0);
        light.castShadow = true;
        light.shadow.mapSize.width = 256;
        light.shadow.mapSize.height = 256;
        group.add(light);

        this.torches.push({ flame, light });
        parent.add(group);
    }

    createLighting() {
        // Ambient light (moonlight)
        const ambientLight = new THREE.AmbientLight(0xaaaadd, 2.0);
        this.scene.add(ambientLight);

        // Main directional light (moon)
        const moonLight = new THREE.DirectionalLight(0xffffff, 3.0);
        moonLight.position.set(50, 100, 50);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        moonLight.shadow.camera.near = 10;
        moonLight.shadow.camera.far = 200;
        moonLight.shadow.camera.left = -60;
        moonLight.shadow.camera.right = 60;
        moonLight.shadow.camera.top = 60;
        moonLight.shadow.camera.bottom = -60;
        moonLight.shadow.bias = -0.001;
        this.scene.add(moonLight);

        // Hemisphere light for sky/ground color variation
        const hemiLight = new THREE.HemisphereLight(0x9090d0, 0x606060, 2.0);
        this.scene.add(hemiLight);

        // Add scattered torches around the courtyard with posts
        const torchPositions = [
            [-10, 2.5, 20], [10, 2.5, 20],
            [-10, 2.5, -20], [10, 2.5, -20],
            [-30, 2.5, 0], [30, 2.5, 0],
            [-20, 2.5, 25], [20, 2.5, 25],
            [-20, 2.5, -25], [20, 2.5, -25]
        ];

        for (const [x, y, z] of torchPositions) {
            const torchGroup = new THREE.Group();
            torchGroup.position.set(x, 0, z);

            // Add wooden post from ground up to torch height
            const postGeometry = new THREE.CylinderGeometry(0.08, 0.1, y, 8);
            const post = new THREE.Mesh(postGeometry, this.darkWoodMaterial);
            post.position.y = y / 2;
            post.castShadow = true;
            torchGroup.add(post);

            // Add torch at top of post
            this.addTorch(torchGroup, 0, y, 0);
            this.castle.add(torchGroup);
        }
    }

    createSpawnPoints() {
        // Define enemy spawn locations around the perimeter
        const spawnLocations = [
            new THREE.Vector3(-35, 0, 0),
            new THREE.Vector3(35, 0, 0),
            new THREE.Vector3(0, 0, -35),
            new THREE.Vector3(0, 0, 35),
            new THREE.Vector3(-25, 0, -25),
            new THREE.Vector3(25, 0, -25),
            new THREE.Vector3(-25, 0, 25),
            new THREE.Vector3(25, 0, 25),
            // Elevated spawn points
            new THREE.Vector3(-20, 3, -35),
            new THREE.Vector3(20, 3, -35),
            new THREE.Vector3(-35, 3, -20),
            new THREE.Vector3(35, 3, -20)
        ];

        this.spawnPoints = spawnLocations;
    }

    createNavMesh() {
        // Create navigation points for AI pathfinding
        // Grid-based for simplicity
        for (let x = -35; x <= 35; x += 5) {
            for (let z = -35; z <= 35; z += 5) {
                // Skip positions inside buildings
                if (this.isInsideBuilding(x, z)) continue;

                this.navPoints.push(new THREE.Vector3(x, 0, z));
            }
        }

        // Add elevated nav points
        for (let i = -15; i <= 15; i += 5) {
            this.navPoints.push(new THREE.Vector3(-20, 3, i));
            this.navPoints.push(new THREE.Vector3(20, 3, i));
            this.navPoints.push(new THREE.Vector3(i, 3, -20));
            this.navPoints.push(new THREE.Vector3(i, 3, 20));
        }
    }

    isInsideBuilding(x, z) {
        // Check if position is inside main castle structures
        const buildings = [
            { x: 0, z: 0, size: 8 },
            { x: -15, z: -15, size: 6 },
            { x: 15, z: -15, size: 6 },
            { x: -15, z: 15, size: 6 },
            { x: 15, z: 15, size: 6 }
        ];

        for (const building of buildings) {
            if (Math.abs(x - building.x) < building.size / 2 &&
                Math.abs(z - building.z) < building.size / 2) {
                return true;
            }
        }

        return false;
    }

    getRandomSpawnPoint() {
        return this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)].clone();
    }

    getNearestNavPoint(position) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const point of this.navPoints) {
            const dist = position.distanceTo(point);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = point;
            }
        }

        return nearest;
    }

    getPathToTarget(from, to) {
        // Simple A* pathfinding through nav points
        const start = this.getNearestNavPoint(from);
        const end = this.getNearestNavPoint(to);

        if (!start || !end) return [to];

        // For now, return direct path (can be enhanced with full A*)
        return [start, end, to];
    }

    update(deltaTime, elapsedTime, camera) {
        // Animate torches (skip on low quality)
        const particleMultiplier = qualitySettings.get('particleMultiplier') || 1;
        if (particleMultiplier > 0.25) {
            for (const torch of this.torches) {
                const flicker = Math.sin(elapsedTime * 10) * 0.3 +
                    Math.sin(elapsedTime * 15) * 0.2 +
                    Math.sin(elapsedTime * 7) * 0.1;

                torch.light.intensity = 1 + flicker * 0.3;
                torch.flame.scale.y = 1 + flicker * 0.2;
                torch.flame.rotation.z = flicker * 0.2;
            }
        }

        // Animate water
        for (const obj of this.animatedObjects) {
            if (obj.type === 'water') {
                obj.mesh.position.y = 0.01 + Math.sin(elapsedTime * 2) * 0.02;
            }
        }

        // Frustum culling for performance
        if (camera) {
            this.updateFrustumCulling(camera);
        }
    }

    updateFrustumCulling(camera) {
        // Update frustum from camera
        this.projScreenMatrix.multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

        const drawDistance = qualitySettings.get('drawDistance') || 100;

        // Cull distant or off-screen objects
        this.castle.traverse((child) => {
            if (child.isMesh) {
                // Skip small objects
                if (!child.geometry.boundingSphere) {
                    child.geometry.computeBoundingSphere();
                }

                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);
                const distanceToCamera = worldPos.distanceTo(camera.position);

                // Distance culling
                if (distanceToCamera > drawDistance) {
                    child.visible = false;
                    return;
                }

                // Frustum culling
                if (child.geometry.boundingSphere) {
                    const sphere = child.geometry.boundingSphere.clone();
                    sphere.center.copy(worldPos);
                    child.visible = this.frustum.intersectsSphere(sphere);
                }
            }
        });
    }

    // Disable torch lights on low quality
    applyQualitySettings() {
        const shadows = qualitySettings.get('shadows');
        const particleMultiplier = qualitySettings.get('particleMultiplier') || 1;

        for (const torch of this.torches) {
            torch.light.castShadow = shadows;
            // Reduce light range on low quality
            torch.light.distance = particleMultiplier < 0.5 ? 8 : 15;
        }

        // Disable some lights on low quality
        if (particleMultiplier < 0.5) {
            for (let i = 0; i < this.lights.length; i++) {
                this.lights[i].visible = i % 2 === 0; // Show every other light
            }
        }
    }
}
