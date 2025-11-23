/**
 * Minimap - Radar-style minimap showing player, enemies, and environment
 */

export class Minimap {
    constructor(player, aiSystem, castle) {
        this.player = player;
        this.aiSystem = aiSystem;
        this.castle = castle;

        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Minimap settings
        this.size = 150;
        this.scale = 2; // 1 unit = 2 pixels
        this.range = 40; // Units visible on map

        // Setup canvas
        this.canvas.width = this.size;
        this.canvas.height = this.size;

        // Colors
        this.colors = {
            background: 'rgba(0, 0, 0, 0.3)',
            player: '#00ff00',
            enemy: '#ff0000',
            building: 'rgba(100, 100, 100, 0.5)',
            wall: 'rgba(150, 150, 150, 0.5)',
            spawn: 'rgba(255, 200, 0, 0.3)'
        };
    }

    update() {
        this.clear();
        this.drawBackground();
        this.drawEnvironment();
        this.drawEnemies();
        this.drawPlayer();
        this.drawBorder();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.size, this.size);
    }

    drawBackground() {
        // Circular clip
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(this.size / 2, this.size / 2, this.size / 2 - 2, 0, Math.PI * 2);
        this.ctx.clip();

        // Background
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.size, this.size);

        // Grid lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        const center = this.size / 2;
        const gridSize = 10 * this.scale;

        for (let i = -5; i <= 5; i++) {
            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(0, center + i * gridSize);
            this.ctx.lineTo(this.size, center + i * gridSize);
            this.ctx.stroke();

            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(center + i * gridSize, 0);
            this.ctx.lineTo(center + i * gridSize, this.size);
            this.ctx.stroke();
        }

        // Range circles
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        for (let r = 1; r <= 3; r++) {
            this.ctx.beginPath();
            this.ctx.arc(center, center, r * 20, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    drawEnvironment() {
        const center = this.size / 2;

        // Draw main castle buildings (simplified rectangles)
        const buildings = [
            { x: 0, z: 0, w: 8, h: 8 },       // Main tower
            { x: -15, z: -15, w: 6, h: 6 },   // Corner tower
            { x: 15, z: -15, w: 6, h: 6 },
            { x: -15, z: 15, w: 6, h: 6 },
            { x: 15, z: 15, w: 6, h: 6 }
        ];

        this.ctx.fillStyle = this.colors.building;

        for (const building of buildings) {
            const relX = building.x - this.player.position.x;
            const relZ = building.z - this.player.position.z;

            // Rotate based on player rotation
            const rotatedX = relX * Math.cos(-this.player.rotation.y) - relZ * Math.sin(-this.player.rotation.y);
            const rotatedZ = relX * Math.sin(-this.player.rotation.y) + relZ * Math.cos(-this.player.rotation.y);

            const screenX = center + rotatedX * this.scale;
            const screenY = center - rotatedZ * this.scale;

            this.ctx.save();
            this.ctx.translate(screenX, screenY);
            this.ctx.rotate(-this.player.rotation.y);
            this.ctx.fillRect(
                -building.w * this.scale / 2,
                -building.h * this.scale / 2,
                building.w * this.scale,
                building.h * this.scale
            );
            this.ctx.restore();
        }

        // Draw outer walls
        this.ctx.strokeStyle = this.colors.wall;
        this.ctx.lineWidth = 2;

        const wallCorners = [
            { x: -40, z: -40 },
            { x: 40, z: -40 },
            { x: 40, z: 40 },
            { x: -40, z: 40 }
        ];

        this.ctx.beginPath();
        for (let i = 0; i < wallCorners.length; i++) {
            const corner = wallCorners[i];
            const relX = corner.x - this.player.position.x;
            const relZ = corner.z - this.player.position.z;

            const rotatedX = relX * Math.cos(-this.player.rotation.y) - relZ * Math.sin(-this.player.rotation.y);
            const rotatedZ = relX * Math.sin(-this.player.rotation.y) + relZ * Math.cos(-this.player.rotation.y);

            const screenX = center + rotatedX * this.scale;
            const screenY = center - rotatedZ * this.scale;

            if (i === 0) {
                this.ctx.moveTo(screenX, screenY);
            } else {
                this.ctx.lineTo(screenX, screenY);
            }
        }
        this.ctx.closePath();
        this.ctx.stroke();
    }

    drawEnemies() {
        const center = this.size / 2;
        const enemies = this.aiSystem.getEnemies();

        for (const enemy of enemies) {
            const relX = enemy.position.x - this.player.position.x;
            const relZ = enemy.position.z - this.player.position.z;

            // Skip if too far
            const distance = Math.sqrt(relX * relX + relZ * relZ);
            if (distance > this.range) continue;

            // Rotate based on player rotation
            const rotatedX = relX * Math.cos(-this.player.rotation.y) - relZ * Math.sin(-this.player.rotation.y);
            const rotatedZ = relX * Math.sin(-this.player.rotation.y) + relZ * Math.cos(-this.player.rotation.y);

            const screenX = center + rotatedX * this.scale;
            const screenY = center - rotatedZ * this.scale;

            // Enemy color based on type
            let color = this.colors.enemy;
            let size = 3;

            switch (enemy.type) {
                case 'warrior':
                    color = '#ff6600';
                    size = 4;
                    break;
                case 'assassin':
                    color = '#aa00ff';
                    size = 3;
                    break;
                case 'boss':
                    color = '#ffff00';
                    size = 6;
                    break;
            }

            // Draw enemy dot
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw enemy direction indicator
            const enemyAngle = enemy.rotation - this.player.rotation.y;
            const indicatorLength = 5;
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY);
            this.ctx.lineTo(
                screenX + Math.sin(enemyAngle) * indicatorLength,
                screenY - Math.cos(enemyAngle) * indicatorLength
            );
            this.ctx.stroke();
        }
    }

    drawPlayer() {
        const center = this.size / 2;

        // Player triangle (pointing up = forward)
        this.ctx.fillStyle = this.colors.player;
        this.ctx.beginPath();
        this.ctx.moveTo(center, center - 8);          // Top point
        this.ctx.lineTo(center - 5, center + 5);      // Bottom left
        this.ctx.lineTo(center + 5, center + 5);      // Bottom right
        this.ctx.closePath();
        this.ctx.fill();

        // Player glow
        this.ctx.shadowColor = this.colors.player;
        this.ctx.shadowBlur = 5;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    drawBorder() {
        this.ctx.restore();

        // Outer ring
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.size / 2, this.size / 2, this.size / 2 - 1, 0, Math.PI * 2);
        this.ctx.stroke();

        // Cardinal directions
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';

        const directions = [
            { text: 'N', x: this.size / 2, y: 12 },
            { text: 'S', x: this.size / 2, y: this.size - 4 },
            { text: 'E', x: this.size - 8, y: this.size / 2 + 4 },
            { text: 'W', x: 8, y: this.size / 2 + 4 }
        ];

        for (const dir of directions) {
            this.ctx.fillText(dir.text, dir.x, dir.y);
        }
    }
}
