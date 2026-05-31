/**
 * UI Manager - Handles all HUD elements and UI updates
 */

export class UIManager {
    constructor(game) {
        this.game = game;
        this.player = game.player;

        // DOM elements
        this.healthBar = document.getElementById('health-bar');
        this.healthValue = document.getElementById('health-value');
        this.staminaBar = document.getElementById('stamina-bar');
        this.staminaValue = document.getElementById('stamina-value');
        this.scoreDisplay = document.getElementById('score');
        this.waveInfo = document.getElementById('wave-info');
        this.enemyCount = document.getElementById('enemy-count');
        this.damageOverlay = document.getElementById('damage-overlay');
        this.notification = document.getElementById('notification');

        // Ability slots
        this.abilitySlots = [
            document.getElementById('ability-1'),
            document.getElementById('ability-2'),
            document.getElementById('ability-3'),
            document.getElementById('ability-4')
        ];

        this.abilityNames = ['slash', 'spin', 'dash', 'fireBlast'];

        // Damage overlay animation
        this.damageOpacity = 0;

        // Notification queue
        this.notificationQueue = [];
        this.notificationActive = false;
    }

    update() {
        this.updateHealthBar();
        this.updateStaminaBar();
        this.updateScore();
        this.updateWaveInfo();
        this.updateAbilities();
        this.updateDamageOverlay();
    }

    updateHealthBar() {
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        this.healthBar.style.width = `${healthPercent}%`;
        this.healthValue.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;

        // Change color when low
        if (healthPercent < 25) {
            this.healthBar.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
            this.healthBar.style.animation = 'pulse 0.5s ease infinite';
        } else if (healthPercent < 50) {
            this.healthBar.style.background = 'linear-gradient(90deg, #ff6600, #ff8844)';
            this.healthBar.style.animation = 'none';
        } else {
            this.healthBar.style.background = 'linear-gradient(90deg, #e94560, #ff6b6b)';
            this.healthBar.style.animation = 'none';
        }
    }

    updateStaminaBar() {
        const staminaPercent = (this.player.stamina / this.player.maxStamina) * 100;
        this.staminaBar.style.width = `${staminaPercent}%`;
        this.staminaValue.textContent = `${Math.ceil(this.player.stamina)}/${this.player.maxStamina}`;

        // Dim when low
        if (staminaPercent < 20) {
            this.staminaBar.style.opacity = '0.6';
        } else {
            this.staminaBar.style.opacity = '1';
        }
    }

    updateScore() {
        this.scoreDisplay.textContent = `Score: ${this.game.score.toLocaleString()}`;
    }

    updateWaveInfo() {
        const levelNumber = this.game.levelSystem?.getLevelNumber?.() || this.game.wave;
        const levelTitle = this.game.levelSystem?.getCurrentLevel?.()?.title;
        this.waveInfo.textContent = levelTitle
            ? `Level ${levelNumber}: ${levelTitle}`
            : `Wave ${this.game.wave}`;

        const enemyRemaining = this.game.waveSystem.getEnemiesRemaining();
        const details = [`Enemies: ${enemyRemaining}`];

        if (this.game.allies?.length) {
            details.push(`Team: ${this.game.allies.length}`);
        }

        if (this.game.bossEnemy) {
            const bossMaxHealth = this.game.bossEnemy.maxHealth || this.game.bossEnemy.health || 1;
            const bossPercent = Math.max(0, Math.ceil((this.game.bossEnemy.health / bossMaxHealth) * 100));
            details.push(`Boss: ${bossPercent}%`);
        }

        this.enemyCount.textContent = details.join(' | ');
    }

    updateAbilities() {
        const cooldowns = this.player.getAbilityCooldowns();

        this.abilityNames.forEach((name, index) => {
            const slot = this.abilitySlots[index];
            const cooldown = cooldowns[name];

            if (cooldown.ready) {
                slot.classList.remove('on-cooldown');
            } else {
                slot.classList.add('on-cooldown');
                const cooldownDisplay = slot.querySelector('.ability-cooldown');
                cooldownDisplay.textContent = Math.ceil(cooldown.current);
            }

            // Check if player has enough stamina
            const ability = this.player.abilities[name];
            if (this.player.stamina < ability.staminaCost) {
                slot.style.opacity = '0.5';
            } else {
                slot.style.opacity = '1';
            }
        });
    }

    updateDamageOverlay() {
        if (this.damageOpacity > 0) {
            this.damageOpacity -= 0.05;
            this.damageOverlay.style.opacity = this.damageOpacity;
        }
    }

    showDamageEffect() {
        this.damageOpacity = 0.8;
        this.damageOverlay.style.opacity = this.damageOpacity;
    }

    showNotification(text) {
        this.notificationQueue.push(text);

        if (!this.notificationActive) {
            this.processNotificationQueue();
        }
    }

    processNotificationQueue() {
        if (this.notificationQueue.length === 0) {
            this.notificationActive = false;
            return;
        }

        this.notificationActive = true;
        const text = this.notificationQueue.shift();

        this.notification.textContent = text;
        this.notification.style.opacity = '1';
        this.notification.style.transform = 'translateX(-50%) scale(1.2)';

        setTimeout(() => {
            this.notification.style.transform = 'translateX(-50%) scale(1)';
        }, 100);

        setTimeout(() => {
            this.notification.style.opacity = '0';
            setTimeout(() => {
                this.processNotificationQueue();
            }, 300);
        }, 2000);
    }

    showComboNotification(combo) {
        if (combo >= 3) {
            const comboTexts = ['', '', '', 'COMBO x3!', 'COMBO x4!', 'MEGA COMBO!'];
            this.showNotification(comboTexts[Math.min(combo, 5)]);
        }
    }
}
