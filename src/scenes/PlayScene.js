import * as C from '../utils/Constants.js';
import Player from '../entities/Player.js';
import Hook from '../entities/Hook.js';
import { MapObject, MoveAroundMapObject, ExplosiveMapObject, RandomEffectMapObject, SpecialEffectMapObject, BossMoveAroundMapObject } from '../entities/MapObject.js';
import entityConfig from '../utils/data/EntityConfig.js';
import { levels } from '../utils/data/Levels.js';
import ShopScene from './ShopScene.js';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayScene' });
    }

    init(data) {
        this.player = data.player;
        this.game.player = data.player;
    }
    
    create() {
        // ✅ Resume audio context when starting gameplay
        if (window.audioManager) {
            window.audioManager.forceResumeAudio();
        }

        const levelData = levels[this.player.realLevelStr];
        if (!levelData) {
        // Quay về menu để tránh làm sập game
        this.scene.start('MenuScene');
        return; 
        }
        this.add.image(0, 40, levelData.type).setOrigin(0);
        this.add.image(0, 0, 'LevelCommonTop').setOrigin(0);
        
        this.playerSprite = this.add.sprite(165, 39, 'playerSheet').setOrigin(0.5, 1);
        this.playerSprite.play('player-idle');
        
        // SỬA LỖI ĐIỂM THẢ DÂY: Tọa độ Y đã được hạ thấp xuống đúng vị trí cuộn dây
        this.hook = new Hook(this, this.playerSprite.x - 5, this.playerSprite.y - 16);
        this.mapObjects = this.physics.add.group();
        this.loadLevel(levelData);

        this.physics.add.overlap(this.hook.sprite, this.mapObjects, (hookSprite, mapObj) => {
            mapObj.grabbed();
        });
        this.input.on('pointerdown', () => {
        if (!this.isImageOpen) {
            this.hook.startGrabbing();
        }
    }, this);

    // 2. Thêm nút bấm thuốc nổ
    const dynamiteButton = this.add.image(this.playerSprite.x + 40, this.playerSprite.y - 17, 'Dynamite')
    .setInteractive()
    .setScale(0.7)
    .on('pointerdown', () => {
        if (!this.isImageOpen) {
            this.hook.useDynamite();
        }
    });
    //dynamiteButton.visible = false;
    this.dynamiteButton = dynamiteButton;
        
        this.input.keyboard.on('keydown-DOWN', () => {
            if (!this.isImageOpen) {
                this.hook.startGrabbing();
            }
        }, this);
        this.input.keyboard.on('keydown-SPACE', () => {
            if (!this.isImageOpen) {
                this.hook.startGrabbing();
            }
        }, this);
        
        // ✅ REMOVE old listener trước khi add mới để tránh duplicate
        this.events.off('entityGrabbed');
        this.events.on('entityGrabbed', this.onEntityGrabbed, this);

        this.createUI();
        this.timeLeft = 60;
        this.timerEvent = this.time.addEvent({
        delay: 1000,
        callback: this.updateTimer,
        callbackScope: this,
        loop: true
        });

    }

    update(time, delta) {
        if (this.isImageOpen) return; 
        const dt = delta / 1000;
        this.hook.update(dt);
        this.updatePlayerAnimation();
        
        // ✅ Update special item timers
        this.updateSpecialItemTimers(delta);
        
        // ✅ Magnet Stone auto-pull logic
        this.updateMagnetPull();
        
        if (this.dynamiteButton) {
            //this.dynamiteButton.visible = this.player.dynamiteCount > 0; // Chỉ kiểm tra dynamiteCount
            this.dynamiteButton.setPosition(this.playerSprite.x + 40, this.playerSprite.y - 17);
        }
        if (this.dynamiteText) {
        this.dynamiteText.setText('x' + this.player.dynamiteCount);
        }

    }

    updateSpecialItemTimers(delta) {
        // Golden Hook timer
        if (this.player.hasGoldenHook && this.player.goldenHookTimer > 0) {
            this.player.goldenHookTimer -= delta;
            if (this.player.goldenHookTimer <= 0) {
                this.player.hasGoldenHook = false;
                // Show expiry message
                const text = this.add.text(this.cameras.main.centerX, 70, 'Đã hết hiệu lực.', {
                    fontFamily: 'Kurland',
                    fontSize: '12px',
                    fill: '#07bf16ff'
                }).setOrigin(0.5);
                
                this.tweens.add({
                    targets: text,
                    alpha: 0,
                    duration: 3000,
                    onComplete: () => text.destroy()
                });
            }
        }

        // Magnet timer
        if (this.player.hasMagnetStone && this.player.magnetTimer > 0) {
            this.player.magnetTimer -= delta;
            if (this.player.magnetTimer <= 0) {
                this.player.hasMagnetStone = false;
                // Show expiry message
                const text = this.add.text(this.cameras.main.centerX, 70, 'ĐÃ HẾT HIỆU LỰC', {
                    fontFamily: 'Kurland',
                    fontSize: '12px',
                    fill: '#14ce68ff'
                }).setOrigin(0.5);
                
                this.tweens.add({
                    targets: text,
                    alpha: 0,
                    duration: 3000,
                    onComplete: () => text.destroy()
                });
            }
        }
    }

    updateMagnetPull() {
        // ✅ Magnet Stone auto-pull small items toward hook
        if (this.player.hasMagnetStone && this.player.magnetRadius > 0) {
            const itemsToAutoCollect = [];
            
            this.mapObjects.getChildren().forEach(obj => {
                // Only pull small/light objects
                if (obj.config && obj.config.mass <= 3.5 && obj.body.enable !== false) {
                    const distance = Phaser.Math.Distance.Between(
                        this.hook.sprite.x, this.hook.sprite.y, 
                        obj.x, obj.y
                    );
                    
                    // If hook is free (at start position) and item is close - normal grab
                    if (distance <= 30 && !this.hook.grabbedEntity && this.hook.hookLength === 0) {
                        obj.grabbed(); // Trigger normal grab behavior
                    }
                    // If hook is back to start position and item is close - auto-collect
                    else if (distance <= 30 && this.hook.hookLength === 0) {
                        itemsToAutoCollect.push(obj);
                    }
                    // Pull if within magnet radius
                    else if (distance <= this.player.magnetRadius && distance > 20) {
                        const angle = Phaser.Math.Angle.Between(
                            obj.x, obj.y, 
                            this.hook.sprite.x, this.hook.sprite.y
                        );
                        const pullStrength = 2; // Pull speed
                        
                        obj.x += Math.cos(angle) * pullStrength;
                        obj.y += Math.sin(angle) * pullStrength;
                    }
                }
            });
            
            // Auto-collect items when hook has finished its pulling cycle
            itemsToAutoCollect.forEach(obj => {
                if (obj.config.bonus > 0) {
                    let finalBonus = obj.config.bonus;
                    
                    // Apply shop bonuses (same as onEntityGrabbed)
                    if (this.player.hasRockCollectorsBook && obj.type.includes('Rock')) {
                        finalBonus *= 4;
                    }
                    if (this.player.hasGemPolish && (obj.type === 'Diamond' || obj.type.includes('Gold'))) {
                        finalBonus *= 1.5;
                    }
                    if (this.player.hasLuckyClover && Math.random() < 0.3) {
                        finalBonus *= 2.5;
                    }
                    
                    this.player.money += Math.round(finalBonus);
                    this.moneyText.setText('$' + this.player.money);
                    
                    // Play sound
                    if (obj.config.bonusType && this.sound.get(obj.config.bonusType)) {
                        this.sound.play(obj.config.bonusType);
                    }
                    
                    // Enhanced collection effect - bigger and longer lasting
                    const collectText = this.add.text(obj.x, obj.y - 20, `🧲+$${Math.round(finalBonus)}`, {
                        fontFamily: 'Kurland',
                        fontSize: '16px',
                        fill: '#00ffff',
                        stroke: '#000000',
                        strokeThickness: 2
                    }).setOrigin(0.5);
                    
                    this.tweens.add({
                        targets: collectText,
                        alpha: 0,
                        y: obj.y - 60,
                        scale: 1.5,
                        duration: 2500,
                        ease: 'Power2',
                        onComplete: () => collectText.destroy()
                    });
                    
                    // Sparkle effect for magnet collection
                    for (let i = 0; i < 6; i++) {
                        const sparkle = this.add.image(obj.x, obj.y, 'light');
                        sparkle.setScale(0.3);
                        sparkle.setTint(0x00ffff);
                        
                        this.tweens.add({
                            targets: sparkle,
                            x: obj.x + Phaser.Math.Between(-30, 30),
                            y: obj.y + Phaser.Math.Between(-30, 30),
                            scale: 0,
                            alpha: 0,
                            duration: 1000,
                            ease: 'Power2',
                            onComplete: () => sparkle.destroy()
                        });
                    }
                }
                
                // Check for special effects
                if (typeof obj.onCollected === 'function') {           
                    obj.onCollected(this);         
                }
                
                obj.destroy();
            });
        }
    }

    updatePlayerAnimation() {
        // SỬA LỖI ANIMATION: Logic được làm lại để đảm bảo animation lặp lại đúng
        const currentAnimKey = this.playerSprite.anims.getName();
        let newAnimKey = 'player-idle';

        if (this.hook.isGrabbing) {
            newAnimKey = this.hook.isBacking ? 'player-grab-back' : 'player-grab';
        }

        if (currentAnimKey !== newAnimKey) {
            this.playerSprite.play(newAnimKey);
        }
    }

    loadLevel(levelData) {
        if (!levelData) { return; }
        levelData.entities.forEach(e => {
            const config = entityConfig[e.type];
            if (!config) { return; }
            const x = e.pos.x;
            const y = e.pos.y;
            let obj;
            switch(config.type){
                case 'RandomEffect':
                    obj = new RandomEffectMapObject(this, x, y, e.type);
                    obj.init(config);
                    break;
                case 'MoveAround':
                    obj = new MoveAroundMapObject(this, x, y, e.type);
                    obj.init(config, e.dir);
                    break;
                case 'Explosive':
                    obj = new ExplosiveMapObject(this, x, y, e.type);
                    obj.init(config);
                    break;
                case 'SpecialEffect':
                    obj = new SpecialEffectMapObject(this, x, y, e.type);
                    obj.init(config);
                    break;
                case 'BossMoveAround':
                    obj = new BossMoveAroundMapObject(this, x, y, e.type);
                    obj.init(config, e.dir || 'Left');
                    break;
                default:
                    obj = new MapObject(this, x, y, e.type);
                    obj.init(config);
            }
            this.mapObjects.add(obj);
        });
        
        // ✅ Add rare special items with low spawn chance
        this.spawnRareItems();
        
        // ✅ Spawn Boss Mole every 5 levels
        this.spawnBossIfNeeded();
    }

    spawnBossIfNeeded() {
        // Boss appears on level 5, 10, 15, 20, etc.
        if (this.player.level % 5 === 0) {
            const config = entityConfig['BossMole'];
            if (config) {
                // Spawn boss in center-bottom area
                const x = Phaser.Math.Between(120, 200);
                const y = Phaser.Math.Between(160, 190);
                
                const boss = new BossMoveAroundMapObject(this, x, y, 'MoleWithDiamond'); // Use diamond mole sprite
                boss.init(config, 'Left');
                this.mapObjects.add(boss);
            }
        }
    }

    spawnRareItems() {
        const rareItems = ['GoldenHook', 'TimeCrystal', 'MagnetStone', 'LuckyStar'];
        
        rareItems.forEach(itemType => {
            const config = entityConfig[itemType];
            if (config && Math.random() < config.spawnChance) {
                // Random position in lower area
                const x = Phaser.Math.Between(50, 270);
                const y = Phaser.Math.Between(180, 220);
                
                // Check if position is clear (not overlapping other items)
                let positionClear = true;
                this.mapObjects.getChildren().forEach(existing => {
                    if (Phaser.Math.Distance.Between(x, y, existing.x, existing.y) < 30) {
                        positionClear = false;
                    }
                });
                
                if (positionClear) {
                    const obj = new SpecialEffectMapObject(this, x, y, itemType);
                    obj.init(config);
                    this.mapObjects.add(obj);
                }
            }
        });
    }

    updateTimer() {
        this.timeLeft--;
        this.timeText.setText('Time: ' + this.timeLeft);
        if (this.timeLeft <= 0) {
            if (this.player.reachGoal()) {
                // ✅ Check if player completed final level (level 30)
                if (this.player.level >= 30) {
                    // Player wins the entire game!
                    this.scene.start('TransitionScene', { type: 'Victory', player: this.player });
                } else {
                    // Continue to next level
                    this.player.goToNextLevel();
                    this.scene.start('TransitionScene', { type: 'MadeGoal', player: this.player });
                }
            } else {
                this.scene.start('TransitionScene', { type: 'GameOver', player: this.player });
            }
        }
    }

    onEntityGrabbed(entity) {
        if (entity._processed) {
            return;
        }
        entity._processed = true; 
        
        if (entity.config.bonus > 0) {
            let finalBonus = entity.config.bonus;
            
            // ✅ Apply shop item effects
            if (this.player.hasRockCollectorsBook && entity.type.includes('Rock')) {
                finalBonus *= 4; // Double rock value
            }
            
            if (this.player.hasGemPolish && (entity.type === 'Diamond' || entity.type.includes('Gold'))) {
                finalBonus *= 1.5; // 50% more for gems/gold
            }
            
            if (this.player.hasLuckyClover && Math.random() < 0.3) {
                finalBonus *= 2.5; // 30% chance to double any value
            }
            
            // ✅ Lucky Star effect - guaranteed valuable items for next 3 grabs
            if (this.player.hasLuckyStar && this.player.luckyStreakCount > 0) {
                if (entity.type.includes('Rock') || entity.config.bonus <= 100) {
                    // Convert low-value items to high-value
                    finalBonus = Math.max(finalBonus, 300);
                } else if (entity.type.includes('Gold') && entity.config.bonus > 100) {
                    // Double gold value if > 100
                    finalBonus *= 2;
                }
                this.player.luckyStreakCount--;
                
                if (this.player.luckyStreakCount <= 0) {
                    this.player.hasLuckyStar = false;
                    // Show streak end message
                    const text = this.add.text(this.cameras.main.centerX, 70, 'ĐÃ HẾT HIỆU LỰC!', {
                        fontFamily: 'Kurland',
                        fontSize: '12px',
                        fill: '#05dc30ff'
                    }).setOrigin(0.5);
                    
                    this.tweens.add({
                        targets: text,
                        alpha: 0,
                        duration: 3000,
                        onComplete: () => text.destroy()
                    });
                }
            }
            
            this.player.money += Math.round(finalBonus);
        }   
        
        this.moneyText.setText('$' + this.player.money);
        
        // Chơi âm thanh dựa trên bonusType
        if (entity.config.bonusType && this.sound.get(entity.config.bonusType)) {
            this.sound.play(entity.config.bonusType);
        }

        // Kiểm tra xem vật phẩm có hiệu ứng đặc biệt không
        if (typeof entity.onCollected === 'function') {           
            entity.onCollected(this);         
        }

        entity.destroy();
    }

    // ✅ Cleanup khi scene kết thúc
    shutdown() {
        // Remove event listeners để tránh memory leak và duplicate
        this.events.off('entityGrabbed');
        
        // Stop timer
        if (this.timerEvent) {
            this.timerEvent.destroy();
        }
    }

    createUI() {
        this.moneyText = this.add.text(10, 10, '$' + this.player.money, { fontFamily: 'visitor1', fontSize: '15px', fill: '#815504ff' });
        this.goalText = this.add.text(10, 23, 'Goal: $' + this.player.goal, { fontFamily: 'visitor1', fontSize: '15', fill: '#815504ff' });
        this.timeText = this.add.text(255, 10, 'Time:60', { fontFamily: 'visitor1', fontSize: '15px', fill: '#815504ff' });
        this.levelText = this.add.text(255, 23, 'Level:' + this.player.level, { fontFamily: 'visitor1', fontSize: '15px', fill: '#815504ff' });
        this.dynamiteText = this.add.text(210, 23, 'x' + this.player.dynamiteCount, {fontFamily: 'visitor1',fontSize: '15px',fill: '#815504ff'});
        
        // Initialize shop status display
        this.updatePlayerStats();
    }

    // Helper method to update UI when returning from shop
    updatePlayerStats() {
        this.moneyText.setText('$' + this.player.money);
        this.dynamiteText.setText('x' + this.player.dynamiteCount);  
    }
}
