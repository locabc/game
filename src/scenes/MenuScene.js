import Player from '../entities/Player.js';
export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        
        // Các lựa chọn trong menu
        this.options = [
            { text: 'Start Game', scene: 'TransitionScene', data: { type: 'NextGoal' } },
            { text: 'High Score', scene: 'HighScoreScene', data: null } // Updated to point to a HighScoreScene
        ];
        this.selectedIndex = 0;
        this.textObjects = []; // Array to store text objects for interactivity
    }

    create() {
        // Vẽ nền và tiêu đề game (nếu có)
        this.add.image(0, 0, 'Menu').setOrigin(0);
        this.add.image(this.cameras.main.centerX, 20, 'Title').setOrigin(0.5, 0);

        // Tạo các lựa chọn menu dưới dạng text object
        this.options.forEach((option, index) => {
            const y = 150 + index * 20;
            const text = this.add.text(30, y, option.text, { 
                fontFamily: 'Kurland',
                fontSize: '20px', 
                fill: '#ffda21'
            }).setInteractive(); // Make text clickable

            // Store text object for later use
            this.textObjects.push(text);

            // Add hover effect
            text.on('pointerover', () => {
                this.selectedIndex = index;
                this.arrow.y = 152 + index * 20;
                text.setStyle({ fill: '#ffffff' }); // Change color on hover
            });

            text.on('pointerout', () => {
                text.setStyle({ fill: '#ffda21' }); // Revert color
            });

            // Handle click event
            text.on('pointerdown', () => {
                this.selectedIndex = index;
                this.selectOption();
            });
        });

        // Tạo mũi tên chỉ thị
        this.arrow = this.add.image(15, 152, 'MenuArrow').setOrigin(0.5, 0);

        // Lắng nghe sự kiện bàn phím
        this.input.keyboard.on('keydown-UP', () => this.moveSelection(-1), this);
        this.input.keyboard.on('keydown-DOWN', () => this.moveSelection(1), this);
        this.input.keyboard.on('keydown-ENTER', this.selectOption, this);
        this.input.keyboard.on('keydown-SPACE', this.selectOption, this);
        
        console.log("Menu Scene created. Ready for input.");
    }
    
    // Hàm di chuyển lựa chọn
    moveSelection(change) {
        this.selectedIndex += change;

        // Giới hạn index trong khoảng cho phép
        if (this.selectedIndex < 0) {
            this.selectedIndex = this.options.length - 1;
        } else if (this.selectedIndex >= this.options.length) {
            this.selectedIndex = 0;
        }

        // Cập nhật vị trí của mũi tên
        this.arrow.y = 152 + this.selectedIndex * 20;

        // Update text colors to highlight selection
        this.textObjects.forEach((text, index) => {
            text.setStyle({ fill: index === this.selectedIndex ? '#ffffff' : '#ffda21' });
        });
    }

    // Hàm chọn một lựa chọn
    selectOption() {
        const selected = this.options[this.selectedIndex];
        
        if (selected.scene) {
            // Nếu chọn "Start Game", tạo một người chơi mới
            if (selected.text === 'Start Game') {
                const player = new Player();
                player.dynamiteCount = 1;
                this.game.player = player;
                this.scene.start(selected.scene, { ...selected.data, player: player });
            } else {
                // Handle High Score scene
                this.scene.start(selected.scene, selected.data);
            }
        } else {
            console.log("Selected option:", selected.text);
        }
    }
}