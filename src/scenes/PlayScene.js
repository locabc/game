// Trong PlayScene.js, thêm vào đầu file
import * as C from '../utils/Constants.js';
import Player from '../entities/Player.js';
import Hook from '../entities/Hook.js';
import { MapObject, MoveAroundMapObject, ExplosiveMapObject, RandomEffectMapObject } from '../entities/MapObject.js';
import { entityConfig } from '../utils/data/EntityConfig.js';
import { levels } from '../utils/data/Levels.js';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayScene' });
        this.audioInitialized = false; // Biến để theo dõi trạng thái âm thanh
    }

    init(data) {
        this.player = data.player;
        this.game.player = data.player;
    }
    
    create() {
        // Tính tỷ lệ scale
        const scaleX = this.scale.width / C.VIRTUAL_WIDTH;
        const scaleY = this.scale.height / C.VIRTUAL_HEIGHT;

        const levelData = levels[this.player.realLevelStr];
        if (!levelData) {
            console.error(`Dữ liệu cho màn chơi "${this.player.realLevelStr}" không tồn tại trong Levels.js!`);
            this.scene.start('MenuScene');
            return; 
        }
        this.add.image(0, 40 * scaleY, levelData.type).setOrigin(0).setScale(scaleX, scaleY);
        this.add.image(0, 0, 'LevelCommonTop').setOrigin(0).setScale(scaleX, scaleY);
        
        this.playerSprite = this.add.sprite(165 * scaleX, 39 * scaleY, 'playerSheet').setOrigin(0.5, 1).setScale(scaleX, scaleY);
        this.playerSprite.play('player-idle');
        
        this.hook = new Hook(this, this.playerSprite.x - 5 * scaleX, this.playerSprite.y - 16 * scaleY);
        
        this.mapObjects = this.physics.add.group();
        this.loadLevel(levelData);

        this.physics.add.overlap(this.hook.sprite, this.mapObjects, (hookSprite, mapObj) => {
            mapObj.grabbed();
        });

        // Thêm listener cho pointerdown để resume AudioContext
        this.input.on('pointerdown', () => {
            if (!this.audioInitialized) {
                this.sound.context.resume(); // Resume AudioContext trên mobile
                this.audioInitialized = true;
            }
            this.hook.startGrabbing();
        }, this);

        // Nút bấm thuốc nổ
        const dynamiteButton = this.add.image((C.VIRTUAL_WIDTH - 70) * scaleX, (C.VIRTUAL_HEIGHT - 70) * scaleY, 'Dynamite')
            .setInteractive()
            .setScale(scaleX, scaleY)
            .on('pointerdown', (pointer) => {
                pointer.stopPropagation();
                this.hook.useDynamite();
            });
        dynamiteButton.visible = false;
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
        const scaleX = this.scale.width / C.VIRTUAL_WIDTH;
        const scaleY = this.scale.height / C.VIRTUAL_HEIGHT;
        levelData.entities.forEach(e => {
            const config = entityConfig[e.type];
            if (!config) { return; }
            const x = e.pos.x * scaleX;
            const y = e.pos.y * scaleY;
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
        // Cộng tiền thưởng
        this.player.money += entity.config.bonus;
        this.moneyText.setText('$' + this.player.money);
        
        // Chơi âm thanh chỉ khi AudioContext đã resume
        if (this.audioInitialized && entity.config.bonusType) {
            this.sound.play(entity.config.bonusType);
        }

        // Kiểm tra hiệu ứng đặc biệt
        if (typeof entity.onCollected === 'function') {
            entity.onCollected(this);
        }

        entity.destroy();
    }

    createUI() {
        const scaleX = this.scale.width / C.VIRTUAL_WIDTH;
        const scaleY = this.scale.height / C.VIRTUAL_HEIGHT;
        this.moneyText = this.add.text(5 * scaleX, 5 * scaleY, '$' + this.player.money, { fontFamily: 'visitor1', fontSize: `${10 * scaleY}px`, fill: '#815504ff' });
        this.goalText = this.add.text(5 * scaleX, 15 * scaleY, 'Goal: $' + this.player.goal, { fontFamily: 'visitor1', fontSize: `${10 * scaleY}px`, fill: '#459adbff' });
        this.timeText = this.add.text(260 * scaleX, 15 * scaleY, 'Time: 60', { fontFamily: 'visitor1', fontSize: `${10 * scaleY}px`, fill: '#815504ff' });
        this.levelText = this.add.text(260 * scaleX, 25 * scaleY, 'Level: ' + this.player.level, { fontFamily: 'visitor1', fontSize: `${10 * scaleY}px`, fill: '#815504ff' });
    }
}