import Player from '../entities/Player.js';

export default class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
        this.selectedIndex = 0;
        this.shopItems = [];
        this.itemContainers = [];
        this.tooltipText = null;
        this.purchasedCount = {}; // ✅ Track số lượng đã mua mỗi item
    }

    init(data) {
        // Nhận player data từ scene trước
        this.player = data?.player;
        
        // ✅ Fallback: tạo player mới nếu không có
        if (!this.player) {
            console.warn('ShopScene: No player data received, creating new player');
            this.player = new Player();
        }
        
        this.currentLevel = data?.currentLevel || 1;
    }

    create() {
        // ✅ Resume audio context
        if (window.audioManager) {
            window.audioManager.forceResumeAudio();
        }

        // ✅ Reset số lượng đã mua mỗi khi vào shop
        this.purchasedCount = {};

        // Background
        this.add.image(0, 0, 'Shop').setOrigin(0);
        
        // Shop table - để đặt các vật phẩm lên
        this.add.image(160, 195, 'Table').setOrigin(0.5, 0.5);
        
        // Shopkeeper sprite - positioned like in the image
        const shopkeeper = this.add.sprite(290, 175, 'shopkeeperSheet').setOrigin(0.5, 1);
        
        // Tạo animation cho shopkeeper nếu chưa có
        if (!this.anims.exists('shopkeeper-idle')) {
            this.anims.create({
                key: 'shopkeeper-idle',
                frames: this.anims.generateFrameNumbers('shopkeeperSheet', { start: 0, end: 1 }),
                frameRate: 2,
                repeat: -1
            });
        }
        shopkeeper.play('shopkeeper-idle');

        // ✅ Dialogue bubble với text bằng tiếng Việt
        const bubble = this.add.image(170, 100, 'DialogueBubble').setOrigin(0.5);
        const bubbleText = this.add.text(170, 95, 'Nhấp vào vật phẩm để mua.\nNhấp "Qua Màn" khi sẵn sàng.', {
            fontFamily: 'Kurland',
            fontSize: '12px',
            fill: '#000000',
            align: 'center',
            wordWrap: { width: 160 }
        }).setOrigin(0.5);

        // Hiển thị tiền của player - position ở góc trái
        this.moneyText = this.add.text(20, 20, `$${this.player.money}`, {
            fontFamily: 'Kurland',
            fontSize: '24px',
            fill: '#ffda21'
        });
        // Tạo tooltip text (ẩn ban đầu)
        this.tooltipText = this.add.text(200, 40, '', {
            fontFamily: 'Kurland',
            fontSize: '14px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 6 },
            align: 'center',
            wordWrap: { width: 180 }
        }).setOrigin(0.5).setVisible(false);
        
        // Thêm border cho tooltip để dễ nhìn hơn trên mobile
        this.tooltipBorder = this.add.rectangle(200, 40, 200, 40, 0x333333, 0.8)
            .setStrokeStyle(2, 0xffffff)
            .setVisible(false);

        // Tạo danh sách items trong shop
        this.setupShopItems();
        this.createHorizontalShopUI();
        this.setupControls();
        
        // Global touch handler để đóng tooltip khi touch ra ngoài
        this.input.on('pointerdown', (pointer, targets) => {
            // Nếu touch ra ngoài item nào thì đóng tooltip
            if (targets.length === 0 && this.tooltipText && this.tooltipText.visible) {
                this.hideTooltip();
            }
        });
    }

    setupShopItems() {
        // ✅ Tính toán hệ số giá dựa trên level và thu nhập dự kiến
        const levelPriceMultiplier = this.calculatePriceMultiplier();
        
        // Danh sách tất cả vật phẩm có thể có trong shop
        const allItems = [
            {
                name: 'Thuốc nổ',
                description: 'Phá hủy đá bằng thuốc nổ',
                price: this.calculateItemPrice(80, 50, levelPriceMultiplier, 'utility'), // Base 80, variation 50
                image: 'Dynamite',
                effect: () => {
                    this.player.addDynamite(1);
                }
            },
            {
                name: 'Thêm may mắn',
                description: 'Tăng cơ hội tìm được vật phẩm quý (x2.5)',
                price: this.calculateItemPrice(60, 40, levelPriceMultiplier, 'bonus'), // Base 60, variation 40
                image: 'LuckyClover', 
                effect: () => {
                    this.player.hasLuckyClover = true;
                }
            },
            {
                name: 'Nhân Đôi Giá Trị Của Đá',
                description: 'Đá cho nhiều tiền hơn (x4)',
                price: this.calculateItemPrice(120, 60, levelPriceMultiplier, 'premium'), // Base 120, variation 60
                image: 'RockCollectorsBook',
                effect: () => {
                    this.player.hasRockCollectorsBook = true;
                }
            },
            {
                name: 'Nước Tăng Lực',
                description: 'Tăng tốc độ kéo móc câu',
                price: this.calculateItemPrice(150, 70, levelPriceMultiplier, 'premium'), // Base 150, variation 70
                image: 'StrengthDrink',
                effect: () => {
                    this.player.hasStrengthDrink = true;
                    this.player.strength = 2.7;
                }
            },
            {
                name: 'Đá quý giá trị cao hơn',
                description: 'Đá quý có giá trị cao hơn (x1.5)',
                price: this.calculateItemPrice(100, 50, levelPriceMultiplier, 'bonus'), // Base 100, variation 50
                image: 'GemPolish',
                effect: () => {
                    this.player.hasGemPolish = true;
                }
            },
            {
                name: 'Túi bí ẩn',
                description: 'Túi bí ẩn với hiệu ứng ngẫu nhiên',
                price: this.calculateItemPrice(30, 20, levelPriceMultiplier, 'cheap'), // Base 30, variation 20
                image: 'QuestionBag',
                effect: () => {
                    // Random effect when bought
                    const effects = [
                        () => this.player.addDynamite(1),
                        () => this.player.money += Math.floor(50 * levelPriceMultiplier),
                        () => this.player.hasLuckyClover = true
                    ];
                    const randomEffect = effects[Math.floor(Math.random() * effects.length)];
                    randomEffect();
                }
            }
        ];

        // Random chọn 4-5 items cho shop này
        const numItems = 3 + Math.floor(Math.random() * 2); // 4 hoặc 5 items
        this.shopItems = this.shuffleArray([...allItems]).slice(0, numItems);
    }

    // ✅ Tính hệ số giá dựa trên level, tiền tích lũy và khả năng chi tiêu
    calculatePriceMultiplier() {
        const level = this.currentLevel;
        const currentMoney = this.player.money;
        
        // Thu nhập tích lũy dự kiến đến level hiện tại
        let totalExpectedMoney = 0;
        for (let i = 1; i <= level; i++) {
            totalExpectedMoney += this.getLevelIncome(i);
        }
        
        // Tỷ lệ tiền hiện tại so với tổng thu nhập dự kiến
        const moneyRatio = Math.min(2.0, currentMoney / (totalExpectedMoney * 0.5)); // Cap at 2.0
        
        // Hệ số cơ bản theo level
        let baseLevelMultiplier = 1.0;
        if (level <= 3) {
            baseLevelMultiplier = 0.65; // Level đầu, giá rẻ hơn
        } else if (level <= 6) {
            baseLevelMultiplier = 0.85; // Level trung, giá chuẩn
        } else if (level <= 9) {
            baseLevelMultiplier = 1.2; // Level cao, giá đắt hơn
        } else {
            baseLevelMultiplier = 1.4; // Level cuối, giá rất đắt
        }
        
        // Điều chỉnh dựa trên tiền tích lũy
        // Nếu người chơi giàu (moneyRatio > 1) thì giá tăng
        // Nếu người chơi nghèo (moneyRatio < 1) thì giá giảm
        const wealthMultiplier = 0.5 + (moneyRatio * 1.5); // Range: 0.5 - 2.0

        return baseLevelMultiplier * wealthMultiplier;
    }

    // ✅ Thu nhập dự kiến của từng level riêng lẻ
    getLevelIncome(level) {
        if (level <= 3) {
            return 500 + (level - 1) * 100; // 500, 600, 700
        } else if (level <= 6) {
            return 700 + (level - 4) * 100; // 700, 800, 900
        } else if (level <= 9) {
            return 1000 + (level - 7) * 133; // 1000, 1133, 1266
        } else {
            return Math.min(1800, 1400 + (level - 10) * 80); // 1400+ cap at 1800
        }
    }

    // ✅ Tính giá vật phẩm dựa trên loại và level
    calculateItemPrice(basePrice, variation, levelMultiplier, itemType) {
        // Hệ số theo loại vật phẩm
        let typeMultiplier = 1.0;
        switch (itemType) {
            case 'cheap': // Question Bag - rẻ, rủi ro
                typeMultiplier = 0.7;
                break;
            case 'utility': // Dynamite - cần thiết
                typeMultiplier = 0.9;
                break;
            case 'bonus': // Lucky Clover, Gem Polish - tăng thu nhập
                typeMultiplier = 0.9;
                break;
            case 'premium': // Rock Book, Strength - mạnh nhất
                typeMultiplier = 1;
                break;
        }

        // Tính giá cuối với random variation
        const randomVariation = Math.floor(Math.random() * variation);
        const finalPrice = Math.floor((basePrice + randomVariation) * levelMultiplier * typeMultiplier);

        return Math.max(10, finalPrice); // Giá tối thiểu 10$
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    createHorizontalShopUI() {
        // ✅ Layout responsive dựa trên số lượng items
        const numItems = this.shopItems.length;
        const totalWidth = 150; // Tổng chiều rộng available
        const itemSpacing = totalWidth / numItems;
        const startX = 13 + itemSpacing / 2; // Căn giữa
        const startY = 170;

        this.itemContainers = [];

        this.shopItems.forEach((item, index) => {
            const x = startX + index * itemSpacing;
            const y = startY;
            
            // Item container
            const container = this.add.container(x, y);
            
            // Item icon - larger như trong ảnh
            let sprite = null;
            if (this.textures.exists(item.image)) {
                sprite = this.add.image(0, -10, item.image).setOrigin(0.5).setScale(0.6);
                // Set alpha based on purchase status
                const isPurchased = (this.purchasedCount[item.name] || 0) >= 1;
                sprite.setAlpha(isPurchased ? 0.5 : 1.0);
                container.add(sprite);
            }

            // Price text phía dưới - green/red color dựa trên khả năng mua
            const isPurchased = (this.purchasedCount[item.name] || 0) >= 1;
            const priceText = this.add.text(0, 30, `$${item.price}`, {
                fontFamily: 'Kurland',
                fontSize: '16px',
                fill: isPurchased ? '#888888' : (this.player.money >= item.price ? '#00ff00' : '#ff0000'),
                align: 'center'
            }).setOrigin(0.5);
            container.add(priceText);

            // Clickable area
            const hitArea = this.add.rectangle(0, 0, 50, 60, 0x000000, 0.01);
            hitArea.setInteractive({ useHandCursor: true });
            
            // Touch/Hover events để hiển thị tooltip
            // Desktop: hover events
            hitArea.on('pointerover', () => {
                this.selectedIndex = index;
                this.updateHorizontalSelection();
                this.showTooltip(item.description);
            });

            hitArea.on('pointerout', () => {
                this.hideTooltip();
            });
            
            // Mobile: touch và giữ để xem tooltip
            let touchTimer = null;
            let touchStarted = false;
            
            hitArea.on('pointerdown', (pointer) => {
                touchStarted = true;
                this.selectedIndex = index;
                this.updateHorizontalSelection();
                
                // Nếu là touch device, hiển thị tooltip sau 300ms
                if (pointer.event && pointer.event.pointerType === 'touch') {
                    touchTimer = this.time.delayedCall(300, () => {
                        if (touchStarted) {
                            this.showTooltip(item.description);
                        }
                    });
                } else {
                    // Click chuột thông thường - mua ngay
                    this.buyItem(index);
                }
            });
            
            hitArea.on('pointerup', (pointer) => {
                if (touchTimer) {
                    touchTimer.destroy();
                    touchTimer = null;
                }
                
                if (pointer.event && pointer.event.pointerType === 'touch') {
                    if (touchStarted && !this.tooltipText.visible) {
                        // Touch nhanh = mua item
                        this.hideTooltip();
                        this.buyItem(index);
                    } else {
                        // Đã hiển thị tooltip, touch lần nữa để mua
                        this.hideTooltip();
                        this.buyItem(index);
                    }
                }
                touchStarted = false;
            });
            
            hitArea.on('pointermove', () => {
                // Nếu di chuyển finger thì cancel tooltip
                if (touchTimer) {
                    touchTimer.destroy();
                    touchTimer = null;
                }
                touchStarted = false;
            });
            container.add(hitArea);

            // ✅ Store more detailed item UI references
            this.itemContainers.push({ 
                container, 
                priceText, 
                sprite,
                x: x,
                y: y
            });
        });

        // ✅ Next Level button với text tiếng Việt
        this.nextLevelButton = this.add.text(35, 95, 'Qua Màn', {
            fontFamily: 'Kurland',
            fontSize: '12px',
            fill: '#ffffff',
            backgroundColor: '#00aa00',
            padding: { x: 10, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.nextLevelButton.on('pointerdown', () => this.exitShop());

        this.updateHorizontalSelection();
    }

    showTooltip(description) {
        if (this.tooltipText && this.tooltipBorder) {
            this.tooltipText.setText(description);
            this.tooltipText.setVisible(true);
            
            // Update border size based on text
            const bounds = this.tooltipText.getBounds();
            this.tooltipBorder.setSize(bounds.width + 20, bounds.height + 10);
            this.tooltipBorder.setVisible(true);
            
            // Bring tooltip to front
            this.tooltipBorder.setDepth(1000);
            this.tooltipText.setDepth(1001);
        }
    }

    hideTooltip() {
        if (this.tooltipText && this.tooltipBorder) {
            this.tooltipText.setVisible(false);
            this.tooltipBorder.setVisible(false);
        }
    }

    updateHorizontalSelection() {
        // Highlight selected item with subtle effect
        this.itemContainers.forEach((item, index) => {
            const isSelected = index === this.selectedIndex;
            item.container.setScale(isSelected ? 1.1 : 1);
            item.container.setAlpha(isSelected ? 1 : 0.8);
        });
    }

    setupControls() {
        // Keyboard controls for horizontal navigation
        this.input.keyboard.on('keydown-LEFT', () => this.moveSelection(-1));
        this.input.keyboard.on('keydown-RIGHT', () => this.moveSelection(1));
        this.input.keyboard.on('keydown-ENTER', () => this.buyItem(this.selectedIndex));
        this.input.keyboard.on('keydown-ESC', () => this.exitShop());
    }

    moveSelection(direction) {
        this.selectedIndex += direction;
        
        if (this.selectedIndex < 0) {
            this.selectedIndex = this.shopItems.length - 1;
        } else if (this.selectedIndex >= this.shopItems.length) {
            this.selectedIndex = 0;
        }
        
        this.updateHorizontalSelection();
    }

    buyItem(index) {
        const item = this.shopItems[index];
        
        // ✅ Check if item already purchased (max 1 per shop visit)
        if ((this.purchasedCount[item.name] || 0) >= 1) {
            // Show message below the item that was clicked
            const itemUI = this.itemContainers[index];
            const alreadyBoughtText = this.add.text(itemUI.x, itemUI.y + 50, 'Đã mua rồi!', {
                fontFamily: 'Kurland',
                fontSize: '10px',
                fill: '#ff6600',
                align: 'center'
            }).setOrigin(0.5);
            
            // Auto hide after 3 seconds
            this.tweens.add({
                targets: alreadyBoughtText,
                alpha: 0,
                duration: 3000,
                onComplete: () => alreadyBoughtText.destroy()
            });
            return;
        }
        
        if (this.player.money >= item.price) {
            // Deduct money
            this.player.money -= item.price;
            this.moneyText.setText(`$${this.player.money}`);
            
            // ✅ Increment purchased count for this item
            this.purchasedCount[item.name] = (this.purchasedCount[item.name] || 0) + 1;
            
            // Apply item effect
            item.effect();
            
            // ✅ Save progress immediately after buying item
            this.player.saveProgress();
            
            // ✅ Update item display to show as purchased
            this.updateItemDisplay(index);
            
            // Update price colors
            this.itemContainers.forEach((itemUI, i) => {
                const shopItem = this.shopItems[i];
                const isPurchased = (this.purchasedCount[shopItem.name] || 0) >= 1;
                itemUI.priceText.setStyle({
                    fill: isPurchased ? '#888888' : (this.player.money >= this.shopItems[i].price ? '#00ff00' : '#ff0000')
                });
            });
            
            // Play purchase sound
            if (this.sound.get('Money')) {
                this.sound.play('Money');
            }
            
            // Show purchase feedback bằng tiếng Việt
            const feedbackText = this.add.text(this.cameras.main.centerX, 50, `Đã mua ${item.name}!`, {
                fontFamily: 'Kurland',
                fontSize: '16px',
                fill: '#00ff00',
                align: 'center'
            }).setOrigin(0.5);
            
            // ✅ Hiển thị thông báo chi tiết về giá trị
            const valueInfo = this.getItemValueInfo(item.name);
            if (valueInfo) {
                const valueText = this.add.text(this.cameras.main.centerX, 70, valueInfo, {
                    fontFamily: 'Kurland',
                    fontSize: '12px',
                    fill: '#ffda21',
                    align: 'center'
                }).setOrigin(0.5);
                
                this.tweens.add({
                    targets: valueText,
                    alpha: 0,
                    duration: 2000,
                    ease: 'Power2',
                    onComplete: () => valueText.destroy()
                });
            }
            
            // Fade out feedback text
            this.tweens.add({
                targets: feedbackText,
                alpha: 0,
                y: 30,
                duration: 2500,
                onComplete: () => feedbackText.destroy()
            });
            
        } else {
            // Not enough money - text tiếng Việt
            const errorText = this.add.text(this.cameras.main.centerX, 50, 'Không đủ tiền!', {
                fontFamily: 'Kurland',
                fontSize: '16px',
                fill: '#ff0000',
                align: 'center'
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: errorText,
                alpha: 0,
                y: 30,
                duration: 2500,
                onComplete: () => errorText.destroy()
            });
            
            if (this.sound.get('Low')) {
                this.sound.play('Low');
            }
        }
    }

    // ✅ Update item display to show purchased status
    updateItemDisplay(index) {
        const itemUI = this.itemContainers[index];
        const item = this.shopItems[index];
        
        // Check if item was purchased (count >= 1)
        const isPurchased = (this.purchasedCount[item.name] || 0) >= 1;
        
        // Only lower opacity of the item if purchased
        if (itemUI.sprite) {
            itemUI.sprite.setAlpha(isPurchased ? 0.5 : 1.0);
        }
        itemUI.priceText.setStyle({ fill: isPurchased ? '#888888' : '#00ff00' });
    }

    exitShop() {
        // Hide tooltip khi thoát
        this.hideTooltip();
        
        // Save progress before leaving shop
        this.player.saveProgress();
        
        // Check if we came from slot machine or direct transition
        // Either way, go to next level goal
        this.scene.start('TransitionScene', { type: 'NextGoal', player: this.player });
    }

    // ✅ Thông tin giá trị của vật phẩm để người chơi tính toán
    getItemValueInfo(itemName) {
        const expectedIncome = this.getExpectedIncome();
        
        switch (itemName) {
            case 'Dynamite':
                return `Có thể tiết kiệm ~${Math.floor(expectedIncome * 0.1)}$ từ việc phá đá`;
            case 'Lucky Clover':
                return `Tăng thu nhập ~${Math.floor(expectedIncome * 0.15)}$ mỗi màn`;
            case 'Rock Collectors Book':
                return `Tăng thu nhập từ đá ~${Math.floor(expectedIncome * 0.2)}$ mỗi màn`;
            case 'Strength Drink':
                return `Tăng hiệu quả kéo ~${Math.floor(expectedIncome * 0.25)}$ mỗi màn`;
            case 'Gem Polish':
                return `Tăng thu nhập từ gem ~${Math.floor(expectedIncome * 0.1)}$ mỗi màn`;
            case 'Question Bag':
                return `Hiệu ứng ngẫu nhiên - có thể lời hoặc lỗ!`;
        }
        return null;
    }

    // ✅ Tính tổng thu nhập tích lũy dự kiến đến level hiện tại
    getExpectedIncome() {
        let totalIncome = 0;
        for (let i = 1; i <= this.currentLevel; i++) {
            totalIncome += this.getLevelIncome(i);
        }
        return totalIncome;
    }

    // Cleanup
    shutdown() {
        this.input.keyboard.off('keydown-LEFT');
        this.input.keyboard.off('keydown-RIGHT');
        this.input.keyboard.off('keydown-ENTER');
        this.input.keyboard.off('keydown-ESC');
    }
}