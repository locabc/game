import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import PlayScene from './scenes/PlayScene.js';
import TransitionScene from './scenes/TransitionScene.js';
import HighScoreScene from './scenes/HighScoreScene.js';
import ShopScene from './scenes/ShopScene.js';
import SlotMachineScene from './scenes/SlotMachineScene.js';
import * as C from './utils/Constants.js';

// 📱 iPhone detection and notch handling
const isIPhone = () => {
    return /iPhone/i.test(navigator.userAgent) || 
           (/iPad|iPod/i.test(navigator.userAgent) && !window.MSStream);
};

// 🎨 Apply iPhone-specific styles
if (isIPhone()) {
    console.log('📱 iPhone detected - Applying notch-safe styles and 180px height');
    
    // Add iPhone-specific CSS
    const iPhoneStyle = document.createElement('style');
    iPhoneStyle.textContent = `
        body {
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            background: #000;
        }
        #phaser-game {
            margin-top: max(env(safe-area-inset-top), 20px);
            margin-bottom: max(env(safe-area-inset-bottom), 20px);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
        }
        canvas {
            border-radius: 10px;
            max-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px);
        }
        
        /* Ensure fullscreen button doesn't interfere with notch */
        .fullscreen-btn {
            bottom: max(env(safe-area-inset-bottom), 20px) !important;
        }
    `;
    document.head.appendChild(iPhoneStyle);
}

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT, // Tự động co giãn để vừa vặn
        parent: 'phaser-game', // ID của thẻ div chứa game (nếu có)
        autoCenter: Phaser.Scale.CENTER_BOTH, // Luôn đặt game ở giữa màn hình
        width: C.VIRTUAL_WIDTH,
        height: C.VIRTUAL_HEIGHT
    },
    pixelArt: false,
    antialias: true, // ✅ Thêm antialias để ảnh smooth
    // ✅ Audio configuration for mobile
    audio: {
        disableWebAudio: false,
        noAudio: false
    },
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
        HighScoreScene,
        ShopScene,
        SlotMachineScene
    ]
};


const game = new Phaser.Game(config);

// ✅ Audio Context Management for Mobile
class MobileAudioManager {
    constructor(game) {
        this.game = game;
        this.audioContext = null;
        this.isUnlocked = false;
        this.pendingResumePromise = null;
        this.init();
    }

    init() {
        // Setup unlock listeners
        this.setupTouchUnlock();
        
        // Handle app visibility changes
        this.setupVisibilityHandling();
        
        // Handle page focus/blur
        this.setupFocusHandling();
    }

    setupTouchUnlock() {
        const unlockAudio = (event) => {
            if (this.isUnlocked) return;
            
            // Wait for game to be fully loaded
            if (!this.game.sound || !this.game.sound.context) {
                return;
            }
            
            // Only get audio context after user interaction
            this.audioContext = this.game.sound.context;
            
            if (this.audioContext.state === 'suspended') {
                if (!this.pendingResumePromise) {
                    this.pendingResumePromise = this.audioContext.resume()
                        .then(() => {
                            this.isUnlocked = true;
                            this.pendingResumePromise = null;
                        })
                        .catch(err => {
                            this.pendingResumePromise = null;
                        });
                }
            } else if (this.audioContext.state === 'running') {
                this.isUnlocked = true;
            }
        };

        // Listen for user interactions to unlock audio
        ['touchstart', 'mousedown', 'keydown', 'click'].forEach(event => {
            document.addEventListener(event, unlockAudio, { 
                once: false,
                passive: true 
            });
        });
    }

    setupVisibilityHandling() {
        // Handle page visibility change (app switching)
        document.addEventListener('visibilitychange', () => {
            if (!this.audioContext) {
                this.audioContext = this.game.sound?.context;
            }
            
            if (this.audioContext && !document.hidden) {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().catch(err => {
                        // Failed to resume audio after app switch
                    });
                }
            }
        });
    }

    setupFocusHandling() {
        window.addEventListener('focus', () => {
            if (!this.audioContext) {
                this.audioContext = this.game.sound?.context;
            }
            
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(err => {
                    // Failed to resume audio on focus
                });
            }
        });

        // Don't suspend audio on blur - keep playing
    }

    // Force resume audio (can be called from scenes)
    forceResumeAudio() {
        return new Promise((resolve, reject) => {
            if (!this.game.sound || !this.game.sound.context) {
                resolve();
                return;
            }

            // Get audio context only when explicitly requested by user
            if (!this.audioContext) {
                this.audioContext = this.game.sound.context;
            }
            
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume()
                    .then(() => {
                        this.isUnlocked = true;
                        resolve();
                    })
                    .catch(err => {
                        resolve(); // Resolve anyway to not block game
                    });
            } else {
                this.isUnlocked = true;
                resolve();
            }
        });
    }

    // Check if audio is ready
    isAudioReady() {
        return this.audioContext && this.audioContext.state === 'running';
    }
}

// ✅ Đơn giản hóa việc tạo audio manager
function createAudioManager() {
    if (!window.audioManager && game.sound) {
        window.audioManager = new MobileAudioManager(game);
    }
}

// Tạo audio manager khi game sẵn sàng
game.events.once('ready', createAudioManager);

// Fallback sau 500ms
setTimeout(createAudioManager, 500);