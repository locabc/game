import * as C from '../utils/Constants.js';
import ShopScene from './ShopScene.js';

export default class TransitionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TransitionScene' });
    }

    // Nhận dữ liệu từ PlayScene
    init(data) {
        this.type = data.type;
        this.player = data.player;
        
        // Safety check
        if (!this.player) {
            // Nếu không có player, tạo mới hoặc quay về menu
            this.scene.start('MenuScene');
            return;
        }
    }

    // Hàm lưu highscore - chỉ lưu một lần cho mỗi session
    saveHighScore(player) {
        // ✅ Chỉ lưu nếu chưa từng lưu cho session này
        if (player.hasRecordedFinalScore) {
            return;
        }

        const finalScore = player.sessionHighScore; // Lấy điểm cao nhất của session
        
        let highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
        
        highScores.push(finalScore);
        highScores.sort((a, b) => b - a);
        highScores = highScores.slice(0, 5);
        
        localStorage.setItem('highScores', JSON.stringify(highScores));
        player.hasRecordedFinalScore = true; // Mark as recorded
    }

    create() {
        // Safety check nếu player không tồn tại
        if (!this.player) {
            this.scene.start('MenuScene');
            return;
        }
        
        this.add.image(0, 0, 'Goal').setOrigin(0);
        this.add.image(this.cameras.main.centerX, 20, 'Title').setOrigin(0.5, 0);
        this.add.image(this.cameras.main.centerX, 80, 'Panel').setOrigin(0.5, 0);

        let mainTextContent = '';
        let goalTextContent = '';

        switch (this.type) {
            case 'NextGoal':
                mainTextContent = this.player.level === 1 ? 'Mục tiêu của bạn là\n' : 'Mục tiêu tiếp theo của bạn là';
                goalTextContent = '$' + this.player.goal;                
                
                // ✅ Phát âm thanh GoalMusic
                if (this.sound.get('GoalMusic')) {
                    this.sound.play('GoalMusic');
                } else if (this.sound.get('High')) {
                    this.sound.play('High');
                }
                
                // Cho phép bỏ qua bằng cách nhấn phím
                this.input.keyboard.once('keydown', () => {
                    this.scene.start('PlayScene', { player: this.player });
                });
                
                this.input.once('pointerdown', () => {
                    this.scene.start('PlayScene', { player: this.player });
                });
                // Tự động chuyển sau 2.5 giây
                this.time.delayedCall(2500, () => {
                    this.scene.start('PlayScene', { player: this.player });
                });
                this.add.text(this.cameras.main.centerX, 125, mainTextContent, {
                    fontFamily: 'Kurland', 
                    fontSize: '20px', 
                    fill: '#ffda21', 
                    align: 'center',
                    lineSpacing: 5,
                    wordWrap: { width: 280, useAdvancedWrap: true },
                    padding: { left: 20, right: 20, top: 5, bottom: 10 }
                }).setOrigin(0.5);
                break;

            case 'MadeGoal':
                mainTextContent = 'Bạn đã đạt được\nmục tiêu !';
                
                // ✅ Play audio với safety check
                if (this.sound.get('MadeGoalMusic')) {
                    this.sound.play('MadeGoalMusic');
                }

                // ✅ Tự động hiển thị shop sau 2 giây
                this.time.delayedCall(2000, () => {
                    this.openShop();
                });
                this.add.text(this.cameras.main.centerX, 135, mainTextContent, {
                    fontFamily: 'Kurland', 
                    fontSize: '20px', 
                    fill: '#ffda21', 
                    align: 'center',
                    lineSpacing: 5,
                    wordWrap: { width: 280, useAdvancedWrap: true },
                    padding: { left: 20, right: 20, top: 5, bottom: 10 }
                }).setOrigin(0.5);
                break;

            case 'GameOver':
                mainTextContent = "Bạn đã không đạt được\n mục tiêu!\nNhấn để tiếp tục.";

                // ✅ Phát âm thanh thua cuộc
                if (this.sound.get('Low')) {
                    this.sound.play('Low');
                } else if (this.sound.get('Normal')) {
                    this.sound.play('Normal');
                }

                // ✅ Lưu highscore session khi thua
                this.saveHighScore(this.player);

                this.input.keyboard.once('keydown-ENTER', () => {
                    this.scene.start('MenuScene');
                });
                this.input.once('pointerdown', () => {
                    this.scene.start('MenuScene');
                });
                this.add.text(this.cameras.main.centerX, 138, mainTextContent, {
                    fontFamily: 'Kurland', 
                    fontSize: '20px', 
                    fill: '#ffda21', 
                    align: 'center',
                    lineSpacing: 5,
                    wordWrap: { width: 280, useAdvancedWrap: true },
                    padding: { left: 20, right: 20, top: 5, bottom: 10 }
                }).setOrigin(0.5);
                break;

            case 'Victory':
                mainTextContent = "Chúc mừng!\nBạn đã hoàn thành tất cả các cấp độ!";

                // ✅ Phát âm thanh chiến thắng
                if (this.sound.get('MadeGoalMusic')) {
                    this.sound.play('MadeGoalMusic');
                } else if (this.sound.get('High')) {
                    this.sound.play('High');
                }

                // ✅ Lưu highscore session khi thắng hoàn toàn
                this.saveHighScore(this.player);

                this.input.keyboard.once('keydown-ENTER', () => {
                    this.scene.start('MenuScene');
                });
                this.input.once('pointerdown', () => {
                    this.scene.start('MenuScene');
                });
                this.add.text(this.cameras.main.centerX, 125, mainTextContent, {
                    fontFamily: 'Kurland', 
                    fontSize: '20px', 
                    fill: '#ffda21', 
                    align: 'center',
                    lineSpacing: 5,
                    wordWrap: { width: 280, useAdvancedWrap: true },
                    padding: { left: 20, right: 20, top: 5, bottom: 10 }
                    }).setOrigin(0.5);
                break;
        }


        if (goalTextContent) {
            this.add.text(this.cameras.main.centerX, 160, goalTextContent, {
                fontFamily: 'Kurland', fontSize: '20px', fill: '#43a047', align: 'center'
            }).setOrigin(0.5);
        }
    }

    // ✅ Methods để handle shop
    openShop() {
        // Launch shop scene với current level data
        const shopScene = this.scene.get('ShopScene') || this.scene.add('ShopScene', ShopScene, false);
        this.scene.pause();
        this.scene.launch('ShopScene', { 
            player: this.player, 
            currentLevel: this.player.level 
        });

        // Listen for shop close
        shopScene.events.once('shop-closed', (updatedPlayer) => {
            this.player = updatedPlayer;
            this.scene.resume();
            this.continueToNextLevel();
        });
    }

    continueToNextLevel() {
        this.scene.start('TransitionScene', { type: 'NextGoal', player: this.player });
    }
}
