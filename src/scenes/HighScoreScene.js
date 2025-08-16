export default class HighScoreScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HighScoreScene' });
    }

    preload() {
        // Đảm bảo tài nguyên được tải lại nếu cần
        if (!this.textures.exists('Menu') || !this.textures.exists('Title')) {
            this.load.image('Menu', 'images/menu.png');
            this.load.image('Title', 'images/title.png');
        }
    }

    create() {
        this.add.image(0, 0, 'Menu').setOrigin(0);
        this.add.image(this.cameras.main.centerX, 20, 'Title').setOrigin(0.5, 0);

        let highScores = JSON.parse(localStorage.getItem('highScores') || '[]');

        this.add.text(this.cameras.main.centerX, 80, 'Điểm Cao', {
            fontFamily: 'Kurland',
            fontSize: '24px',
            fill: '#1e7c04ff',
            align: 'center'
        }).setOrigin(0.5);

        if (highScores.length === 0) {
            this.add.text(this.cameras.main.centerX, 120, 'Chưa có điểm số nào!', {
                fontFamily: 'Kurland',
                fontSize: '18px',
                fill: '#0a389bff',
                align: 'center'
            }).setOrigin(0.5);
        } else {
            highScores.slice(0, 5).forEach((score, index) => {
                this.add.text(this.cameras.main.centerX, 120 + index * 20, `${index + 1}. $${score}`, {
                    fontFamily: 'Kurland',
                    fontSize: '18px',
                    fill: '#07c2ecff',
                    align: 'center'
                }).setOrigin(0.5);
            });
        }

        this.add.text(this.cameras.main.centerX, 220, 'Nhấn ENTER để quay lại', {
            fontFamily: 'Kurland',
            fontSize: '16px',
            fill: '#ffda21',
            align: 'center'
        }).setOrigin(0.5);

        this.input.keyboard.on('keydown-ENTER', () => {
            this.scene.start('MenuScene');
        });

        this.input.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }
}