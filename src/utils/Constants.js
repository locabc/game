export const VIRTUAL_WIDTH = 320;
export const VIRTUAL_HEIGHT = 230;

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

// 📱 iPhone Detection & Safe Area Utilities
export const DEVICE_UTILS = {
    // Kiểm tra có phải iPhone không
    isIPhone() {
        return /iPhone|iPod/.test(navigator.userAgent);
    },
    
    // Kiểm tra có phải iPad không
    isIPad() {
        return /iPad/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    },
    
    // Kiểm tra có phải iOS không
    isIOS() {
        return this.isIPhone() || this.isIPad();
    },
    
    // Kiểm tra có notch/Dynamic Island không
    hasNotch() {
        if (!this.isIPhone()) return false;
        
        // iPhone với notch/Dynamic Island có safe-area-inset-top > 0
        const topInset = this.getSafeAreaInset('top');
        return topInset > 20; // Thông thường iPhone không có notch có status bar ~20px
    },
    
    // Lấy safe area inset values
    getSafeAreaInset(side = 'top') {
        if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('padding', 'env(safe-area-inset-top)')) {
            const testEl = document.createElement('div');
            testEl.style.padding = `env(safe-area-inset-${side})`;
            testEl.style.position = 'fixed';
            testEl.style.top = '0';
            testEl.style.left = '0';
            testEl.style.visibility = 'hidden';
            document.body.appendChild(testEl);
            
            const inset = parseInt(getComputedStyle(testEl).paddingTop) || 0;
            document.body.removeChild(testEl);
            return inset;
        }
        return 0;
    },
    
    // Lấy safe area cho tất cả các hướng
    getAllSafeAreaInsets() {
        return {
            top: this.getSafeAreaInset('top'),
            bottom: this.getSafeAreaInset('bottom'),
            left: this.getSafeAreaInset('left'),
            right: this.getSafeAreaInset('right')
        };
    },
    
    // Tính toán vị trí UI an toàn cho iPhone
    getSafeUIPosition(x, y, element = null) {
        if (!this.isIPhone()) return { x, y };
        
        const safeArea = this.getAllSafeAreaInsets();
        
        // Điều chỉnh vị trí dựa trên safe area
        let safeX = x;
        let safeY = y;
        
        // Tránh notch/status bar ở trên
        if (y < safeArea.top + 10) {
            safeY = safeArea.top + 10;
        }
        
        // Tránh home indicator ở dưới
        if (element && element.height) {
            const screenHeight = window.innerHeight;
            if (y + element.height > screenHeight - safeArea.bottom - 10) {
                safeY = screenHeight - safeArea.bottom - element.height - 10;
            }
        }
        
        // Tránh các cạnh bên
        if (x < safeArea.left + 5) {
            safeX = safeArea.left + 5;
        }
        
        return { x: safeX, y: safeY };
    },
    
    // CSS safe area cho web components
    getSafeAreaCSS() {
        if (!this.isIOS()) return '';
        
        return `
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
        `;
    },
    
    // Margin an toàn cho fullscreen
    getFullscreenSafeMargins() {
        if (!this.isIPhone()) return { top: 0, bottom: 0, left: 0, right: 0 };
        
        const safeArea = this.getAllSafeAreaInsets();
        return {
            top: Math.max(safeArea.top, 44), // Ít nhất 44px cho notch area
            bottom: Math.max(safeArea.bottom, 20), // Ít nhất 20px cho home indicator
            left: safeArea.left,
            right: safeArea.right
        };
    }
}