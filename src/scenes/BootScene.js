// src/scenes/BootScene.js - PHIÊN BẢN SỬA LỖI TẢI TEXTURE NỔ

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log("Booting game, loading assets...");

        // Tải tất cả ảnh với key trùng với 'type' trong game logic
        // Backgrounds
        this.load.image('Menu', 'images/bg_start_menu.png');
        this.load.image('LevelCommonTop', 'images/bg_top.png');
        this.load.image('LevelA', 'images/bg_level_A.png');
        this.load.image('LevelB', 'images/bg_level_B.png');
        this.load.image('LevelC', 'images/bg_level_C.png');
        this.load.image('LevelD', 'images/bg_level_D.png');
        this.load.image('LevelE', 'images/bg_level_E.png');
        this.load.image('Goal', 'images/bg_goal.png');
        this.load.image('Shop', 'images/bg_shop.png');

        // Entities
        this.load.image('MiniGold', 'images/gold_mini.png');
        this.load.image('NormalGold', 'images/gold_normal.png');
        this.load.image('NormalGoldPlus', 'images/gold_normal_plus.png');
        this.load.image('BigGold', 'images/gold_big.png');
        this.load.image('MiniRock', 'images/rock_mini.png');
        this.load.image('NormalRock', 'images/rock_normal.png');
        this.load.image('BigRock', 'images/rock_big.png');
        this.load.image('QuestionBag', 'images/question_bag.png');
        this.load.image('Diamond', 'images/diamond.png');
        this.load.image('Skull', 'images/skull.png');
        this.load.image('Bone', 'images/bone.png');
        this.load.image('TNT', 'images/tnt.png');
        this.load.image('TNT_Destroyed', 'images/tnt_destroyed.png');
        
        // UI and others
        this.load.image('MenuArrow', 'images/menu_arrow.png');
        this.load.image('Panel', 'images/panel.png');
        this.load.image('DialogueBubble', 'images/ui_dialogue_bubble.png');
        this.load.image('Title', 'images/text_goldminer.png');
        this.load.image('Selector', 'images/ui_selector.png');
        this.load.image('DynamiteUI', 'images/ui_dynamite.png');
        this.load.image('Strength!', 'images/text_strength.png');
        this.load.image('Table', 'images/shop_table.png');
        this.load.image('Dynamite', 'images/dynamite.png');
        this.load.image('StrengthDrink', 'images/strength_drink.png');
        this.load.image('LuckyClover', 'images/lucky_clover.png');
        this.load.image('RockCollectorsBook', 'images/rock_collectors_book.png');
        this.load.image('GemPolish', 'images/gem_polish.png');
        
        // Spritesheets
        this.load.spritesheet('playerSheet', 'images/miner_sheet.png', { frameWidth: 32, frameHeight: 40 });
        this.load.spritesheet('shopkeeperSheet', 'images/shopkeeper_sheet.png', { frameWidth: 80, frameHeight: 80 });
        this.load.spritesheet('hookSheet', 'images/hook_sheet.png', { frameWidth: 13, frameHeight: 15 });
        this.load.spritesheet('moleSheet', 'images/mole_sheet.png', { frameWidth: 18, frameHeight: 13 });
        this.load.spritesheet('moleWithDiamondSheet', 'images/mole_with_diamond_sheet.png', { frameWidth: 18, frameHeight: 13 });
        
        
        // Audios (giữ nguyên)
        this.load.audio('Money', 'audios/money.mp3');
        this.load.audio('HookReset', 'audios/hook_reset.mp3');
        this.load.audio('GrabStart', 'audios/grab_start.mp3');
        this.load.audio('GrabBack', 'audios/grab_back.mp3');
        this.load.audio('Explosive', 'audios/explosive.mp3');
        this.load.audio('High', 'audios/high_value.mp3');
        this.load.audio('Normal', 'audios/normal_value.mp3');
        this.load.audio('Low', 'audios/low_value.mp3');
        this.load.audio('GoalMusic', 'audios/goal.mp3');
        this.load.audio('MadeGoalMusic', 'audios/made_goal.mp3');
    }

    // Trong file src/scenes/BootScene.js

create() {
    console.log("Assets loaded. Creating animations...");

    this.anims.create({
        key: 'player-idle',
        frames: this.anims.generateFrameNumbers('playerSheet', { frames: [0] }),
        frameRate: 1,
        repeat: -1
    });

    // Animation khi thả câu (dùng frame 3 trong file LÖVE, tức là frame 2 ở đây)
    this.anims.create({
        key: 'player-grab',
        frames: this.anims.generateFrameNumbers('playerSheet', { frames: [2] }),
        frameRate: 1,
        repeat: -1
    });

    // Animation khi kéo câu về (dùng frame 1, 2, 3, tức là 0, 1, 2 ở đây)
    this.anims.create({
        key: 'player-grab-back',
        frames: this.anims.generateFrameNumbers('playerSheet', { frames: [0, 1, 2] }),
        frameRate: 1 / 0.13, // Tốc độ từ file gốc
        repeat: -1
    });


    console.log("Animations created, starting Menu Scene.");
    this.scene.start('MenuScene');
}
}