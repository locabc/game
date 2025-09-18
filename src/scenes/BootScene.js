// src/scenes/BootScene.js - PHIÊN BẢN SỬA LỖI TẢI TEXTURE NỔ

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
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
        
        // ✅ Rare special items (reuse existing images)
        this.load.image('GoldenHook', 'images/gold_big.png'); // Use gold image for golden hook
        this.load.image('TimeCrystal', 'images/diamond.png'); // Use diamond for time crystal
        this.load.image('MagnetStone', 'images/rock_normal.png'); // Use rock for magnet stone
        this.load.image('LuckyStar', 'images/light.png'); // Use light for lucky star
        this.load.image('GiftBox', 'images/gift.png'); // Biểu tượng hộp quà 🎁
        
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
        //ảnh random
        for (let i = 1; i <= 17; i++) {
            this.load.image(`Anh${i}`, `images/Anh${i}.png`);
        }
        // Spritesheets
        this.load.spritesheet('playerSheet', 'images/miner_sheet.png', { frameWidth: 32, frameHeight: 40 });
        this.load.spritesheet('shopkeeperSheet', 'images/shopkeeper_sheet.png', { frameWidth: 80, frameHeight: 80 });
        this.load.spritesheet('hookSheet', 'images/hook_sheet.png', { frameWidth: 13, frameHeight: 15 });
        this.load.spritesheet('moleSheet', 'images/mole_sheet.png', { frameWidth: 18, frameHeight: 13 });
        this.load.spritesheet('moleWithDiamondSheet', 'images/mole_with_diamond_sheet.png', { frameWidth: 18, frameHeight: 13 });
        this.load.spritesheet('explosion', 'images/explosive_fx_sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('bigger_explosion', 'images/bigger_explosive_fx_sheet.png', { frameWidth: 100, frameHeight  : 100});
        
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
        
        // ✅ Slot Machine Audio Files (for future use)
        this.load.audio('SlotSpin', 'audios/slot_spin.mp3');
        this.load.audio('ReelStop', 'audios/reel_stop.mp3');
        this.load.audio('SmallWin', 'audios/small_win.mp3');
        this.load.audio('BigWin', 'audios/big_win.mp3');
        this.load.audio('Jackpot', 'audios/jackpot.mp3');
        
        // ✅ Listen for load completion
        this.load.on('complete', () => {
            // All assets loaded successfully
        });
        
        // ✅ Listen for individual file loads
        this.load.on('filecomplete', (key, type) => {
            if (type === 'audio') {
                // Audio loaded successfully
            }
        });
        
        // ✅ Listen for load errors
        this.load.on('loaderror', (file) => {
            // Failed to load file
        });
    }

    create() {
        // ✅ Tạo dummy audio nếu không có audio nào được load
        if (!this.sound.get('Money') && !this.sound.get('High') && !this.sound.get('Low')) {
            // Tạo silent audio buffer để tránh crash
            const audioContext = this.sound.context;
            if (audioContext) {
                const silentBuffer = audioContext.createBuffer(1, 1, 22050);
                
                // Thêm dummy audio vào sound manager
                ['Money', 'High', 'Low', 'Normal', 'GoalMusic', 'MadeGoalMusic', 'GrabStart', 'GrabBack', 'HookReset', 'Explosive'].forEach(key => {
                    if (!this.sound.get(key)) {
                        this.sound.add(key, { source: silentBuffer });
                    }
                });
            }
        }

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
 
    this.anims.create({
    key: 'explosion_anim',
    frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 11 }), // số frame của sheet
    frameRate: 20,
    repeat: 0
    });

    this.anims.create({
    key: 'tnt-explosion',
    frames: this.anims.generateFrameNumbers('bigger_explosion', { start: 0, end: 11 }), // số frame của sheet
    frameRate: 20,
    repeat: 0
    });

    this.anims.create({
    key: 'mole_move',
    frames: this.anims.generateFrameNumbers('moleSheet', { start: 0, end: 6 }), // 6 frame chẳng hạn
    frameRate: 8,
    repeat: -1
    });
    
    this.anims.create({
    key: 'moleWithDiamond_move',
    frames: this.anims.generateFrameNumbers('moleWithDiamondSheet', { start: 0, end: 6 }),
    frameRate: 8,
    repeat: -1
    });

    this.scene.start('MenuScene');
}
}