import * as C from '../utils/Constants.js';

export class MapObject extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, key) {
        super(scene, x, y, key);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        if (key === 'Mole' && scene.anims.exists('mole_move')) {
            this.play('mole_move');
        }

        // Nếu là MoleWithDiamond thì chạy anim moleWithDiamond_move
        if (key === 'MoleWithDiamond' && scene.anims.exists('moleWithDiamond_move')) {
            this.play('moleWithDiamond_move');
        }
    }

    // Hàm init để gán config sau khi được tạo ra
    init(config) {
        this.config = config;
        this.body.setSize(this.width, this.height);
        return this; 
    }

    grabbed() {
        let hook = this.scene.hook;
        if (!hook.isBacking && !hook.grabbedEntity) {
            hook.grabbedEntity = this;
            hook.sprite.setFrame(this.width < hook.sprite.width ? 2 : 1);
            this.body.setEnable(false);
        }
    }
}
export class RandomEffectMapObject extends MapObject {
    init(config) {
        super.init(config);

        // Tính toán giá trị và khối lượng ngẫu nhiên
        const randomBonus = Phaser.Math.Between(this.config.randomBonusRatioMin, this.config.randomBonusRatioMax) * this.config.bonusBase;
        const randomMass = Phaser.Math.Between(this.config.randomMassMin, this.config.randomMassMax);

        // Ghi đè lên config của riêng object này
        this.config.bonus = randomBonus;
        this.config.mass = randomMass;

        return this;
    }

    // Hàm đặc biệt được gọi khi thu thập xong
    onCollected(scene) {
        const roll = Math.random(); // random 0–1
        if (roll < 0.05) {
            // ✅ Calculate bonus based on level (every 5 levels +200)
            const levelGroup = Math.ceil(scene.player.level / 5); // 1, 2, 3, 4, 5, 6 (for levels 1-5, 6-10, etc.)
            const baseBonus = 300 + (levelGroup - 1) * 200; 
            const moneyBonus = Phaser.Math.Between(baseBonus, baseBonus + 300);
            scene.player.money += moneyBonus;
            scene.moneyText.setText('$' + scene.player.money);
            scene.sound.play('Money');
        } else if (roll < 0.1) {
            scene.player.addDynamite(1);
            if (scene.dynamiteText) {
                scene.dynamiteText.setText('x' + scene.player.dynamiteCount);
            }
        } else {
            const keys = [];
            for (let i = 1; i <= 17; i++) {
            keys.push(`Anh${i}`);
            }
            const imgKey = Phaser.Utils.Array.GetRandom(keys);
            
            // Use virtual dimensions for consistent display across devices
            const width = C.VIRTUAL_WIDTH;
            const height = C.VIRTUAL_HEIGHT;
            
            // Tạo overlay đen phía sau ảnh
            const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
            overlay.setDepth(1000); // Đặt ở layer cao
            overlay.setScrollFactor(0); // Fixed to camera
            
            // Lấy kích thước gốc của ảnh
            const tex = scene.textures.get(imgKey);
            const source = tex.getSourceImage();
            const imgW = source.width;
            const imgH = source.height;
            
            // Check if running on mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Calculate aspect ratios
            const screenAspect = width / height;
            const imageAspect = imgW / imgH;
            
            // Điều chỉnh tỷ lệ thành 4:3
            // Luôn dùng target aspect = 4:3
            let targetAspect = 4 / 3;
            let img;

            // Kích thước khung 4:3 bên trong màn hình
            let targetWidth, targetHeight;
            if (width / height > targetAspect) {
                // Màn hình rộng hơn 4:3 → fit theo chiều cao
                targetHeight = height;
                targetWidth = height * targetAspect;
            } else {
                // Màn hình hẹp hơn 4:3 → fit theo chiều rộng
                targetWidth = width;
                targetHeight = width / targetAspect;
            }

            // ⚡ Scale theo chiều RỘNG của khung 4:3 (ảnh sẽ bự ngang hơn)
            let scale = targetWidth / imgW;

            // Thêm ảnh
            img = scene.add.image(width / 2, height / 2, imgKey).setOrigin(0.5);
            img.setScale(scale);
            img.setDepth(1001);
            img.setScrollFactor(0);

            // ✅ Multiple methods để làm ảnh smooth
            img.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

            // ✅ Thêm CSS style cho canvas để render smooth
            if (scene.sys.game.canvas) {
                scene.sys.game.canvas.style.imageRendering = 'auto';
                scene.sys.game.canvas.style.imageRendering = '-webkit-optimize-contrast';
            }

            // Pause timer
            if (scene.timerEvent) scene.timerEvent.paused = true;

            // Flag tạm dừng gameplay
            scene.isImageOpen = true;

            // Tạo invisible overlay để chặn input xuống game phía dưới
            const inputBlocker = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.01);
            inputBlocker.setDepth(999);
            inputBlocker.setScrollFactor(0); // Fixed to camera
            inputBlocker.setInteractive();

            // Chỉ cho phép click vào ảnh để đóng
            img.setInteractive({ useHandCursor: true });
            img.once('pointerdown', () => {
                img.destroy();
                overlay.destroy();
                inputBlocker.destroy();

                // Resume gameplay
                scene.isImageOpen = false;
                if (scene.timerEvent) scene.timerEvent.paused = false;
            });
        }
    }
}
export class MoveAroundMapObject extends MapObject {
    init(config, dir) {
        super.init(config);
        this.dir = (dir === 'Left' ? -1 : 1);
        this.speed = config.speed;
        this.moveRange = config.moveRange;
        this.originalX = this.x;
        this.isFrozen = false; // Time freeze status

        this.setVelocityX(this.speed * 50 * this.dir);
        this.setFlipX(this.dir === -1);

        return this;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        // Skip movement if frozen
        if (this.isFrozen) {
            return;
        }

        // Di chuyển bằng cách thay đổi tọa độ X
        this.x += this.speed * this.dir;

        if (this.x > this.originalX + this.moveRange) {
            this.dir = -1;
            this.setFlipX(false);
        } else if (this.x < this.originalX - this.moveRange) {
            this.dir = 1;
            this.setFlipX(true);
        }
    }

    freezeMovement() {
        this.isFrozen = true;
        // Add visual effect - tint blue for frozen
        this.setTint(0x00bfff);
    }

    unfreezeMovement() {
        this.isFrozen = false;
        // Remove tint
        this.clearTint();
    }
}

export class ExplosiveMapObject extends MapObject {
    init(config) {
        super.init(config);
        this.hasExploded = false; // Flag để ngăn nổ nhiều lần
        return this;
    }

    // Viết đè lên hàm grabbed() của class cha
    grabbed() {
        let hook = this.scene.hook;
        if (!hook.isBacking) {
            this.explode();
        }
    }

    explode() {
        // Nếu đã nổ rồi hoặc đã bị phá hủy thì không nổ nữa
        if (this.hasExploded || !this.scene) return;
        
        this.hasExploded = true; // Đánh dấu đã nổ
        
        const scene = this.scene;
        const explosionRadius = 50; // Tăng bán kính nổ từ 60 lên 80

        // 0. NGAY LẬP TỨC: Force hook backing để không tiếp tục đi xuống
        if (scene.hook && !scene.hook.isBacking) {
            scene.hook.isBacking = true;
        }

        // 1. Tạo hiệu ứng nổ
        const explosionSprite = scene.add.sprite(this.x, this.y, 'bigger_explosive_fx_sheet');
        explosionSprite.play('tnt-explosion');
        explosionSprite.on('animationcomplete', () => {
            explosionSprite.destroy(); // Hủy sprite hiệu ứng sau khi chạy xong
        });
        // 2. Chơi âm thanh nổ
        scene.sound.play('Explosive');

        // 3. Tìm và phá hủy các vật phẩm xung quanh
        const objectsToDestroy = []; // Danh sách vật phẩm sẽ bị phá hủy
        const tntToExplode = []; // Danh sách TNT sẽ nổ dây chuyền
        
        scene.mapObjects.getChildren().forEach(child => {
            // Đảm bảo child vẫn còn tồn tại và không phải là chính TNT này
            if (child && child.body && child !== this) {
                const distance = Phaser.Math.Distance.Between(this.x, this.y, child.x, child.y);       
                if (distance < explosionRadius) {
                    // Nếu là TNT khác, thêm vào danh sách nổ dây chuyền
                    if (child instanceof ExplosiveMapObject) {
                        tntToExplode.push(child);
                    } else {
                        // Vật phẩm thường thì thêm vào danh sách phá hủy
                        objectsToDestroy.push(child);
                    }
                }
            }
        });

        // Phá hủy các vật phẩm thường
        objectsToDestroy.forEach(child => {
            // Nếu vật phẩm bị phá hủy là grabbedEntity, force reset hook
            if (scene.hook.grabbedEntity === child) {
                scene.hook.forceReset();
            }
            child.destroy();
        });

        // Nổ dây chuyền các TNT khác (với delay nhỏ để tạo hiệu ứng)
        tntToExplode.forEach((tnt, index) => {
            scene.time.delayedCall(100 + index * 50, () => {
                if (tnt && tnt.scene) { // Đảm bảo TNT vẫn tồn tại
                    tnt.explode();
                }
            });
        });
        
        // 4. Kiểm tra nếu hook đang kéo TNT này hoặc vật phẩm nào bị phá hủy
        if (scene.hook.grabbedEntity === this) {
            // Nếu hook đang kéo TNT, force reset hoàn toàn
            scene.hook.forceReset();
        }
        
        // 5. Cuối cùng, tự hủy chính thùng TNT
        this.destroy();
    }
}

// ✅ NEW: Special Effect Map Objects - Rare items with special powers
export class SpecialEffectMapObject extends MapObject {
    init(config) {
        super.init(config);
        this.effectType = config.effect;
        this.duration = config.duration || 0;
        this.isActivated = false;
        
        // ✅ Visual glow effect for rare items
        this.glowTween = this.scene.tweens.add({
            targets: this,
            alpha: 0.6,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        return this;
    }

    // Called when collected
    onCollected(scene) {
        if (this.isActivated) return; // Prevent double activation
        this.isActivated = true;
        
        // Stop glow effect
        if (this.glowTween) {
            this.glowTween.destroy();
        }
        
        switch (this.effectType) {
            case 'speed_boost':
                this.activateSpeedBoost(scene);
                break;
            case 'time_bonus':
                this.activateTimeBonus(scene);
                break;
            case 'magnet_pull':
                this.activateMagnetPull(scene);
                break;
            case 'lucky_streak':
                this.activateLuckyStreak(scene);
                break;
        }
        
        // Show special pickup effect
        this.showPickupEffect(scene);
    }

    activateSpeedBoost(scene) {
        scene.player.hasGoldenHook = true;
        scene.player.goldenHookTimer = this.duration;
        
        // UI notification
        const text = scene.add.text(scene.cameras.main.centerX, 60, 'Kéo nhanh gấp đôi!', {
            fontFamily: 'Kurland',
            fontSize: '14px',
            fill: '#05dc30ff',
            align: 'center'
        }).setOrigin(0.5);
        
        scene.tweens.add({
            targets: text,
            alpha: 0,
            duration: 3000,
            onComplete: () => text.destroy()
        });
    }

    activateTimeBonus(scene) {
        scene.timeLeft += this.config.timeAdd;
        scene.timeText.setText('Time: ' + scene.timeLeft);
        
        const text = scene.add.text(scene.cameras.main.centerX, 60, '+20 Giây! ⏰', {
            fontFamily: 'Kurland',
            fontSize: '16px',
            fill: '#05dc30ff',
            align: 'center'
        }).setOrigin(0.5);
        
        scene.tweens.add({
            targets: text,
            alpha: 0,
            y: 30,
            duration: 3000,
            onComplete: () => text.destroy()
        });
    }

    activateLuckyStreak(scene) {
        scene.player.hasLuckyStar = true;
        scene.player.luckyStreakCount = this.config.streakCount;
        
        const text = scene.add.text(scene.cameras.main.centerX, 60, '3 lần kéo may mắn! ☘', {
            fontFamily: 'Kurland',
            fontSize: '14px',
            fill: '#05dc30ff',
            align: 'center'
        }).setOrigin(0.5);
        
        scene.tweens.add({
            targets: text,
            alpha: 0,
            duration: 3000,
            onComplete: () => text.destroy()
        });
    }

    showPickupEffect(scene) {
        // Create sparkle effect
        const sparkles = [];
        for (let i = 0; i < 8; i++) {
            const sparkle = scene.add.image(this.x, this.y, 'light');
            sparkle.setScale(0.3);
            sparkle.setTint(Phaser.Display.Color.HSVToRGB(Math.random(), 0.8, 1).color);
            sparkles.push(sparkle);
            
            scene.tweens.add({
                targets: sparkle,
                x: this.x + Phaser.Math.Between(-50, 50),
                y: this.y + Phaser.Math.Between(-50, 50),
                scale: 0,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => sparkle.destroy()
            });
        }
    }

    destroy() {
        if (this.glowTween) {
            this.glowTween.destroy();
        }
        super.destroy();
    }
}

// ✅ Boss Mole - Large, tough enemy with multiple hit points
export class BossMoveAroundMapObject extends MoveAroundMapObject {
    init(config, dir) {
        super.init(config, dir);
        
        // Boss-specific properties
        this.maxHp = config.hp || 3;
        this.currentHp = this.maxHp;
        this.isBoss = true;
        
        // Visual enhancements
        this.setScale(config.scale || 3);
        this.setTint(0xff6600); // Orange tint to distinguish from normal moles
        
        // Boss glow effect
        this.bossGlow = this.scene.tweens.add({
            targets: this,
            alpha: 0.7,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Screen shake when boss appears
        this.scene.cameras.main.shake(200, 0.01);
        
        // Boss entrance message
        const bossText = this.scene.add.text(this.scene.cameras.main.centerX, 60, 'BOSS XUẤT HIỆN! 🐭💀', {
            fontFamily: 'Kurland',
            fontSize: '16px',
            fill: '#ff0000',
            stroke: '#ffffff',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: bossText,
            alpha: 0,
            y: 30,
            duration: 3000,
            onComplete: () => bossText.destroy()
        });
        
        return this;
    }

    // Override grabbed to handle multiple hits
    grabbed() {
        let hook = this.scene.hook;
        if (!hook.isBacking && !hook.grabbedEntity) {
            // Take damage
            this.currentHp--;
            
            // Visual damage feedback
            this.setTint(0xff0000); // Red flash
            this.scene.time.delayedCall(200, () => {
                this.setTint(0xff6600); // Back to orange
            });
            
            // Screen shake on hit
            this.scene.cameras.main.shake(100, 0.005);
            
            if (this.currentHp <= 0) {
                // Boss defeated - normal grab behavior
                hook.grabbedEntity = this;
                hook.sprite.setFrame(this.width < hook.sprite.width ? 2 : 1);
                this.body.setEnable(false);
                
                // Boss defeat effects
                this.showBossDefeatEffect();
            } else {
                // Boss still alive - show HP and reject grab
                this.showDamageText();
                hook.forceReset(); // Force hook to retract
            }
        }
    }

    showDamageText() {
        const damageText = this.scene.add.text(this.x, this.y - 30, `HP: ${this.currentHp}/${this.maxHp}`, {
            fontFamily: 'Kurland',
            fontSize: '14px',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: damageText,
            alpha: 0,
            y: this.y - 50,
            duration: 1500,
            onComplete: () => damageText.destroy()
        });
    }

    showBossDefeatEffect() {
        // Victory message with dynamic bonus display
        const bonusAmount = this.config.bonus || 2500;
        const victoryText = this.scene.add.text(this.scene.cameras.main.centerX, 80, `BOSS ĐÃ BỊ ĐÁNH BẠI! 🏆\n+${bonusAmount} Gold!`, {
            fontFamily: 'Kurland',
            fontSize: '16px',
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: victoryText,
            alpha: 0,
            duration: 4000,
            onComplete: () => victoryText.destroy()
        });
        
        // Explosion effect
        for (let i = 0; i < 12; i++) {
            const sparkle = this.scene.add.image(this.x, this.y, 'light');
            sparkle.setScale(0.5);
            sparkle.setTint(Phaser.Display.Color.HSVToRGB(i / 12, 0.8, 1).color);
            
            this.scene.tweens.add({
                targets: sparkle,
                x: this.x + Phaser.Math.Between(-80, 80),
                y: this.y + Phaser.Math.Between(-80, 80),
                scale: 0,
                alpha: 0,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => sparkle.destroy()
            });
        }
    }

    destroy() {
        if (this.bossGlow) {
            this.bossGlow.destroy();
        }
        super.destroy();
    }

    // Override freeze methods to handle boss tinting properly
    freezeMovement() {
        this.isFrozen = true;
        // Mix blue with orange for frozen boss
        this.setTint(0x00aacc); // Blue-orange mix
    }

    unfreezeMovement() {
        this.isFrozen = false;
        // Return to boss orange tint
        this.setTint(0xff6600);
    }
}
