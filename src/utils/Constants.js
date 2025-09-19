// 📱 Kiểm tra iPhone và điều chỉnh kích thước cho notch
const isIPhone = () => {
    return /iPhone/i.test(navigator.userAgent) || 
           (/iPad|iPod/i.test(navigator.userAgent) && !window.MSStream);
};

// 🎮 Điều chỉnh kích thước game dựa trên thiết bị
export const VIRTUAL_WIDTH = 320;
export const VIRTUAL_HEIGHT = isIPhone() ? 180 : 230;

// 📱 iPhone notch handling
if (isIPhone()) {
    // Thêm CSS để tránh vùng notch
    const style = document.createElement('style');
    style.textContent = `
        body {
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
        }
        #phaser-game {
            margin-top: env(safe-area-inset-top, 20px);
            margin-bottom: env(safe-area-inset-bottom, 20px);
        }
        canvas {
            border-radius: 10px;
        }
    `;
    document.head.appendChild(style);
    
    // Thêm meta tag viewport cho iPhone
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no';
    
    console.log('📱 iPhone detected - Adjusted height to 180px and added notch protection');
}

export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 40;

export const HOOK_WIDTH = 13;
export const HOOK_HEIGHT = 15;
export const HOOK_MIN_ANGLE = -75;
export const HOOK_MAX_ANGLE = 75;
export const HOOK_ROTATE_SPEED = 65;
export const HOOK_MAX_LENGTH = 550;
export const HOOK_GRAB_SPEED = 300;

export const FONT_DEFAULTS = {
    fontFamily: '"visitor1"',
    fontSize: '10px',
    fill: '#000'
}