// src/scenes/PlayScene.js
import * as C from '../utils/Constants.js';
import Player from '../entities/Player.js';
import Hook from '../entities/Hook.js';
import { MapObject, MoveAroundMapObject, ExplosiveMapObject, RandomEffectMapObject, SpecialEffectMapObject, BossMoveAroundMapObject } from '../entities/MapObject.js';
import entityConfig from '../utils/data/EntityConfig.js';
import { levels as originalLevels } from '../utils/data/Levels.js';
import ShopScene from './ShopScene.js';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayScene' });
    }

    init(data) {
        this.player = data.player;
        this.game.player = data.player;
        this.isTimeFrozen = false; // Initialize time freeze state
    }
    
    create() {
        // ✅ Resume audio context when starting gameplay
        if (window.audioManager) {
            window.audioManager.forceResumeAudio();
        }
        
        // Use custom level if provided in URL and window.startLevel is set
        let levelKey = this.player.realLevelStr;
        if (window.startLevel && window.location.search.includes('editor=true')) {
            levelKey = window.startLevel;
        }
        
        // Use custom levels from editor if available
        const levelsToUse = window.gameLevels || originalLevels;
        
        const levelData = levelsToUse[levelKey];
        if (!levelData) {
        // Quay về menu để tránh làm sập game
        this.scene.start('MenuScene');
        return; 
        }
        this.add.image(0, 40, levelData.type).setOrigin(0);
        this.add.image(0, 0, 'LevelCommonTop').setOrigin(0);
        
        // ✅ Use default player sprite
        this.playerSprite = this.add.sprite(165, 39, 'playerSheet').setOrigin(0.5, 1);
        this.playerSprite.play('player-idle');
        
        // SỬA LỖI ĐIỂM THẢ DÂY: Tọa độ Y đã được hạ thấp xuống đúng vị trí cuộn dây
        this.hook = new Hook(this, this.playerSprite.x - 5, this.playerSprite.y - 16);
        this.mapObjects = this.physics.add.group();
        this.loadLevel(levelData);

        this.physics.add.overlap(this.hook.sprite, this.mapObjects, (hookSprite, mapObj) => {
            mapObj.grabbed();
        });
        this.input.on('pointerdown', (pointer) => {
            // Only allow hook grabbing if clicking in game area (below UI area y > 40)
            if (!this.isImageOpen && pointer.y > 40) {
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
        
        // Thêm phím tắt 'N' để kết thúc ngay lập tức màn chơi
        this.input.keyboard.on('keydown-N', () => {
            if (!this.isImageOpen) {
                // Đặt tiền của người chơi vượt qua mục tiêu để đảm bảo đạt được mục tiêu
                this.player.money = this.player.goal + 1;
                // Kết thúc ngay lập tức màn chơi
                this.timeLeft = 0;
                this.timeText.setText('Time: 0');
                this.endLevel();
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
        
        // Kiểm tra collision trước khi tải level
        this.checkItemCollisions(levelData);
        
        // Đếm số lượng đối tượng theo loại
        const entityCounts = {};
        
        levelData.entities.forEach(e => {
            const config = entityConfig[e.type];
            if (!config) { return; }
            
            // Đếm loại đối tượng
            entityCounts[e.type] = (entityCounts[e.type] || 0) + 1;
            
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

    // Hàm kiểm tra collision giữa các vật phẩm
    checkItemCollisions(levelData) {
        const itemSizes = {
            "BigGold": { width: 32, height: 29 },
            "MiniGold": { width: 10, height: 8 },
            "NormalGold": { width: 15, height: 13 },
            "NormalGoldPlus": { width: 20, height: 18 },
            "QuestionBag": { width: 20, height: 23 },
            "BigRock": { width: 32, height: 28 },
            "Skull": { width: 18, height: 17 },
            "MiniRock": { width: 15, height: 11 },
            "NormalRock": { width: 22, height: 19 },
            "Diamond": { width: 10, height: 8 },
            "Bone": { width: 20, height: 13 },
            "TNT": { width: 20, height: 20 },
            "Mole": { width: 24, height: 16 },
            "MoleWithDiamond": { width: 24, height: 16 }
        };

        const collisions = [];
        const entities = levelData.entities;

        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const item1 = entities[i];
                const item2 = entities[j];
                
                const size1 = itemSizes[item1.type];
                const size2 = itemSizes[item2.type];
                
                if (!size1 || !size2) continue;

                // Tính toán bounding box
                const box1 = {
                    left: item1.pos.x - size1.width / 2,
                    right: item1.pos.x + size1.width / 2,
                    top: item1.pos.y - size1.height / 2,
                    bottom: item1.pos.y + size1.height / 2
                };

                const box2 = {
                    left: item2.pos.x - size2.width / 2,
                    right: item2.pos.x + size2.width / 2,
                    top: item2.pos.y - size2.height / 2,
                    bottom: item2.pos.y + size2.height / 2
                };

                // Kiểm tra overlap
                if (box1.left < box2.right && box1.right > box2.left &&
                    box1.top < box2.bottom && box1.bottom > box2.top) {
                    
                    const distance = Math.sqrt(
                        Math.pow(item1.pos.x - item2.pos.x, 2) + 
                        Math.pow(item1.pos.y - item2.pos.y, 2)
                    );
                    
                    collisions.push({
                        item1: `${item1.type} (${item1.pos.x},${item1.pos.y})`,
                        item2: `${item2.type} (${item2.pos.x},${item2.pos.y})`,
                        distance: Math.round(distance)
                    });
                }
            }
        }

        // Chỉ log nếu có collision
        if (collisions.length > 0) {
            const filteredCollisions = collisions.filter(collision => 
                !collision.item1.includes('Mole') && 
                !collision.item1.includes('MoleWithDiamond') && 
                !collision.item2.includes('Mole') && 
                !collision.item2.includes('MoleWithDiamond')
            );

            if (filteredCollisions.length > 0) {
                console.warn(`⚠️ COLLISION DETECTED in ${this.player.realLevelStr}:`);
                filteredCollisions.forEach(collision => {
                    console.warn(`  🔴 ${collision.item1} ĐÈ LÊN ${collision.item2} (khoảng cách: ${collision.distance}px)`);
                });
            }
        }
    }

    spawnBossIfNeeded() {
        // Boss appears on level 5, 10, 15, 20, etc.
        if (this.player.level % 5 === 0) {
            const config = { ...entityConfig['BossMole'] }; // Clone config
            if (config) {
                // ✅ Calculate bonus and HP based on level
                const level = this.player.level;
                
                // Bonus scaling: L5=2000, L10=2300, L15=2600, L20=3000, L25=3500
                if (level === 5) config.bonus = 2000;
                else if (level === 10) config.bonus = 2300;
                else if (level === 15) config.bonus = 2600;
                else if (level === 20) config.bonus = 3000;
                else if (level === 25) config.bonus = 3500;
                else if (level >= 30) config.bonus = 4000; // Future levels
                
                // HP scaling: L5-15=3HP, L20=4HP, L25-30=5HP
                if (level <= 15) config.hp = 3;
                else if (level === 20) config.hp = 4;
                else if (level >= 25) config.hp = 5;
                
                // Spawn boss in center-bottom area
                const x = Phaser.Math.Between(120, 200);
                const y = Phaser.Math.Between(160, 190);
                
                const boss = new BossMoveAroundMapObject(this, x, y, 'MoleWithDiamond'); // Use diamond mole sprite
                boss.init(config, 'Left');
                this.mapObjects.add(boss);
            }
        }
    }
    spawnGiftBox() {
        const config = entityConfig['GiftBox'];
        if (config && Math.random() < config.spawnChance) {
            // Vị trí GiftBox có thể điều chỉnh ở đây
            // Đặt GiftBox ở vị trí cụ thể hoặc trong một khu vực xác định
            
            // Ví dụ: Đặt ở giữa màn hình, hơi thấp một chút
            const x = Phaser.Math.Between(80, 280);
            const y = 220;
            
            // Check if position is clear (not overlapping other items)
            let positionClear = true;
            this.mapObjects.getChildren().forEach(existing => {
                if (Phaser.Math.Distance.Between(x, y, existing.x, existing.y) < 30) {
                    positionClear = false;
                }
            });
            
            if (positionClear) {
                const obj = new SpecialEffectMapObject(this, x, y, 'GiftBox');
                obj.init(config);
                this.mapObjects.add(obj);
            }
        }
    }
    spawnRareItems() {
        //const rareItems = ['GoldenHook', 'TimeCrystal', 'MagnetStone', 'LuckyStar', 'GiftBox'];
         this.spawnGiftBox();
        
        // Xử lý các vật phẩm hiếm khác
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
        // Don't decrease time if time is frozen
        if (this.isTimeFrozen) {
            return;
        }
        
        this.timeLeft--;
        this.timeText.setText('Time: ' + this.timeLeft);
        if (this.timeLeft <= 0) {
            // Dừng timer
            if (this.timerEvent) {
                this.timerEvent.destroy();
                this.timerEvent = null;
            }
            // Sử dụng hàm endLevel chung
            this.endLevel();
        }
    }

    onEntityGrabbed(entity) {
        if (entity._processed) {
            return;
        }
        entity._processed = true; 
        
        if (entity.config.bonus > 0) {
            let finalBonus = entity.config.bonus;
            
            // ✅ DEBUG: Show entity info
            // ✅ Apply shop item effects
            const entityName = entity.texture.key;
            
            if (this.player.hasRockCollectorsBook) {
                if (entityName === 'BigRock') {
                    finalBonus *= 3; // 3x rock value
                }
                else {
                    (entityName === 'NormalRock' || entityName === 'MiniRock')
                     finalBonus *= 10; // 10x rock value
                }
            }
            if (this.player.hasGemPolish && (entityName === 'Diamond' || entityName.includes('Gold'))) {
                finalBonus *= 1.5; // 50% more for gems/gold
            }
            
            if (this.player.hasLuckyClover && Math.random() < 0.3) {
                finalBonus *= 2; // Lucky bonus
            }
            
            // ✅ Lucky Star effect - guaranteed valuable items for next 3 grabs
            if (this.player.hasLuckyStar && this.player.luckyStreakCount > 0) {
                // console.log('🍀 Lucky Star ACTIVE! Count:', this.player.luckyStreakCount);
                // console.log('🍀 Entity info:', {
                //     textureKey: entity.texture.key,
                //     bonus: entity.config.bonus,
                //     entityType: entity.constructor.name
                // });
                
                const entityName = entity.texture.key;
                let luckyBonus = 0;
                
                if (entityName.includes('Rock') || entity.config.bonus <= 100) {
                    // Convert low-value items to high-value
                    const oldBonus = finalBonus;
                    finalBonus = Math.max(finalBonus, 300);
                    luckyBonus = finalBonus - oldBonus;
                    // console.log('🍀 Rock/Low value bonus:', oldBonus, '→', finalBonus);
                } else if (entityName.includes('Gold') && entity.config.bonus > 100) {
                    // Double gold value if > 100
                    const oldBonus = finalBonus;
                    finalBonus *= 2;
                    luckyBonus = finalBonus - oldBonus;
                    // console.log('🍀 Gold bonus:', oldBonus, '→', finalBonus);
                } else {
                    // For other items, at least 50% bonus
                    const oldBonus = finalBonus;
                    finalBonus = Math.round(finalBonus * 1.5);
                    luckyBonus = finalBonus - oldBonus;
                    // console.log('🍀 Other item bonus:', oldBonus, '→', finalBonus);
                }
                
                this.player.luckyStreakCount--;
                // console.log('🍀 Lucky streak remaining:', this.player.luckyStreekCount);
                
                if (this.player.luckyStreakCount <= 0) {
                    this.player.hasLuckyStar = false;
                    // console.log('🍀 Lucky Star EXPIRED!');
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
        
        // ✅ Kiểm tra xem còn vật phẩm nào để thu thập không sau khi destroy
        this.checkLevelCompletion();
    }

    // ✅ Kiểm tra xem còn vật phẩm nào để thu thập không
    checkLevelCompletion() {
        // Đếm số lượng vật phẩm có thể thu thập còn lại
        const collectibleItems = this.mapObjects.getChildren().filter(obj => {
            // Tính tất cả vật phẩm có thể thu thập:
            // - Có giá trị bonus > 0
            // - Có hiệu ứng đặc biệt (effect)
            // - Là QuestionBag (type RandomEffect)
            return obj.config && (
                obj.config.bonus > 0 || 
                obj.config.effect ||
                obj.config.type === 'RandomEffect'
            );
        });
        
        // Nếu không còn vật phẩm nào để thu thập và còn thời gian
        if (collectibleItems.length === 0 && this.timeLeft > 0) {
            // Dừng timer
            if (this.timerEvent) {
                this.timerEvent.destroy();
                this.timerEvent = null;
            }
            
            // Hiển thị thông báo hoàn thành màn sớm
            const completionText = this.add.text(this.cameras.main.centerX, 100, 
                'ĐÃ THU THẬP HẾT!\nHoàn thành màn sớm!', {
                fontFamily: 'Kurland',
                fontSize: '16px',
                fill: '#00ff00',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            }).setOrigin(0.5);
            
            // Tween hiệu ứng cho thông báo
            this.tweens.add({
                targets: completionText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 500,
                yoyo: true,
                onComplete: () => {
                    // Chờ một chút rồi chuyển scene
                    this.time.delayedCall(1000, () => {
                        completionText.destroy();
                        this.endLevel();
                    });
                }
            });
        }
    }

    // ✅ Hàm kết thúc màn chơi
    endLevel() {
        if (this.player.reachGoal()) {
            // ✅ Check if player completed final level (level 100)
            if (this.player.level >= 150 ) {
                // Player wins the entire game!
                this.scene.start('TransitionScene', { type: 'Victory', player: this.player });
            } else {
                // Continue to next level
                this.player.goToNextLevel();
                // ✅ Save progress after advancing to next level
                this.player.saveProgress();
                this.scene.start('TransitionScene', { type: 'MadeGoal', player: this.player });
            }
        } else {
            this.scene.start('TransitionScene', { type: 'GameOver', player: this.player });
        }
    }

    // ✅ Cleanup khi scene kết thúc
    shutdown() {
        // Remove event listeners để tránh memory leak và duplicate
        this.events.off('entityGrabbed');
        
        // Stop timer
        if (this.timerEvent) {
            this.timerEvent.destroy();
            this.timerEvent = null;
        }
        
        // Cleanup fullscreen event listeners
        if (this.fullscreenChangeHandler) {
            document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('msfullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
            this.fullscreenChangeHandler = null;
        }
    }

    createUI() {
        this.moneyText = this.add.text(10, 10, '$' + this.player.money, { fontFamily: 'visitor1', fontSize: '15px', fill: '#815504ff' });
        this.goalText = this.add.text(10, 23, 'Goal: $' + this.player.goal, { fontFamily: 'visitor1', fontSize: '15', fill: '#815504ff' });
        this.timeText = this.add.text(250, 10, 'Time:60', { fontFamily: 'visitor1', fontSize: '15px', fill: '#815504ff' });
        this.levelText = this.add.text(250, 23, 'Level:' + this.player.level, { fontFamily: 'visitor1', fontSize: '15px', fill: '#815504ff' });
        this.dynamiteText = this.add.text(210, 23, 'x' + this.player.dynamiteCount, {fontFamily: 'visitor1',fontSize: '15px',fill: '#815504ff'});
        this.timeFreezeIcon = this.add.text(80, 20, '❄️', {fontFamily: 'Arial',fontSize: '13px'
        }).setInteractive({ 
            useHandCursor: true,
            hitArea: new Phaser.Geom.Rectangle(-5, -5, 25, 25),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains
        });

        this.timeFreezeIcon.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation(); 
            this.activateTimeFreeze();
        });

        this.timeFreezeText = this.add.text(100, 23, 'x' + (this.player.hasTimeFreezeItem || 0), {fontFamily: 'visitor1',fontSize: '15px',fill: '#815504ff'});
        
        // Initialize shop status display
        this.updatePlayerStats();
        
        // Add fullscreen toggle button (always visible)
        this.createFullscreenToggleButton();
    }

    // Helper method to update UI when returning from shop
    // Gọi hàm này mỗi khi muốn cập nhật UI (sau shop, sau khi mua item, sau khi dùng item...)
    updatePlayerStats() {
        // Update money and goal displays
        this.moneyText.setText('$' + this.player.money);
        this.goalText.setText('Goal: $' + this.player.goal);
        this.dynamiteText.setText('x' + this.player.dynamiteCount);

        // ❄️ Cập nhật Time Freeze UI - giống như thuốc nổ (chỉ cập nhật text, không tạo mới)
        if (this.timeFreezeText) {
            this.timeFreezeText.setText('x' + (this.player.hasTimeFreezeItem || 0));
            
            // Thay đổi opacity dựa trên có item hay không
            if (this.player.hasTimeFreezeItem > 0) {
                this.timeFreezeIcon.setAlpha(1.0); // Đậm khi có item
                this.timeFreezeText.setAlpha(1.0);
            } else {
                this.timeFreezeIcon.setAlpha(0.5); // Mờ khi hết item
                this.timeFreezeText.setAlpha(0.5);
            }
        }
    }

    activateTimeFreeze() {
    // Kiểm tra có item không
    if (!this.player.hasTimeFreezeItem || this.player.hasTimeFreezeItem <= 0) {
        return;
    }

    // Trừ 1 item Time Freeze
    this.player.hasTimeFreezeItem--;
    this.updatePlayerStats(); // Cập nhật lại UI

    // Bật trạng thái đóng băng
    this.isTimeFrozen = true;

    // Đóng băng tất cả object động
    this.mapObjects.children.entries.forEach(obj => {
        if (obj instanceof MoveAroundMapObject || obj instanceof BossMoveAroundMapObject) {
            console.log('Freezing object:', obj.constructor.name);
            obj.freezeMovement();
        }
    });

    // Hiển thị hiệu ứng thông báo
    const freezeDuration = 10; // giây
    this.showTimeFreezeEffect(freezeDuration);

    // Sau X giây thì tự động hủy đóng băng
    this.time.delayedCall(freezeDuration * 1000, () => {
        this.deactivateTimeFreeze();
    });
}

    showTimeFreezeEffect(duration) {
        // Overlay xanh mờ phủ màn hình
        const freezeOverlay = this.add.rectangle(
            0, 0,
            C.VIRTUAL_WIDTH, C.VIRTUAL_HEIGHT,
            0x00bfff, 0.3
        ).setOrigin(0);

        // Thông báo "Time frozen"
        const freezeMessage = this.add.text(
            C.VIRTUAL_WIDTH / 2, 60,
            `Ngưng Đọng Thời Gian! ${duration} giây`,
            {
                fontFamily: 'Kurland',
                fontSize: '13px',
                fill: '#00bfff',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            }
        ).setOrigin(0.5);

        // Làm overlay + message mờ dần sau 3 giây
        this.tweens.add({
            targets: [freezeOverlay, freezeMessage],
            alpha: 0,
            duration: 2000,
            onComplete: () => {
                freezeOverlay.destroy();
                freezeMessage.destroy();
            }
        });
    }

    deactivateTimeFreeze() {
        this.isTimeFrozen = false;

        // Cho object động hoạt động lại
        this.mapObjects.children.entries.forEach(obj => {
            if (obj instanceof MoveAroundMapObject || obj instanceof BossMoveAroundMapObject) {
                console.log('Unfreezing object:', obj.constructor.name);
                obj.unfreezeMovement();
            }
        });

        // Hiện thông báo "Thời gian trở lại!"
        const unfreezeMessage = this.add.text(
            C.VIRTUAL_WIDTH / 2, 100,
            'Thời gian trở lại!',
            {
                fontFamily: 'visitor1',
                fontSize: '16px',
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: unfreezeMessage,
            alpha: 0,
            y: 80,
            duration: 2000,
            onComplete: () => unfreezeMessage.destroy()
        });
    }

    createFullscreenToggleButton() {
        // 📱 Check if iPhone for positioning
        const isIPhone = /iPhone/i.test(navigator.userAgent) || 
                         (/iPad|iPod/i.test(navigator.userAgent) && !window.MSStream);
        
        // Adjust position for iPhone notch
        const buttonX = isIPhone ? this.cameras.main.width - 15 : this.cameras.main.width - 7;
        const buttonY = isIPhone ? 15 : 5;
        
        // Create toggle fullscreen button (small, top-right corner, notch-safe)
        const toggleButton = this.add.rectangle(buttonX, buttonY, 11, 9, 0x333333, 0.8)
            .setStrokeStyle(1, 0x666666)
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0) // Keep button fixed on screen
            .setDepth(999);
        
        const toggleText = this.add.text(buttonX, buttonY - 1, '⛶', {
            fontFamily: 'Arial',
            fontSize: '10px',
            fill: '#23d650ff'
        }).setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1000);
        
        // Tooltip
        let tooltip = null;
        
        // Add delay mechanism (1 second cooldown)
        let lastClickTime = 0;
        const clickDelay = 1000; // 1 second delay
        
        // Update button icon and tooltip based on fullscreen state
        const updateToggleButton = () => {
            const isFullscreen = !!(document.fullscreenElement || 
                                    document.webkitFullscreenElement || 
                                    document.msFullscreenElement || 
                                    document.mozFullScreenElement);
            
            if (isFullscreen) {
                // In fullscreen - show exit icon and tooltip
                toggleText.setText('✕');
                if (tooltip) {
                    tooltip.setText('Exit Fullscreen');
                }
            } else {
                // Not in fullscreen - show fullscreen icon and tooltip
                toggleText.setText('⛶');
                if (tooltip) {
                    tooltip.setText('Fullscreen');
                }
            }
        };
        
        // Initial button state
        updateToggleButton();
        
        // Listen for fullscreen changes
        const fullscreenChangeHandler = () => {
            updateToggleButton();
        };
        
        document.addEventListener('fullscreenchange', fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
        document.addEventListener('msfullscreenchange', fullscreenChangeHandler);
        document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
        
        // Button hover effects
        toggleButton.on('pointerover', () => {
            toggleButton.setFillStyle(0x555555, 0.9);
            this.game.canvas.style.cursor = 'pointer';
            if (tooltip) {
                tooltip.setVisible(true);
            }
        });
        
        toggleButton.on('pointerout', () => {
            toggleButton.setFillStyle(0x333333, 0.8);
            this.game.canvas.style.cursor = 'default';
            if (tooltip) {
                tooltip.setVisible(false);
            }
        });
        
        // Mobile touch support - show tooltip on touch start
        toggleButton.on('pointerdown', (pointer, localX, localY, event) => {
            // Prevent event propagation to avoid interfering with game
            event.stopPropagation();
            const currentTime = Date.now();
            
            // Check if enough time has passed since last click
            if (currentTime - lastClickTime < clickDelay) {
                return; // Ignore click if within delay period
            }
            
            lastClickTime = currentTime;
            toggleButton.setFillStyle(0x555555, 0.9);
            const isFullscreen = !!(document.fullscreenElement || 
                                    document.webkitFullscreenElement || 
                                    document.msFullscreenElement || 
                                    document.mozFullScreenElement);
            
            if (isFullscreen) {
                this.exitFullscreen();
            } else {
                this.enterFullscreen();
            }
            
            if (tooltip) {
                tooltip.setVisible(false);
            }
            // Reset button appearance after short delay
            this.time.delayedCall(150, () => {
                if (toggleButton && toggleButton.active) {
                    toggleButton.setFillStyle(0x333333, 0.8);
                }
            });
        });
        
        // Additional mobile-specific events
        toggleButton.on('pointerup', () => {
            // Ensure button returns to normal state on touch end
            toggleButton.setFillStyle(0x333333, 0.8);
            if (tooltip) {
                tooltip.setVisible(false);
            }
        });
        
        // Handle touch cancel (when user drags finger away)
        toggleButton.on('pointerupoutside', () => {
            toggleButton.setFillStyle(0x333333, 0.8);
            if (tooltip) {
                tooltip.setVisible(false);
            }
        });
        
        // Store references for cleanup
        this.fullscreenToggleButton = toggleButton;
        this.fullscreenToggleText = toggleText;
        this.fullscreenTooltip = tooltip;
        this.fullscreenChangeHandler = fullscreenChangeHandler;
    }

    enterFullscreen() {
        const element = document.documentElement;
        
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) { /* Safari */
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { /* IE11 */
            element.msRequestFullscreen();
        } else if (element.mozRequestFullScreen) { /* Firefox */
            element.mozRequestFullScreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        }
    }
}
