import * as C from '../utils/Constants.js';
import Player from '../entities/Player.js';
import Hook from '../entities/Hook.js';
import { MapObject, MoveAroundMapObject, ExplosiveMapObject, RandomEffectMapObject } from '../entities/MapObject.js';
import { entityConfig } from '../utils/data/EntityConfig.js';
import { levels } from '../utils/data/Levels.js';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayScene' });
    }

    init(data) {
        this.player = data.player;
        this.game.player = data.player;
    }
    
    create() {
        const levelData = levels[this.player.realLevelStr];
        if (!levelData) {
        console.error(`Dữ liệu cho màn chơi "${this.player.realLevelStr}" không tồn tại trong Levels.js!`);
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
        this.hook.startGrabbing();
    }, this);

    // 2. Thêm nút bấm thuốc nổ
    const dynamiteButton = this.add.image(C.VIRTUAL_WIDTH - 70, C.VIRTUAL_HEIGHT - 70, 'Dynamite')
        .setInteractive()
        .on('pointerdown', (pointer) => {
            pointer.stopPropagation(); // Ngăn sự kiện chạm lan ra màn hình
            this.hook.useDynamite();
        });
    dynamiteButton.visible = false; // Mặc định ẩn đi
    this.dynamiteButton = dynamiteButton;
        
        this.input.keyboard.on('keydown-DOWN', this.hook.startGrabbing, this.hook);
        this.input.keyboard.on('keydown-SPACE', this.hook.startGrabbing, this.hook);
        
        this.events.on('entityGrabbed', this.onEntityGrabbed, this);

        this.createUI();
        this.timeLeft = 60;
        this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    update(time, delta) {
        const dt = delta / 1000;
        this.hook.update(dt);
        this.updatePlayerAnimation();
        if (this.dynamiteButton) {
            this.dynamiteButton.visible = this.player.dynamiteCount > 0 && this.hook.isBacking && this.hook.grabbedEntity;
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
                default:
                    obj = new MapObject(this, x, y, e.type);
                    obj.init(config);
            }
            this.mapObjects.add(obj);
        });
    }

    updateTimer() {
        this.timeLeft--;
        this.timeText.setText('Time: ' + this.timeLeft);
        if (this.timeLeft <= 0) {
            if (this.player.reachGoal()) {
                this.player.goToNextLevel();
                this.scene.start('TransitionScene', { type: 'MadeGoal', player: this.player });
            } else {
                this.scene.start('TransitionScene', { type: 'GameOver', player: this.player });
            }
        }
    }

    onEntityGrabbed(entity) {
        // Cộng tiền thưởng (bây giờ đã có giá trị số)
        this.player.money += entity.config.bonus;
        this.moneyText.setText('$' + this.player.money);
        
        // Chơi âm thanh dựa trên bonusType
        if (entity.config.bonusType) {
            this.sound.play(entity.config.bonusType);
        }

        // Kiểm tra xem vật phẩm có hiệu ứng đặc biệt không
        if (typeof entity.onCollected === 'function') {
            entity.onCollected(this);
        }

        entity.destroy();
    }

    createUI() {
        this.moneyText = this.add.text(5, 5, '$' + this.player.money, { fontFamily: 'visitor1', fontSize: '10px', fill: '#815504ff' });
        this.goalText = this.add.text(5, 15, 'Goal: $' + this.player.goal, { fontFamily: 'visitor1', fontSize: '10px', fill: '#459adbff' });
        this.timeText = this.add.text(260, 15, 'Time: 60', { fontFamily: 'visitor1', fontSize: '10px', fill: '#815504ff' });
        this.levelText = this.add.text(260, 25, 'Level: ' + this.player.level, { fontFamily: 'visitor1', fontSize: '10px', fill: '#815504ff' });
    }
}