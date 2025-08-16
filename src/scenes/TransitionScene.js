import * as C from '../utils/Constants.js';

export default class TransitionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TransitionScene' });
    }

    init(data) {
    this.type = data.type;
    this.player = data.player; // Nhận player từ scene trước đó
}

create() {
    this.add.image(0, 0, 'Goal').setOrigin(0);
    this.add.image(this.cameras.main.centerX, 20, 'Title').setOrigin(0.5, 0);
    this.add.image(this.cameras.main.centerX, 80, 'Panel').setOrigin(0.5, 0);

    let mainTextContent = '';
    let goalTextContent = '';

    switch (this.type) {
        case 'NextGoal':
            mainTextContent = this.player.level === 1 ? 'Your First Goal is' : 'Your Next Goal is';
            goalTextContent = '$' + this.player.goal;
            this.sound.play('GoalMusic');
            this.time.delayedCall(4000, () => {
                // Truyền player tới PlayScene
                this.scene.start('PlayScene', { player: this.player });
            });
            break;
            
        case 'MadeGoal':
            mainTextContent = 'You made it to\nthe next Level!';
            this.sound.play('MadeGoalMusic');
            this.time.delayedCall(4000, () => {
                // Tạm thời, vì chưa có ShopScene, ta lại vào vòng lặp NextGoal
                this.scene.start('TransitionScene', { type: 'NextGoal', player: this.player });
            });
            break;

        case 'GameOver':
            mainTextContent = "You didn't reach the goal!\nPress Enter to continue.";
            this.input.keyboard.once('keydown-ENTER', () => {
                this.scene.start('MenuScene');
            });
            this.input.once('pointerdown', () => {
                this.scene.start('MenuScene');
            });
            break;
    }

    this.add.text(this.cameras.main.centerX, 110, mainTextContent, {
        fontFamily: 'Kurland', fontSize: '20px', fill: '#ffda21', align: 'center'
    }).setOrigin(0.5);

    if (goalTextContent) {
        this.add.text(this.cameras.main.centerX, 160, goalTextContent, {
            fontFamily: 'Kurland', fontSize: '20px', fill: '#43a047', align: 'center'
        }).setOrigin(0.5);
    }
}
}