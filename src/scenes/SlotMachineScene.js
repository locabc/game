// src/scenes/SlotMachineScene.js
import * as C from '../utils/Constants.js';

export default class SlotMachineScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SlotMachineScene' });
        console.log('SlotMachineScene constructor called');
        console.log('Scene constructor - this:', !!this, 'this.sys:', !!this.sys);
    }

    init(data) {
        console.log('SlotMachineScene init called with data:', data);
        console.log('Init - this:', !!this, 'this.sys:', !!this.sys, 'this.game:', !!this.game);
        
    this.player = data.player;        // Slot machine state
        this.isSpinning = false;
        this.spinCost = 500;
        this.remainingSpins = 5; // Limit to 5 spins
        this.reels = [null, null, null];
        this.reelSprites = [];
        this.spinResults = [];
        this.lastSpinTime = 0; // For spin delay
        this.spinCooldown = 6000; // 6 seconds between spins

        // Effects containers
        this.lightEffects = [];
        this.coinRainTimer = null;
        this.tickingSound = null;
        this.buttonPressed = false;
        this.cleanupTimer = null;
        this.infoPanelExists = false;
        this.closeButtonHandlers = null;
        this.panelCleanupComplete = false;
        this.lastPanelActionTime = 0; // Thêm timestamp để kiểm soát tần suất đóng mở // Thêm cờ này để theo dõi quá trình dọn dẹp
    }

    create() {
        console.log('SlotMachineScene create called');
        console.log('Create - this:', !!this, 'this.sys:', !!this.sys, 'this.add:', !!this.add);
        console.log('Create - scene key:', this.scene?.key, 'scene active:', this.scene?.isActive());
        
        // Background
        this.add.rectangle(0, 0, C.VIRTUAL_WIDTH, C.VIRTUAL_HEIGHT, 0x1a1a2e).setOrigin(0);
        
        // Title
        const title = this.add.text(C.VIRTUAL_WIDTH / 2, 30, '🎰 SLOT MACHINE 🎰', {
            fontFamily: 'Arial',
            fontSize: '15px',
            fill: '#008cffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Welcome message for level milestone
        const welcomeText = this.add.text(C.VIRTUAL_WIDTH / 2, 55, `Chúc mừng hoàn thành Level ${this.player.level - 1}!`, {
            fontFamily: 'Arial',
            fontSize: '12px',
            fill: '#0a8eecff'
        }).setOrigin(0.5);

        // Slot machine frame
        const slotFrame = this.add.rectangle(C.VIRTUAL_WIDTH / 2, 120, 180, 100, 0x8B4513);
        slotFrame.setStrokeStyle(4, 0xFFD700);
        
        // Inner slot area
        const slotInner = this.add.rectangle(C.VIRTUAL_WIDTH / 2, 120, 160, 80, 0x000000);
        
        // Create reel containers
        this.createReels();
        
        // Money display on the left (simplified)
        const costBg = this.add.rectangle(33, 110, 65, 81, 0x333333);
        costBg.setStrokeStyle(2, 0xffd700);
        this.moneyText = this.add.text(costBg.x, 83, `$${this.player.money}`, {
            fontFamily: 'Arial',
            fontSize: '15px',
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5, 0.5);

        // Remaining spins display
        this.remainingSpinsText = this.add.text(costBg.x, 125, `  Còn:\n ${this.remainingSpins} lượt`, {
            fontFamily: 'Arial',
            fontSize: '13px',
            fill: '#0ecad3ff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5);

        // Buttons
        this.createButtons();
        
        // Result text (hidden initially)
        this.resultText = this.add.text(C.VIRTUAL_WIDTH / 2, 250, '', {
            fontFamily: 'Arial',
            fontSize: '16px',
            fill: '#ffd700',
            align: 'center'
        }).setOrigin(0.5).setVisible(false);
        
        // Setup input
        this.setupInput();
        
        // Add some sparkle effects around the machine
        this.addSparkleEffects();
        
        // Add pulsing lights around machine
        this.addPulsingLights();
        
        // ✅ Ensure SlotMachine audio objects are created
        this.time.delayedCall(100, () => {
            const slotSounds = ['SlotSpin', 'ReelStop', 'SmallWin', 'BigWin', 'Jackpot'];
            slotSounds.forEach(soundKey => {
                if (this.cache.audio.exists(soundKey) && !this.sound.get(soundKey)) {
                    try {
                        this.sound.add(soundKey);
                    } catch (error) {
                        console.error(`Failed to create sound: ${soundKey}`, error);
                    }
                }
            });
        });
        
        // Welcome animation
        this.tweens.add({
            targets: [title, welcomeText],
            alpha: { from: 0, to: 1 },
            y: { from: '-=10', to: '+=10' },
            duration: 1000,
            ease: 'Power2'
        });
    }

    createReels() {
        const reelX = [C.VIRTUAL_WIDTH / 2 - 50, C.VIRTUAL_WIDTH / 2, C.VIRTUAL_WIDTH / 2 + 50];
        const reelY = 120;
        
        // Define slot symbols with their display and probabilities
        this.symbols = [
            { key: 'gold', display: '💰', weight: 35, value: 'gold' },
            { key: 'dynamite', display: '🧨', weight: 30, value: 'dynamite' },
            { key: 'diamond', display: '💎', weight: 7, value: 'diamond' },
            { key: 'star', display: '⭐', weight: 5, value: 'star' },
            { key: 'clover', display: '🍀', weight: 6, value: 'clover' },
            { key: 'snowflake', display: '❄️', weight: 9, value: 'snowflake' }, // 5% chance for time freeze
            { key: 'potion', display: '💊', weight: 8, value: 'potion' }
        ];
        
        // Create a master mask for all reels to hide symbols outside the frames
        const maskGraphics = this.add.graphics();
        maskGraphics.fillStyle(0xffffff);
        
        // Create mask rectangles for each reel (only show symbols within these areas)
        for (let i = 0; i < 3; i++) {
            maskGraphics.fillRect(reelX[i] - 22, reelY - 35, 44, 70);
        }
        
        const reelMask = maskGraphics.createGeometryMask();
        
        for (let i = 0; i < 3; i++) {
            // Reel background
            const reelBg = this.add.rectangle(reelX[i], reelY, 45, 70, 0x333333);
            reelBg.setStrokeStyle(2, 0x666666);
            
            // Create symbols for scrolling
            const symbolsInReel = [];
            
            // Create 5 symbols for smooth scrolling
            for (let j = 0; j < 5; j++) {
                const symbol = this.add.text(
                    reelX[i], // Direct positioning
                    reelY + ((j - 2) * 40), // -80, -40, 0, 40, 80 relative to reel center
                    this.symbols[j % this.symbols.length].display,
                    {
                        fontFamily: 'Arial',
                        fontSize: '32px'
                    }
                ).setOrigin(0.5);
                
                // Apply mask to hide symbols outside reel frame
                symbol.setMask(reelMask);
                
                // Only show the center symbol clearly initially
                symbol.setAlpha(j === 2 ? 1 : 0.3);
                symbolsInReel.push(symbol);
            }
            
            // Store reel data
            this.reelSprites.push({
                symbols: symbolsInReel,
                centerIndex: 2, // Middle symbol is the main one
                x: reelX[i],
                y: reelY,
                scrollOffset: 0
            });
        }
    }

    createButtons() {
        // Pill-shaped spin button below center reel with "QUAY" text
        this.spinButton = this.add.rectangle(C.VIRTUAL_WIDTH / 2, 200, 80, 35, 0x2ecc71);
        this.spinButton.setInteractive({ useHandCursor: true });
        // Make it pill-shaped by setting corner radius
        this.spinButton.setDisplaySize(80, 35);
        
        // Spin button text "QUAY"
        this.spinButtonText = this.add.text(C.VIRTUAL_WIDTH / 2, 200, 'QUAY', {
            fontFamily: 'Arial',
            fontSize: '16px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Exit button on top right corner
        this.exitButton = this.add.rectangle(290, 31, 15, 15, 0xe74c3c);
        this.exitButton.setStrokeStyle(2, 0xc0392b);
        this.exitButton.setInteractive({ useHandCursor: true });
        
        this.exitButtonText = this.add.text(C.VIRTUAL_WIDTH - 30, 30, '✕', {
            fontFamily: 'Arial',
            fontSize: '16px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Info button below exit button
        this.infoButton = this.add.rectangle(290, 50, 22, 18, 0x3498db);
        this.infoButton.setInteractive({ useHandCursor: true });

        this.infoButtonText = this.add.text(C.VIRTUAL_WIDTH - 30, 50, 'Info', {
            fontFamily: 'Arial',
            fontSize: '10px',
            fill: '#ffffffff'
        }).setOrigin(0.5);
        
        // Button events
        this.spinButton.on('pointerdown', () => this.spin());
        this.exitButton.on('pointerdown', () => this.exitSlotMachine());
        this.infoButton.on('pointerdown', () => {
            console.log('Info button pointerdown, scene context:', !!this, !!this.sys);
            this.showInfoPanel();
        });
        
        // Touch/click events for mobile compatibility
        this.spinButton.on('pointerup', () => this.spin());
        this.exitButton.on('pointerup', () => this.exitSlotMachine());
        this.infoButton.on('pointerup', () => {
            console.log('Info button pointerup, scene context:', !!this, !!this.sys);
            this.showInfoPanel();
        });
        
        // Button hover effects
        this.spinButton.on('pointerover', () => {
            if (!this.isSpinning && this.player.money >= this.spinCost) {
                this.spinButton.setFillStyle(0x58d68d);
                this.spinButton.setScale(1.1);
            }
        });
        
        this.spinButton.on('pointerout', () => {
            this.spinButton.setFillStyle(0x2ecc71);
            this.spinButton.setScale(1.0);
        });
        
        this.exitButton.on('pointerover', () => {
            this.exitButton.setFillStyle(0xec7063);
            this.exitButton.setScale(1.1);
        });
        
        this.exitButton.on('pointerout', () => {
            this.exitButton.setFillStyle(0xe74c3c);
            this.exitButton.setScale(1.0);
        });
        
        this.infoButton.on('pointerover', () => {
            this.infoButton.setFillStyle(0x5dade2);
            this.infoButton.setScale(1.1);
        });
        
        this.infoButton.on('pointerout', () => {
            this.infoButton.setFillStyle(0x3498db);
            this.infoButton.setScale(1.0);
        });
    }

    setupInput() {
        // Keyboard controls (keep SPACE for spin, remove ESC instruction display)
        this.input.keyboard.on('keydown-SPACE', () => {
            if (!this.isSpinning) this.spin();
        });
        
        this.input.keyboard.on('keydown-ESC', () => {
            this.exitSlotMachine();
        });
    }

    addSparkleEffects() {
        // Add some background sparkles for atmosphere
        for (let i = 0; i < 15; i++) {
            const sparkle = this.add.circle(
                Phaser.Math.Between(20, C.VIRTUAL_WIDTH - 20),
                Phaser.Math.Between(50, C.VIRTUAL_HEIGHT - 50),
                2,
                0xffd700,
                0.6
            );
            
            this.tweens.add({
                targets: sparkle,
                alpha: 0.2,
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
        }
    }

    addPulsingLights() {
        // Create colorful pulsing lights around the slot machine frame - fill the golden border
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500, 0xff1493, 0x32cd32, 0x1e90ff];
        const positions = [];
        
        // Top border lights (more dense)
        for (let i = 0; i < 16; i++) {
            positions.push({
                x: C.VIRTUAL_WIDTH / 2 - 90 + (i * 12),
                y: 70 + Math.sin(i * 0.3) * 3, // Slight wave effect
                row: 0 // Top row
            });
        }
        
        // Left border lights
        for (let i = 0; i < 8; i++) {
            positions.push({
                x: C.VIRTUAL_WIDTH / 2 - 92,
                y: 80 + (i * 12),
                row: 1 // Left column
            });
        }
        
        // Right border lights
        for (let i = 0; i < 8; i++) {
            positions.push({
                x: C.VIRTUAL_WIDTH / 2 + 92,
                y: 80 + (i * 12),
                row: 2 // Right column
            });
        }
        
        // Bottom border lights (fewer to avoid overlap)
        for (let i = 0; i < 15; i++) {
            positions.push({
                x: C.VIRTUAL_WIDTH / 2 - 81 + (i * 12),
                y: 170 + Math.sin(i * 0.3) * 3, // Slight wave effect
                row: 3 // Bottom row
            });
        }

        // Add all regular lights with alternating pattern
        positions.forEach((pos, index) => {
            const light = this.add.circle(pos.x, pos.y, 3, colors[index % colors.length], 0.9);
            this.lightEffects.push(light);
            
            // Create alternating wave pattern - each row has different timing
            const baseDelay = pos.row * 200; // Each row starts at different time
            const waveDelay = (index % 5) * 100; // Wave effect within each row
            
            // Pulsing animation with alternating pattern
            this.tweens.add({
                targets: light,
                alpha: { from: 0.3, to: 1 },
                scale: { from: 0.7, to: 1.3 },
                duration: 800,
                yoyo: true,
                repeat: -1,
                delay: baseDelay + waveDelay // Stagger by row and position for wave effect
            });
        });
    
        // Add sweeping wave effect every 3 seconds
        this.time.addEvent({
            delay: 3000,
            callback: () => {
                this.createSweepingWave();
            },
            repeat: -1
        });
    }
    
    createSweepingWave() {
        // Create a sweeping light wave across all lights
        this.lightEffects.forEach((light, index) => {
            // Temporary bright flash that sweeps across
            this.tweens.add({
                targets: light,
                alpha: 1,
                scale: 1.8,
                duration: 150,
                yoyo: true,
                delay: index * 20, // Fast sweep
                ease: 'Power2.easeOut'
            });
        });
    }

    addScreenShake(duration = 300) {
        // Shake camera for dramatic effect
        this.cameras.main.shake(duration, 0.01);
    }

    accelerateLights() {
        // Make lights pulse faster during spin
        this.lightEffects.forEach(light => {
            this.tweens.killTweensOf(light);
            this.tweens.add({
                targets: light,
                alpha: { from: 0.8, to: 1 },
                scale: { from: 1, to: 1.6 },
                duration: 200,
                yoyo: true,
                repeat: 10, // For spin duration
                onComplete: () => {
                    // Return to normal pulsing
                    this.tweens.add({
                        targets: light,
                        alpha: { from: 0.3, to: 1 },
                        scale: { from: 0.8, to: 1.4 },
                        duration: 800,
                        yoyo: true,
                        repeat: -1
                    });
                }
            });
        });
    }

    startTickingSound() {
        // Play rapid ticking sound during spin
        this.tickingSound = this.time.addEvent({
            delay: 100, // 10 times per second
            callback: () => {
                this.playSlotSound('ReelStop', 0.2, 'HookReset');
            },
            repeat: 25 // About 2.5 seconds of ticking
        });
    }

    stopTickingSound() {
        if (this.tickingSound) {
            this.tickingSound.remove();
            this.tickingSound = null;
        }
    }

    addCoinRainEffect(winAmount) {
        // Number of coins based on win amount
        const coinCount = Math.min(Math.floor(winAmount / 100), 20);
        
        for (let i = 0; i < coinCount; i++) {
            // Create coin symbol
            const coin = this.add.text(
                Phaser.Math.Between(50, C.VIRTUAL_WIDTH - 50),
                -20,
                '💰',
                { fontSize: '16px' }
            );
            
            // Animate coin falling
            this.tweens.add({
                targets: coin,
                y: C.VIRTUAL_HEIGHT + 20,
                rotation: Math.PI * 4, // Multiple spins
                duration: Phaser.Math.Between(1000, 2000),
                delay: i * 100, // Stagger the coins
                ease: 'Bounce.easeOut',
                onComplete: () => {
                    coin.destroy();
                }
            });
            
            // Add sparkle effect to coins
            this.tweens.add({
                targets: coin,
                alpha: { from: 1, to: 0.7 },
                scale: { from: 1, to: 1.3 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    }

    addReelStopEffect(reel, reelIndex, completedCount) {
        // Stage 1: Sudden stop with overshoot
        this.tweens.add({
            targets: reel,
            scaleX: 1.4,
            scaleY: 0.8,
            duration: 100,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Stage 2: Bounce back
                this.tweens.add({
                    targets: reel,
                    scaleX: 0.9,
                    scaleY: 1.2,
                    duration: 150,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        // Stage 3: Settle with glow
                        this.tweens.add({
                            targets: reel,
                            scaleX: 1,
                            scaleY: 1,
                            duration: 200,
                            ease: 'Elastic.easeOut',
                            onComplete: () => {
                                // Add brief glow effect
                                this.addReelGlow(reel, reelIndex);
                            }
                        });
                    }
                });
            }
        });
        
        // Add mechanical stop sound variation
        this.time.delayedCall(50, () => {
            this.playSlotSound('ReelStop', 0.4, 'HookReset');
        });
    }

    addReelGlow(reel, reelIndex) {
        // Create glow effect around the stopped reel
        const glow = this.add.circle(reel.x, reel.y, 25, 0xffd700, 0.3);
        
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.5, to: 0 },
            scale: { from: 0.8, to: 1.5 },
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => {
                glow.destroy();
            }
        });
        
        // Add sparkle burst around reel
        for (let i = 0; i < 5; i++) {
            const sparkle = this.add.text(
                reel.x + Phaser.Math.Between(-30, 30),
                reel.y + Phaser.Math.Between(-30, 30),
                '✨',
                { fontSize: '10px' }
            );
            
            this.tweens.add({
                targets: sparkle,
                alpha: 0,
                scale: 1.5,
                y: sparkle.y - 20,
                duration: 600,
                delay: i * 50,
                onComplete: () => sparkle.destroy()
            });
        }
    }

    addSuspenseEffect(callback) {
        // Create dramatic pause with pulsing effect
        this.reelSprites.forEach((reelData, index) => {
            // Get center symbol in each reel
            const centerSymbol = reelData.symbols[2]; // Middle symbol
            
            this.tweens.add({
                targets: centerSymbol,
                alpha: { from: 1, to: 0.7 },
                scale: { from: 1, to: 1.1 },
                duration: 200,
                yoyo: true,
                repeat: 2
            });
        });
        
        // Dramatic pause with countdown
        let countdown = 3;
        const suspenseTimer = this.time.addEvent({
            delay: 300,
            callback: () => {
                // Pulse lights faster
                this.lightEffects.forEach(light => {
                    this.tweens.add({
                        targets: light,
                        scale: 1.8,
                        duration: 100,
                        yoyo: true
                    });
                });
                
                countdown--;
                if (countdown <= 0) {
                    suspenseTimer.remove();
                    callback();
                }
            },
            repeat: 2
        });
    }

    addPreSpinEffect(callback) {
        // Skip preview effect to avoid symbols getting stuck at position 0
        // Directly start the main spin
        this.time.delayedCall(100, callback);
    }

    getRandomSymbol() {
        const totalWeight = this.symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const symbol of this.symbols) {
            random -= symbol.weight;
            if (random <= 0) {
                return symbol;
            }
        }
        
        return this.symbols[0]; // fallback
    }

    spin() {
        const currentTime = this.time.now;
        
        // Check remaining spins limit
        if (this.remainingSpins <= 0) {
            this.showMessage('Hết lượt quay! Thoát slot machine...', '#ff4444');
            this.time.delayedCall(2000, () => this.exitSlotMachine());
            return;
        }
        
        // Check cooldown
        if (currentTime - this.lastSpinTime < this.spinCooldown) {
            const remainingTime = Math.ceil((this.spinCooldown - (currentTime - this.lastSpinTime)) / 1000);
            this.showMessage(`Đợi ${remainingTime}s nữa!`, '#ffaa00');
            return;
        }
        
        if (this.isSpinning || this.player.money < this.spinCost) {
            if (this.player.money < this.spinCost) {
                // Show insufficient funds message
                this.showMessage('Không đủ tiền!', '#ff4444');
            }
            return;
        }
        
        // Reset all symbols visibility before spinning
        this.reelSprites.forEach(reelData => {
            reelData.symbols.forEach((symbol, index) => {
                symbol.setVisible(true);
                symbol.setAlpha(index === 2 ? 1 : 0.3); // Center symbol bright, others dim
            });
        });
        
        // Update last spin time
        this.lastSpinTime = currentTime;
        
        // Deduct cost and spin count
        this.player.money -= this.spinCost;
        this.moneyText.setText(`$${this.player.money}`);
        this.remainingSpins--;
        this.remainingSpinsText.setText(`  Còn:\n ${this.remainingSpins} lượt`);
        
        this.isSpinning = true;
        this.resultText.setVisible(false);
        
        // Disable spin button during spinning
        this.spinButton.setFillStyle(0x95a5a6);
        this.spinButtonText.setText('QUAY...');
        this.spinButton.removeInteractive();
        
        // Add spinning visual feedback
        this.addSpinningEffects();
        
        // Make lights pulse faster during spin
        this.accelerateLights();
        
        // Play spin sound (SlotMachine audio or fallback)
        this.playSlotSound('SlotSpin', 0.7, 'GrabStart');
        
        // Start ticking sound for reel spinning
        this.startTickingSound();
        
        // Generate results
        this.spinResults = [
            this.getRandomSymbol(),
            this.getRandomSymbol(),
            this.getRandomSymbol()
        ];
        
        // Add pre-spin symbol preview effect
        this.addPreSpinEffect(() => {
            // Animate reels spinning
            this.spinReels();
        });
    }

    spinReels() {
        const spinDurations = [2000, 2500, 3000]; // Different timing for each reel
        let completedReels = 0;
        
        this.reelSprites.forEach((reelData, index) => {
            const { symbols } = reelData;
            let scrollSpeed = 15; // Initial high speed (pixels per update)
            let totalScrolled = 0;
            const targetDistance = spinDurations[index] * scrollSpeed / 16.67; // Approximate total distance
            
            // Make sure all symbols are visible and set proper alpha during spinning
            symbols.forEach((symbol, symbolIndex) => {
                symbol.setVisible(true);
                symbol.setAlpha(0.8); // All symbols visible during spin
            });
            
            // Create continuous scrolling animation (like real slot machine in image)
            const scrollTimer = this.time.addEvent({
                delay: 16, // ~60fps updates for smooth scrolling
                callback: () => {
                    // Move all symbols down (like conveyor belt)
                    symbols.forEach((symbol, symbolIndex) => {
                        symbol.y += scrollSpeed;
                        
                        // When symbol goes below visible area, wrap it to top and change symbol
                        if (symbol.y > reelData.y + 100) { // Below visible area
                            symbol.y -= 200; // Move to top (above visible area)
                            symbol.setText(this.getRandomSymbol().display);
                        }
                    });
                    
                    totalScrolled += scrollSpeed;
                    
                    // Calculate progress and slow down gradually (like real slot)
                    const progress = totalScrolled / targetDistance;
                    if (progress > 0.7) {
                        // Slow down in final 30%
                        const slowdownProgress = (progress - 0.7) / 0.3;
                        scrollSpeed = 15 * (1 - slowdownProgress) + 2; // 15 -> 2 pixels/frame
                    }
                    
                    // Stop when reached target
                    if (totalScrolled >= targetDistance) {
                        scrollTimer.remove();
                        
                        // Snap to final result
                        this.snapToFinalResult(reelData, index);
                        completedReels++;
                        
                        // When all reels are done
                        if (completedReels === 3) {
                            // Stop ticking sound
                            this.stopTickingSound();
                            
                            // Destroy spin glow effect
                            if (this.spinGlowEffect) {
                                this.spinGlowEffect.destroy();
                                this.spinGlowEffect = null;
                            }
                            
                            // Add suspense delay before checking win
                            this.addSuspenseEffect(() => {
                                this.checkWin();
                            });
                        }
                    }
                },
                repeat: -1
            });
        });
    }

    snapToFinalResult(reelData, reelIndex) {
        const { symbols } = reelData;
        const finalSymbol = this.spinResults[reelIndex].display;
        
        // Find the center symbol (closest to reel center Y)
        let centerSymbol = symbols[0];
        let minDistance = Math.abs(symbols[0].y - reelData.y);
        
        symbols.forEach(symbol => {
            const distance = Math.abs(symbol.y - reelData.y);
            if (distance < minDistance) {
                minDistance = distance;
                centerSymbol = symbol;
            }
        });
        
        // Set final symbol and animate to exact center
        centerSymbol.setText(finalSymbol);
        
        this.tweens.add({
            targets: centerSymbol,
            y: reelData.y, // Center of reel
            duration: 200,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Add stop effects using center symbol position
                this.addReelStopEffect(centerSymbol, reelIndex, reelIndex + 1);
                this.playSlotSound('ReelStop', 0.6, 'HookReset');
                
                // Hide ALL other symbols, only show center symbol
                symbols.forEach(symbol => {
                    if (symbol !== centerSymbol) {
                        symbol.setVisible(false); // Completely hide other symbols
                    } else {
                        symbol.setAlpha(1);
                        symbol.setVisible(true);
                    }
                });
            }
        });
    }

    checkWin() {
        this.isSpinning = false;
        
        // Re-enable spin button
        this.spinButton.setFillStyle(0x2ecc71);
        this.spinButtonText.setText('QUAY');
        this.spinButton.setInteractive({ useHandCursor: true });
        
        const results = this.spinResults;
        let winAmount = 0;
        let winMessage = '';
        let specialReward = null;
        
        // Check for matches
        if (results[0].value === results[1].value && results[1].value === results[2].value) {
            // Triple match
            switch (results[0].value) {
                case 'gold':
                    winAmount = 2500;
                    winMessage = '🎉 TRIPLE GOLD! 🎉\n+2500 Gold!';
                    break;
                case 'dynamite':
                    this.player.addDynamite(10);
                    winMessage = '💥 TRIPLE DYNAMITE! 💥\n+10 Thuốc nổ!';
                    break;
                case 'diamond':
                    winAmount = 5000;
                    specialReward = 'rare_item';
                    winMessage = '💎 TRIPLE DIAMOND! 💎\n+5000 Gold + Rare Item!';
                    break;
                case 'star':
                    winAmount = 3000;
                    this.giveAllBuffs();
                    winMessage = '🌟 JACKPOT! 🌟\n+3000 Gold + All Buffs!';
                    
                    // Play jackpot sound
                    this.playSlotSound('Jackpot', 0.8, 'MadeGoalMusic');
                    break;
                case 'clover':
                    winAmount = 2500;
                    this.player.hasLuckyClover = true;
                    winMessage = '🍀 TRIPLE CLOVER! 🍀\n+2500 Gold + Lucky Buff!';
                    break;
                case 'snowflake':
                    winAmount = 2000;
                    this.player.hasTimeFreezeItem = (this.player.hasTimeFreezeItem || 0) + 3; // Give 3 time freeze uses
                    winMessage = '❄️ TRIPLE SNOWFLAKE! ❄️\n+2000 Gold + 3 Time Freeze!';
                    break;
                case 'potion':
                    winAmount = 2500;
                    this.player.hasStrengthDrink = true;
                    this.player.strength = 3;
                    winMessage = '💊 TRIPLE POTION! 💊\n+2500 Gold + Strength!';
                    break;
            }
            
            // Play big win sound for triple matches
            this.playSlotSound('BigWin', 0.7, 'High');
            
        } else if (results[0].value === results[1].value || results[1].value === results[2].value || results[0].value === results[2].value) {
            // Double match
            const matchedSymbol = results[0].value === results[1].value ? results[0] : 
                                results[1].value === results[2].value ? results[1] : results[0];
            
            switch (matchedSymbol.value) {
                case 'gold':
                    winAmount = 1250;
                    winMessage = '💰 Double Gold!\n+1250 Gold!';
                    break;
                case 'dynamite':
                    this.player.addDynamite(5);
                    winMessage = '🧨 Double Dynamite!\n+5 Thuốc nổ!';
                    break;
                case 'diamond':
                    winAmount = 2500;
                    winMessage = '💎 Double Diamond!\n+2500 Gold!';
                    break;
                case 'star':
                    winAmount = 1500;
                    winMessage = '⭐ Double Star!\n+1500 Gold!';
                    break;
                case 'clover':
                    winAmount = 1250;
                    winMessage = '🍀 Double Clover!\n+1250 Gold!';
                    break;
                case 'snowflake':
                    winAmount = 1000;
                    this.player.hasTimeFreezeItem = (this.player.hasTimeFreezeItem || 0) + 1; // Give 1 time freeze use
                    winMessage = '❄️ Double Snowflake!\n+1000 Gold + Time Freeze!';
                    break;
                case 'potion':
                    winAmount = 1250;
                    winMessage = '💊 Double Potion!\n+1250 Gold!';
                    break;
            }
            
            // Play small win sound for double matches
            this.playSlotSound('SmallWin', 0.6, 'Normal');
            
        } 
        
        // Apply winnings
        if (winAmount > 0) {
            this.player.money += winAmount;
            this.moneyText.setText(`$${this.player.money}`);
            
            // Add coin rain effect for wins
            this.addCoinRainEffect(winAmount);
        }
        
        // Handle special rewards
        if (specialReward === 'rare_item') {
            // Give a random rare item
            const rareItems = ['hasGoldenHook' , 'hasLuckyStar'];
            const randomRare = rareItems[Math.floor(Math.random() * rareItems.length)];
            this.player[randomRare] = true;
            
            if (randomRare === 'hasGoldenHook') {
                this.player.goldenHookTimer = 30000; // 60 seconds
            } else if (randomRare === 'hasLuckyStar') {
                this.player.luckyStreakCount = 3;
            }
        }
        
        // Show floating result message above symbols
        if (winMessage) {
            this.showFloatingMessage(winMessage, winAmount);
        }
        
        // Add win celebration effects if big win
        if (winAmount >= 1000) {
            this.createWinEffects();
        }
        
        // Save progress
        this.player.saveProgress();
    }

    giveAllBuffs() {
        this.player.hasStrengthDrink = true;
        this.player.strength = 3.0;
        this.player.hasLuckyClover = true;
        this.player.hasRockCollectorsBook = true;
        this.player.hasGemPolish = true;
        this.player.hasGoldenHook = true;
        this.player.goldenHookTimer = 60000;
    }

    addSpinningEffects() {
        // Add spinning glow effect around machine
        const glow = this.add.circle(C.VIRTUAL_WIDTH / 2, 120, 100, 0xffd700, 0.1);
        
        this.tweens.add({
            targets: glow,
            alpha: 0.3,
            scale: 1.2,
            duration: 500,
            yoyo: true,
            repeat: -1,
            onComplete: () => glow.destroy()
        });
        
        // Store reference to destroy later
        this.spinGlowEffect = glow;
    }

    showMessage(text, color = '#ffffff') {
        const message = this.add.text(C.VIRTUAL_WIDTH / 2, 50, text, {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: color
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: message,
            alpha: 0,
            y: 30,
            duration: 2000,
            onComplete: () => message.destroy()
        });
    }

    createWinEffects() {
        // Destroy spin glow effect if it exists
        if (this.spinGlowEffect) {
            this.spinGlowEffect.destroy();
            this.spinGlowEffect = null;
        }
        
        // Create celebration particles
        for (let i = 0; i < 20; i++) {
            const particle = this.add.circle(
                C.VIRTUAL_WIDTH / 2 + Phaser.Math.Between(-50, 50),
                120 + Phaser.Math.Between(-30, 30),
                Phaser.Math.Between(3, 8),
                Phaser.Display.Color.HSVToRGB(Math.random(), 1, 1).color
            );
            
            this.tweens.add({
                targets: particle,
                x: particle.x + Phaser.Math.Between(-100, 100),
                y: particle.y + Phaser.Math.Between(-100, 100),
                alpha: 0,
                scale: 0,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
        
        // Screen flash effect
        const flash = this.add.rectangle(0, 0, C.VIRTUAL_WIDTH, C.VIRTUAL_HEIGHT, 0xffffff, 0.3).setOrigin(0);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            onComplete: () => flash.destroy()
        });
    }

    showFloatingMessage(message, winAmount) {
        // Determine color based on win amount
        let textColor = '#ffffff';
        if (winAmount >= 1000) textColor = '#ffd700'; // Gold for big wins
        else if (winAmount > 0) textColor = '#00ff00'; // Green for wins
        else textColor = '#ff6666'; // Red for no win
        
        // Create floating text above the slot machine symbols
        const floatingText = this.add.text(C.VIRTUAL_WIDTH / 2, 85, message, {
            fontFamily: 'Arial',
            fontSize: '18px',
            fill: textColor,
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);
        
        // Animation: Start from above symbols, float up and fade out
        this.tweens.add({
            targets: floatingText,
            y: floatingText.y - 40, // Move up 40 pixels
            alpha: { from: 1, to: 0 }, // Fade out
            scale: { from: 1, to: 1.2 }, // Scale up slightly
            duration: 2500, // 2.5 seconds
            ease: 'Power2.easeOut',
            onComplete: () => {
                floatingText.destroy(); // Clean up
            }
        });
        
        // Add a subtle glow effect for big wins
        if (winAmount >= 1000) {
            const glow = this.add.circle(C.VIRTUAL_WIDTH / 2, 85, 50, 0xffd700, 0.2);
            this.tweens.add({
                targets: glow,
                y: glow.y - 40,
                alpha: 0,
                scale: 1.5,
                duration: 2500,
                ease: 'Power2.easeOut',
                onComplete: () => glow.destroy()
            });
        }
    }

    exitSlotMachine() {
        // Continue to shop scene
        this.scene.start('ShopScene', { 
            player: this.player,
            currentLevel: this.player.level 
        });
    }

    showInfoPanel() {
        // Kiểm tra nếu đang trong quá trình đóng panel - CHẶN việc mở
        if (this.isClosingInfoPanel === 'in_progress') {
            console.log('Panel đang trong quá trình đóng, KHÔNG thể mở panel mới');
            return;
        }
        
        // Kiểm tra nếu panel đã tồn tại
        if (this.infoPanelExists && !this.panelCleanupComplete) {
            console.log('Panel đã tồn tại và chưa được cleanup, KHÔNG mở panel mới');
            return;
        }
        
        // Cancel any lingering cleanup timers from a previous close
        if (this.cleanupTimer) {
            this.cleanupTimer.remove();
            this.cleanupTimer = null;
            console.log('Đã hủy cleanup timer còn sót lại');
        }

        if (!this.scene || !this.scene.isActive()) {
            console.log('Scene không hoạt động, không thể mở panel');
            return;
        }
        
        // Force cleanup any existing panel trước khi tạo mới
        if (this.infoOverlay || this.infoPanel || this.infoCloseButton) {
            console.log('Phát hiện panel cũ vẫn còn, force cleanup trước khi tạo mới');
            this.forceCleanupInfoPanel();
        }
        
        // Throttling - chỉ cho phép đóng mở cách nhau ít nhất 500ms
        const currentTime = this.time.now;
        if (currentTime - this.lastPanelActionTime < 500) {
            console.log('Thao tác quá nhanh, vui lòng chờ 500ms giữa các lần đóng/mở');
            return;
        }
        this.lastPanelActionTime = currentTime;
        console.log('showInfoPanel() called, scene context check:');
        console.log('this exists:', !!this);
        console.log('this.sys exists:', !!this.sys);
        console.log('this.add exists:', !!this.add);
        
        // Reset closing flag and panel state
        this.isClosingInfoPanel = false;
        console.log('showInfoPanel() - Đang đặt infoPanelExists = true');
        this.infoPanelExists = true;
        this.panelCleanupComplete = false;
        console.log('showInfoPanel() - Trạng thái sau khi reset:');
        console.log('  - infoPanelExists:', this.infoPanelExists);
        console.log('  - isClosingInfoPanel:', this.isClosingInfoPanel);
        console.log('  - panelCleanupComplete:', this.panelCleanupComplete);
        
        this.debugPanelState();
        
        // Create semi-transparent overlay to dim the background
        this.infoOverlay = this.add.rectangle(0, 0, C.VIRTUAL_WIDTH, C.VIRTUAL_HEIGHT, 0x000000, 0.8).setOrigin(0);
        this.infoOverlay.setInteractive(); // Block clicks to background
        
        // Allow closing panel by tapping overlay on mobile
        const isMobileDevice = this.sys && this.sys.game && this.sys.game.device ? 
            this.sys.game.device.input.touch : 
            ('ontouchstart' in window || navigator.maxTouchPoints > 0); // Fallback detection
        console.log('Mobile device detected:', isMobileDevice);
        
        if (isMobileDevice) {
            this.infoOverlay.on('pointerup', (pointer) => {
                // KIỂM TRA ĐẦU TIÊN: Nếu đã cleanup hoàn toàn, KHÔNG làm gì cả
                if (this.panelCleanupComplete) {
                    console.log('panelCleanupComplete = true, BỎ QUA HOÀN TOÀN sự kiện overlay tap');
                    return;
                }
                
                // Đảm bảo scene vẫn còn hoạt động
                if (!this.scene || !this.scene.isActive()) {
                    console.log('Scene không còn hoạt động, bỏ qua sự kiện overlay tap');
                    return;
                }
                
                // Đảm bảo panel còn tồn tại
                if (!this.infoPanelExists) {
                    console.log('Panel không còn tồn tại, bỏ qua sự kiện overlay tap');
                    return;
                }
                
                // Kiểm tra panel có đang đóng không
                if (this.isClosingInfoPanel === 'in_progress') {
                    console.log('Panel đang đóng, bỏ qua sự kiện overlay tap');
                    return;
                }
                
                console.log('Overlay pointerup - pointer position:', pointer.x, pointer.y);
                
                // Only close if clicking outside the panel area
                const panelBounds = {
                    left: 10,
                    right: C.VIRTUAL_WIDTH - 10,
                    top: 15,
                    bottom: C.VIRTUAL_HEIGHT - 15
                };
                
                console.log('Panel bounds:', panelBounds);
                
                const isOutside = pointer.x < panelBounds.left || pointer.x > panelBounds.right ||
                    pointer.y < panelBounds.top || pointer.y > panelBounds.bottom;
                
                console.log('Click is outside panel:', isOutside);
                
                if (isOutside) {
                    if (this.infoOverlay && this.isClosingInfoPanel !== 'in_progress' && this.infoPanelExists) {
                        console.log('Closing panel via overlay tap');
                        this.hideInfoPanel();
                    } else if (this.isClosingInfoPanel === 'in_progress') {
                        console.log('Already closing panel, ignoring overlay tap');
                    } else if (!this.infoPanelExists) {
                        console.log('Panel không tồn tại, bỏ qua overlay tap');
                    } else {
                        console.log('Cannot close - overlay missing');
                    }
                }
            });
        }
        
        // Info panel background (larger size)
        const panelWidth = C.VIRTUAL_WIDTH - 20; // Almost full width
        const panelHeight = C.VIRTUAL_HEIGHT - 30; // Almost full height
        this.infoPanel = this.add.rectangle(C.VIRTUAL_WIDTH / 2, C.VIRTUAL_HEIGHT / 2, panelWidth, panelHeight, 0x1a1a2e);
        this.infoPanel.setStrokeStyle(4, 0xffd700);
        
        // Info panel title
        this.infoPanelTitle = this.add.text(C.VIRTUAL_WIDTH / 2, 35, '🎰 SLOT MACHINE INFO 🎰', {
            fontFamily: 'Arial',
            fontSize: '13px',
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Scrollable content area setup
        this.scrollOffset = 0;
        const contentAreaY = 55;
        const contentAreaHeight = panelHeight - 80; // Reserve space for title and close button
        
        // Symbol info content (better formatted and larger text)
        const infoContent = `TỶ LỆ QUAY & CÔNG DỤNG:

💰 VÀNG (35%) 
   3 ô: 2500$ | 2 ô: 1250$

🧨 THUỐC NỔ (30%) 
   3 ô: 10 TNT | 2 ô: 5 TNT

💎 KIM CƯƠNG (7%) 
   3 ô: 5000$ + Vật phẩm hiếm | 2 ô: 2500$

⭐ NGÔI SAO (5%) 
   3 ô: 3000$ + TẤT CẢ BUFFS! | 2 ô: 1500$

🍀 CỎ BỐN LÁ (6%) 
   3 ô: 2500$ + Buff may mắn | 2 ô: 1250$

❄️ BÔNG TUYẾT (9%) 
   3 ô: 2000$ + 3 Đóng băng thời gian | 2 ô: 1000$ + 1 Đóng băng thời gian

💊 THUỐC (8%) 
   3 ô: 2500$ + Sức mạnh x3.0 | 2 ô: 1250$

🎁 VẬT PHẨM HIẾM: Móc câu vàng, Ngôi sao may mắn  
✨ TẤT CẢ BUFFS: Sức mạnh, Cỏ may mắn, Sách đá, Đánh bóng ngọc

📝 HƯỚNG DẪN:
- Click hoặc vuốt để cuộn xem thông tin
- Mỗi lượt quay có 500$ và giới hạn 5 lượt
- Tỷ lệ hiển thị là % xuất hiện của symbol`;
        
        this.infoPanelContent = this.add.text(C.VIRTUAL_WIDTH / 2, contentAreaY + 20, infoContent, {
            fontFamily: 'Arial',
            fontSize: '15px',
            fill: '#ffff99',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            lineSpacing: 4,
            wordWrap: { width: panelWidth - 60 }
        }).setOrigin(0.5, 0);
        
        // Create mask for content clipping to hide overflow
        const maskX = 10;
        const maskY = contentAreaY;
        const maskWidth = panelWidth;
        const maskHeight = contentAreaHeight;
        
        this.contentMask = this.add.rectangle(maskX + maskWidth/2, maskY + (maskHeight + 25) /2, maskWidth, maskHeight + 25, 0xffffff);
        this.contentMask.setVisible(false); // Mask should be invisible
        
        // Apply mask to content
        this.infoPanelContent.setMask(this.contentMask.createGeometryMask());

        // Close button (X) - optimized for mobile touch
        const isMobile = this.sys && this.sys.game && this.sys.game.device ? 
            this.sys.game.device.input.touch : 
            ('ontouchstart' in window || navigator.maxTouchPoints > 0); // Fallback detection
        const buttonSize = isMobile ? 30 : 20; // Larger on mobile
        const fontSize = isMobile ? '18px' : '15px';
        
        this.infoCloseButton = this.add.rectangle(C.VIRTUAL_WIDTH - 22, 27, buttonSize, buttonSize, 0xe74c3c);
        this.infoCloseButton.setInteractive({ 
            useHandCursor: true,
            hitArea: new Phaser.Geom.Rectangle(-5, -5, buttonSize + 10, buttonSize + 10), // Larger hit area for mobile
            hitAreaCallback: Phaser.Geom.Rectangle.Contains
        });
        this.infoCloseButton.isCleanedUp = false; // Add the flag
        
        this.infoCloseButtonText = this.add.text(C.VIRTUAL_WIDTH - 22, 27, '✕', {
            fontFamily: 'Arial',
            fontSize: fontSize,
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Setup scrolling interaction
        this.setupScrolling(contentAreaHeight);
        
        // Close button events - Fix interaction flow by binding context
        const closeButton = this.infoCloseButton;
        const overlay = this.infoOverlay;

        const handlePointerDown = function() {
            console.log('Info close button pointerdown triggered');
            
            // KIỂM TRA ĐẦU TIÊN: Nếu đã cleanup hoàn toàn, KHÔNG làm gì cả
            if (this.panelCleanupComplete) {
                console.log('panelCleanupComplete = true, BỎ QUA HOÀN TOÀN sự kiện pointerdown');
                return;
            }
            
            console.log('Trạng thái khi pointerdown:');
            console.log('  - infoPanelExists:', this.infoPanelExists);
            console.log('  - isClosingInfoPanel:', this.isClosingInfoPanel);
            console.log('  - panelCleanupComplete:', this.panelCleanupComplete);
            console.log('  - Elements still exist:');
            console.log('    - this.infoOverlay:', !!this.infoOverlay);
            console.log('    - this.infoPanel:', !!this.infoPanel);
            console.log('    - this.infoCloseButton:', !!this.infoCloseButton);
            
            // Các kiểm tra cần thiết
            if (!this.scene || !this.scene.isActive()) {
                console.log('Scene không còn hoạt động, bỏ qua sự kiện pointerdown');
                return;
            }
            
            if (!this.infoPanelExists) {
                console.log('Panel không còn tồn tại, bỏ qua sự kiện pointerdown');
                console.log('Nhưng các elements vẫn còn! Gọi forceCleanupInfoPanel()');
                this.forceCleanupInfoPanel();
                return;
            }
            
            if (this.isClosingInfoPanel === 'in_progress') {
                console.log('Panel đang đóng, bỏ qua sự kiện pointerdown');
                return;
            }
            
            console.log('Đặt buttonPressed = true');
            this.buttonPressed = true;
        };

        const handlePointerUp = function(button, ov) {
            console.log('Info close button pointerup triggered');
            
            // KIỂM TRA ĐẦU TIÊN: Nếu đã cleanup hoàn toàn, KHÔNG làm gì cả
            if (this.panelCleanupComplete) {
                console.log('panelCleanupComplete = true, BỎ QUA HOÀN TOÀN sự kiện pointerup');
                return;
            }
            
            console.log('Trạng thái khi pointerup:');
            console.log('  - infoPanelExists:', this.infoPanelExists);
            console.log('  - isClosingInfoPanel:', this.isClosingInfoPanel);
            console.log('  - buttonPressed:', this.buttonPressed);
            console.log('  - button.isCleanedUp:', button ? button.isCleanedUp : 'button is null');
            
            // Đảm bảo scene vẫn còn hoạt động
            if (!this.scene || !this.scene.isActive()) {
                console.log('Scene không còn hoạt động, bỏ qua sự kiện');
                return;
            }
            
            // Kiểm tra nút đã bị dọn dẹp chưa
            if (button && button.isCleanedUp) {
                console.log('Button đã bị dọn dẹp, bỏ qua sự kiện');
                return;
            }
            
            // Kiểm tra panel còn tồn tại không hoặc đang đóng
            if (!this.infoPanelExists) {
                console.log('Panel không còn tồn tại, bỏ qua sự kiện');
                console.log('Elements vẫn còn:');
                console.log('  - this.infoOverlay:', !!this.infoOverlay);
                console.log('  - this.infoPanel:', !!this.infoPanel);
                console.log('  - this.infoCloseButton:', !!this.infoCloseButton);
                console.log('Gọi forceCleanupInfoPanel()');
                this.forceCleanupInfoPanel();
                return;
            }
            
            // Kiểm tra panel có đang đóng không
            if (this.isClosingInfoPanel === 'in_progress') {
                console.log('Panel đang đóng, bỏ qua sự kiện');
                return;
            }
            
            console.log('Info close button pointerup triggered');
            console.log('Button was pressed:', this.buttonPressed);
            console.log('Panel closing in progress:', this.isClosingInfoPanel);
            console.log('Panel exists:', this.infoPanelExists);

            if (this.buttonPressed && ov && !this.isClosingInfoPanel && this.infoPanelExists) {
                console.log('Calling hideInfoPanel()');
                this.hideInfoPanel();
                this.buttonPressed = false;
            } else {
                console.log('Cannot close - conditions not met');
            }
        };

        // Lưu trữ các handler để dễ dàng xóa sau này
        this.closeButtonHandlers = {
            pointerdown: handlePointerDown,
            pointerup: handlePointerUp.bind(this, closeButton, overlay)
        };
        
        closeButton.on('pointerdown', this.closeButtonHandlers.pointerdown, this);
        closeButton.on('pointerup', this.closeButtonHandlers.pointerup);
        
        // Lưu handler cho mobile tap event
        this.closeButtonHandlers.tap = () => {
            // KIỂM TRA ĐẦU TIÊN: Nếu đã cleanup hoàn toàn, KHÔNG làm gì cả
            if (this.panelCleanupComplete) {
                console.log('panelCleanupComplete = true, BỎ QUA HOÀN TOÀN sự kiện tap');
                return;
            }
            
            // Kiểm tra scene và button tồn tại
            if (!this.scene || !this.scene.isActive()) {
                console.log('Scene không còn hoạt động, bỏ qua sự kiện tap');
                return;
            }
            
            // Kiểm tra button đã bị dọn dẹp chưa
            if (this.infoCloseButton && this.infoCloseButton.isCleanedUp) {
                console.log('Button đã bị dọn dẹp, bỏ qua sự kiện tap');
                return;
            }
            
            // Kiểm tra panel còn tồn tại không
            if (!this.infoPanelExists) {
                console.log('Panel không còn tồn tại, bỏ qua sự kiện tap');
                return;
            }
            
            // Kiểm tra panel có đang đóng không
            if (this.isClosingInfoPanel === 'in_progress') {
                console.log('Panel đang đóng, bỏ qua sự kiện tap');
                return;
            }
            
            console.log('Info close button pointertap triggered (mobile fallback)');
            if (this.infoOverlay && this.isClosingInfoPanel !== 'in_progress' && this.infoPanelExists) {
                console.log('Calling hideInfoPanel() from tap');
                this.hideInfoPanel();
            }
        };
        
        // Đăng ký mobile tap event
        this.infoCloseButton.on('pointertap', this.closeButtonHandlers.tap);
        
        // Lưu handlers cho hover effects
        this.closeButtonHandlers.over = () => {
            if (this.panelCleanupComplete) return; // Bỏ qua nếu đã cleanup hoàn toàn
            if (!this.infoPanelExists || this.isClosingInfoPanel === 'in_progress') return;
            if (this.infoCloseButton && this.infoCloseButton.active && !this.infoCloseButton.isCleanedUp) {
                this.infoCloseButton.setFillStyle(0xec7063);
                this.infoCloseButton.setScale(1.1);
            }
        };
        
        this.closeButtonHandlers.out = () => {
            if (this.panelCleanupComplete) return; // Bỏ qua nếu đã cleanup hoàn toàn
            if (!this.infoPanelExists || this.isClosingInfoPanel === 'in_progress') return;
            if (this.infoCloseButton && this.infoCloseButton.active && !this.infoCloseButton.isCleanedUp) {
                this.infoCloseButton.setFillStyle(0xe74c3c);
                this.infoCloseButton.setScale(1.0);
            }
        };
        
        // Đăng ký hover effects
        this.infoCloseButton.on('pointerover', this.closeButtonHandlers.over);
        this.infoCloseButton.on('pointerout', this.closeButtonHandlers.out);
        
        // Visual feedback for mobile tap - kết hợp với các handlers chính
        this.closeButtonHandlers.visualDown = () => {
            if (this.panelCleanupComplete) return; // Bỏ qua nếu đã cleanup hoàn toàn
            if (!this.infoPanelExists || this.isClosingInfoPanel === 'in_progress') return;
            if (this.infoCloseButton && this.infoCloseButton.active && !this.infoCloseButton.isCleanedUp) {
                this.infoCloseButton.setFillStyle(0xd63031);
                this.infoCloseButton.setScale(0.95);
            }
        };
        
        this.closeButtonHandlers.visualUp = () => {
            if (this.panelCleanupComplete) return; // Bỏ qua nếu đã cleanup hoàn toàn
            if (!this.infoPanelExists || this.isClosingInfoPanel === 'in_progress') return;
            if (this.infoCloseButton && this.infoCloseButton.active && !this.infoCloseButton.isCleanedUp) {
                this.infoCloseButton.setFillStyle(0xe74c3c);
                this.infoCloseButton.setScale(1.0);
            }
        };
        
        // Bổ sung visual handlers vào các sự kiện đã tồn tại
        closeButton.on('pointerdown', this.closeButtonHandlers.visualDown);
        closeButton.on('pointerup', this.closeButtonHandlers.visualUp);
        
        // Animation: Fade in and scale up
        [this.infoOverlay, this.infoPanel, this.infoPanelTitle, this.infoPanelContent, this.infoCloseButton, this.infoCloseButtonText].forEach(element => {
            if (element) {
                element.setAlpha(0);
                this.tweens.add({
                    targets: element,
                    alpha: element === this.infoOverlay ? 0.8 : 1,
                    scale: element === this.infoPanel ? { from: 0.8, to: 1 } : 1,
                    duration: 300,
                    ease: 'Power2.easeOut'
                });
            }
        });
    }
    
    setupScrolling(contentAreaHeight) {
        const maxScroll = Math.max(0, this.infoPanelContent.height - contentAreaHeight + 40);
        
        // Store references to event handlers for cleanup
        this.infoScrollHandlers = {
            wheel: null,
            pointerdown: null,
            pointermove: null,
            pointerup: null,
            keydownUp: null,
            keydownDown: null
        };
        
        // Mouse wheel scrolling
        this.infoScrollHandlers.wheel = (pointer, gameObjects, deltaX, deltaY) => {
            if (this.infoOverlay && this.infoOverlay.visible) {
                this.scrollContent(deltaY > 0 ? 20 : -20, maxScroll);
            }
        };
        this.input.on('wheel', this.infoScrollHandlers.wheel);
        
        // Touch/drag scrolling
        let isDragging = false;
        let lastPointerY = 0;
        
        this.infoScrollHandlers.pointerdown = (pointer) => {
            if (pointer.x > 10 && pointer.x < C.VIRTUAL_WIDTH - 10 && 
                pointer.y > 55 && pointer.y < C.VIRTUAL_HEIGHT - 35) {
                isDragging = true;
                lastPointerY = pointer.y;
            }
        };
        this.infoOverlay.on('pointerdown', this.infoScrollHandlers.pointerdown);
        
        this.infoScrollHandlers.pointermove = (pointer) => {
            if (isDragging && this.infoOverlay && this.infoOverlay.visible) {
                const deltaY = lastPointerY - pointer.y;
                this.scrollContent(deltaY, maxScroll);
                lastPointerY = pointer.y;
            }
        };
        this.input.on('pointermove', this.infoScrollHandlers.pointermove);
        
        this.infoScrollHandlers.pointerup = () => {
            isDragging = false;
        };
        this.input.on('pointerup', this.infoScrollHandlers.pointerup);
        
        // Keyboard scrolling
        this.infoScrollHandlers.keydownUp = () => {
            if (this.infoOverlay && this.infoOverlay.visible) {
                this.scrollContent(-30, maxScroll);
            }
        };
        this.input.keyboard.on('keydown-UP', this.infoScrollHandlers.keydownUp);
        
        this.infoScrollHandlers.keydownDown = () => {
            if (this.infoOverlay && this.infoOverlay.visible) {
                this.scrollContent(30, maxScroll);
            }
        };
        this.input.keyboard.on('keydown-DOWN', this.infoScrollHandlers.keydownDown);
    }
    
    scrollContent(deltaY, maxScroll) {
        this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + deltaY, 0, maxScroll);
        
        // Update content position
        if (this.infoPanelContent) {
            this.infoPanelContent.y = 75 - this.scrollOffset;
        }
    }
    
    hideInfoPanel() {
        // Kiểm tra tình trạng scene
        if (!this.scene || !this.scene.isActive()) {
            console.log('Scene không hoạt động, bỏ qua hideInfoPanel');
            return;
        }
        
        // Kiểm tra nếu panel không tồn tại
        if (!this.infoPanelExists) {
            console.log('Panel đã không tồn tại, bỏ qua việc đóng');
            return;
        }
        
        // Throttling - chỉ cho phép đóng mở cách nhau ít nhất 500ms
        const currentTime = this.time.now;
        if (currentTime - this.lastPanelActionTime < 500) {
            console.log('Thao tác đóng quá nhanh, vui lòng chờ 500ms');
            return;
        }
        this.lastPanelActionTime = currentTime;
        
        console.log('hideInfoPanel() called');
        console.log('Trạng thái hiện tại:');
        console.log('  - infoPanelExists:', this.infoPanelExists);
        console.log('  - isClosingInfoPanel:', this.isClosingInfoPanel);
        console.log('  - panelCleanupComplete:', this.panelCleanupComplete);
        console.log('Elements exist - Overlay:', !!this.infoOverlay, 'Panel:', !!this.infoPanel, 'Button:', !!this.infoCloseButton);
        
        // Prevent multiple calls
        if (this.isClosingInfoPanel === 'in_progress') {
            console.log('Panel đang đóng, bỏ qua lệnh gọi');
            return;
        }
        
        // Đánh dấu panel đang trong quá trình đóng
        this.isClosingInfoPanel = 'in_progress';
        console.log('Đã đặt isClosingInfoPanel = in_progress');
        console.log('infoPanelExists vẫn là:', this.infoPanelExists);
        
        // Đánh dấu nút đóng đã được dọn dẹp
        if (this.infoCloseButton) {
            this.infoCloseButton.isCleanedUp = true;
            console.log('Đã đặt infoCloseButton.isCleanedUp = true');
        }
        
        // Reset button pressed state để tránh xung đột
        this.buttonPressed = false;
        
        console.log('Bắt đầu đóng panel với animation - KHÔNG xóa event listeners ngay lập tức');
        
        // KHÔNG xóa event listeners ngay - để animation hoạt động
        // Event listeners sẽ được xóa trong finalizeInfoPanelCleanup()
        
        console.log('Đặt cờ đóng panel thành in_progress và xóa các event listener');
        
        // Animation: Fade out and scale down
        console.log('Bắt đầu animation đóng panel');
        
        const elements = [this.infoOverlay, this.infoPanel, this.infoPanelTitle, this.infoPanelContent, this.infoCloseButton, this.infoCloseButtonText, this.contentMask];
        
        let completedAnimations = 0;
        const totalAnimations = elements.filter(element => element).length;
        console.log('Bắt đầu animations cho', totalAnimations, 'elements');
        
        elements.forEach(element => {
            if (element) {
                this.tweens.add({
                    targets: element,
                    alpha: 0,
                    scale: element === this.infoPanel ? 0.8 : 1,
                    duration: 200,
                    ease: 'Power2.easeIn',
                    onComplete: () => {
                        console.log('Animation completed for element');
                        
                        // Check if scene still exists before proceeding
                        if (!this.scene || !this.scene.isActive()) {
                            console.log('Scene no longer active, skipping cleanup');
                            return;
                        }
                        
                        try {
                            if (element && element.scene && element.active !== false) {
                                element.destroy();
                            }
                        } catch (error) {
                            console.warn('Error destroying element:', error);
                        }
                        
                        completedAnimations++;
                        console.log('Completed animations:', completedAnimations, '/', totalAnimations);
                        
                        // Ensure cleanup after all animations complete
                        if (completedAnimations === totalAnimations) {
                            console.log('All animations completed, calling finalizeInfoPanelCleanup');
                            // Cancel the fallback timer as animations completed successfully
                            if (this.cleanupTimer) {
                                this.cleanupTimer.remove();
                                this.cleanupTimer = null;
                            }
                            try {
                                // Đặt lại lastPanelActionTime để cho phép mở panel mới
                                this.lastPanelActionTime = this.time.now;
                                this.finalizeInfoPanelCleanup();
                            } catch (error) {
                                console.warn('Error in final cleanup:', error);
                                // Force cleanup even if there's an error
                                this.forceCleanupInfoPanel();
                            }
                        }
                    }
                });
            }
        });
        
        // Cancel any existing timer before setting a new one
        if (this.cleanupTimer) {
            this.cleanupTimer.remove();
        }
        
        // Fallback cleanup in case animations don't complete
        this.cleanupTimer = this.time.delayedCall(300, () => {
            console.log('Fallback cleanup triggered after 300ms');
            this.cleanupTimer = null; // Clear self reference
            
            // Check if scene still exists
            if (!this.scene || !this.scene.isActive()) {
                console.log('Scene no longer active, skipping fallback cleanup');
                return;
            }
            
            try {
                this.finalizeInfoPanelCleanup();
            } catch (error) {
                console.warn('Error in fallback cleanup:', error);
                // Force cleanup even if there's an error
                this.forceCleanupInfoPanel();
            }
        });
    }
    
    finalizeInfoPanelCleanup() {
        console.log('finalizeInfoPanelCleanup() called');
        
        // Check if scene still active
        if (!this.scene || !this.scene.isActive()) {
            console.log('Scene no longer active, skipping finalize cleanup');
            return;
        }

        // 1. Remove all input event listeners related to info panel
        if (this.input && this.infoScrollHandlers) {
            console.log('Cleaning up scroll handlers');
            try {
                if (this.infoScrollHandlers.wheel) {
                    this.input.off('wheel', this.infoScrollHandlers.wheel);
                }
                if (this.infoScrollHandlers.pointermove) {
                    this.input.off('pointermove', this.infoScrollHandlers.pointermove);
                }
                if (this.infoScrollHandlers.pointerup) {
                    this.input.off('pointerup', this.infoScrollHandlers.pointerup);
                }
                
                if (this.input.keyboard) {
                    if (this.infoScrollHandlers.keydownUp) {
                        this.input.keyboard.off('keydown-UP', this.infoScrollHandlers.keydownUp);
                    }
                    if (this.infoScrollHandlers.keydownDown) {
                        this.input.keyboard.off('keydown-DOWN', this.infoScrollHandlers.keydownDown);
                    }
                }
            } catch (error) {
                console.warn('Error cleaning up scroll handlers:', error);
            }
        }

        // 1.5. Remove close button event listeners
        if (this.infoCloseButton) {
            try {
                this.infoCloseButton.removeAllListeners();
                console.log('Đã xóa tất cả event listeners của nút đóng');
            } catch (error) {
                console.warn('Error cleaning up close button listeners:', error);
            }
        }

        // 1.6. Remove overlay event listeners  
        if (this.infoOverlay) {
            try {
                this.infoOverlay.removeAllListeners();
                console.log('Đã xóa tất cả event listeners của overlay');
            } catch (error) {
                console.warn('Error cleaning up overlay listeners:', error);
            }
        }
        
        // 1.7. Clear stored handlers
        this.closeButtonHandlers = null;

        // 2. Destroy all game objects
        const elementsToDestroy = [
            this.infoOverlay, this.infoPanel, this.infoPanelTitle, 
            this.infoPanelContent, this.infoCloseButton, this.infoCloseButtonText, 
            this.contentMask
        ];

        elementsToDestroy.forEach(element => {
            if (element && element.scene) {
                try {
                    element.destroy();
                } catch (e) {
                    console.warn('Error destroying element during final cleanup', e);
                }
            }
        });

        // 3. Nullify all references
        this.infoOverlay = null;
        this.infoPanel = null;
        this.infoPanelTitle = null;
        this.infoPanelContent = null;
        this.infoCloseButton = null;
        this.infoCloseButtonText = null;
        this.contentMask = null;
        this.infoScrollHandlers = null;
        
        // 4. Reset flags and state
        console.log('finalizeInfoPanelCleanup: Bắt đầu reset flags');
        this.scrollOffset = 0;
        this.isClosingInfoPanel = false; // Reset closing flag
        console.log('finalizeInfoPanelCleanup: Đặt isClosingInfoPanel = false');
        this.infoPanelExists = false; // Chỉ đặt false khi thật sự hoàn tất cleanup
        console.log('finalizeInfoPanelCleanup: Đặt infoPanelExists = false');
        this.panelCleanupComplete = true; // Chỉ đặt cờ này khi cleanup thật sự hoàn tất
        console.log('finalizeInfoPanelCleanup: Đặt panelCleanupComplete = true');
        this.lastPanelActionTime = this.time.now; // Reset để cho phép mở panel mới
        console.log('finalizeInfoPanelCleanup: Reset lastPanelActionTime to', this.lastPanelActionTime);
        
        console.log('All references cleared and objects destroyed');
        
        // 5. Re-enable main game input
        if (this.input) {
            this.input.enabled = true;
            console.log('Main game input re-enabled');
        }
        
        console.log('Info panel cleanup completed successfully');
    }

    // Helper method to play sounds with fallbacks
    playSlotSound(soundKey, volume = 0.6, fallbackKey = null) {
        try {
            // Try main sound first
            if (this.cache.audio.exists(soundKey) && this.sound.get(soundKey)) {
                this.sound.play(soundKey, { volume: volume });
                return true;
            }
            
            // Try fallback sound
            if (fallbackKey && this.cache.audio.exists(fallbackKey) && this.sound.get(fallbackKey)) {
                this.sound.play(fallbackKey, { volume: volume });
                return true;
            }
        } catch (error) {
            // Try fallback on error
            if (fallbackKey) {
                try {
                    this.sound.play(fallbackKey, { volume: volume });
                    return true;
                } catch (fallbackError) {
                    console.error(`All audio failed for: ${soundKey}`, fallbackError);
                }
            }
        }
        return false;
    }

    // Cleanup
    destroy() {
        // Remove any active tweens
        this.tweens.killAll();
        
        // Stop ticking sound if active
        this.stopTickingSound();
        
        // Clean up coin rain timer
        if (this.coinRainTimer) {
            this.coinRainTimer.remove();
            this.coinRainTimer = null;
        }
        
        // Clean up light effects
        this.lightEffects.forEach(light => {
            if (light && light.scene) {
                light.destroy();
            }
        });
        this.lightEffects = [];
        
        // Clean up info panel if open
        if (this.infoOverlay) {
            this.hideInfoPanel();
        }
    }
    
    shutdown() {
        console.log('SlotMachineScene shutdown called');
        
        // Stop all tweens to prevent callbacks after scene destroy
        if (this.tweens) {
            this.tweens.killAll();
        }
        
        // Clear all timers
        if (this.time) {
            this.time.removeAllEvents();
        }
        
        // Force cleanup info panel
        this.forceCleanupInfoPanel();
        
        // Clear all custom references
        this.player = null;
        this.currentLevel = null;
        this.spinsRemaining = null;
        this.lightEffects = [];
        this.spinGlowEffect = null;
        this.isClosingInfoPanel = false;
        
        console.log('SlotMachineScene shutdown completed');
    }
    
    forceCleanupInfoPanel() {
        console.log('Force cleanup info panel - BẮT ĐẦU');
        
        // Reset trạng thái ngay lập tức
        this.isClosingInfoPanel = false;
        console.log('forceCleanup: Đặt isClosingInfoPanel = false');
        this.infoPanelExists = false;
        console.log('forceCleanup: Đặt infoPanelExists = false');
        this.buttonPressed = false;
        this.panelCleanupComplete = true;
        this.lastPanelActionTime = this.time.now; // Reset timer khi force cleanup
        
        console.log('forceCleanup: Reset lastPanelActionTime to', this.lastPanelActionTime);
        
        // Dừng tất cả tweens liên quan đến info panel
        if (this.tweens) {
            this.tweens.killAll();
            console.log('forceCleanup: Đã dừng tất cả tweens');
        }
        
        // Xóa cleanup timer nếu có
        if (this.cleanupTimer) {
            this.cleanupTimer.remove();
            this.cleanupTimer = null;
            console.log('forceCleanup: Đã xóa cleanup timer');
        }
        
        // Immediately destroy all info panel elements without animation
        const elements = [
            'infoOverlay', 'infoPanel', 'infoPanelTitle', 
            'infoPanelContent', 'infoCloseButton', 'infoCloseButtonText', 'contentMask'
        ];
        
        let destroyedCount = 0;
        elements.forEach(elemName => {
            if (this[elemName]) {
                console.log(`forceCleanup: Destroying ${elemName}`);
                try {
                    // Xóa tất cả listeners trước khi destroy
                    if (this[elemName].removeAllListeners) {
                        this[elemName].removeAllListeners();
                        console.log(`forceCleanup: Đã xóa listeners của ${elemName}`);
                    }
                    
                    // Sau đó destroy đối tượng
                    if (this[elemName].destroy) {
                        this[elemName].destroy();
                        console.log(`forceCleanup: Đã destroy ${elemName}`);
                        destroyedCount++;
                    }
                } catch (error) {
                    console.warn(`Error destroying ${elemName}:`, error);
                }
                
                // Đặt null cho tham chiếu
                this[elemName] = null;
            }
        });
        
        console.log(`forceCleanup: Đã destroy ${destroyedCount} elements`);
        
        // Clear các handlers và trạng thái
        this.infoScrollHandlers = null;
        this.closeButtonHandlers = null;
        
        // Re-enable main game input
        if (this.input) {
            this.input.enabled = true;
            console.log('forceCleanup: Đã re-enable main game input');
        }
        
        console.log('Force cleanup completed - all elements destroyed and references cleared');
    }
    
    // Helper method để debug panel state
    debugPanelState() {
        console.log('=== PANEL STATE DEBUG ===');
        console.log('infoPanelExists:', this.infoPanelExists);
        console.log('isClosingInfoPanel:', this.isClosingInfoPanel);
        console.log('panelCleanupComplete:', this.panelCleanupComplete);
        console.log('Elements exist:');
        console.log('  - infoOverlay:', !!this.infoOverlay);
        console.log('  - infoPanel:', !!this.infoPanel);
        console.log('  - infoCloseButton:', !!this.infoCloseButton);
        console.log('  - infoPanelTitle:', !!this.infoPanelTitle);
        console.log('  - infoPanelContent:', !!this.infoPanelContent);
        console.log('========================');
    }
}
