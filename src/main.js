import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import PlayScene from './scenes/PlayScene.js';
import TransitionScene from './scenes/TransitionScene.js';
// import ShopScene from './scenes/ShopScene.js';
import * as C from './utils/Constants.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT, // Tự động co giãn để vừa vặn
        parent: 'phaser-game', // ID của thẻ div chứa game (nếu có)
        autoCenter: Phaser.Scale.CENTER_BOTH, // Luôn đặt game ở giữa màn hình
        width: C.VIRTUAL_WIDTH,
        height: C.VIRTUAL_HEIGHT
    },
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            // debug: true, // Bật để thấy các vùng va chạm
        }
    },
    scene: [
        BootScene,
        MenuScene,
        PlayScene,
        TransitionScene,
        // ShopScene
    ]
};

const game = new Phaser.Game(config);
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        game.scale.resize(window.innerWidth, window.innerHeight);
    }, 100); // Delay nhỏ để đảm bảo orientation cập nhật
});