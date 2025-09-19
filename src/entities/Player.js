export default class Player {
    constructor() {
        this.level = 1;
        this.realLevelStr = 'L1_1';
        this.goal = 0;
        this.goalAddOn = 500;
        this._money = 0;
        this.levelsList = null;
        this.levelIndex = -1;
        this.strength = 1;
        this.dynamiteCount = 0;
        
        // ✅ Time freeze items
        this.hasTimeFreezeItem = 0;

        this.hasStrengthDrink = false;
        this.hasLuckyClover = false;
        this.hasRockCollectorsBook = false;
        this.hasGemPolish = false;

        // ✅ NEW: Special rare item effects
        this.hasGoldenHook = false;
        this.goldenHookTimer = 0;
        this.hasMagnetStone = false;
        this.magnetRadius = 0;
        this.magnetTimer = 0;
        this.hasLuckyStar = false;
        this.luckyStreakCount = 0;

        // ✅ Track high score for current session
        this.sessionHighScore = 0;
        this.hasRecordedFinalScore = false;

        this.updateGoal(); // Set initial goal
    }
    updateGoal() {
        if (this.level === 1) {
            this.goal = 1600;
        } else {
            let increment = 0;

            if (this.level <= 30) {
                // Công thức cũ cho lv 2-30
                let addOn = 350;
                if (this.level > 1 && this.level <= 30) {
                    addOn += 350;   // = 700
                }
                let levelBonus = this.level * 100;
                let extra = this.level * 100;
                increment = addOn + this.goalAddOn + levelBonus + extra;
            } else if (this.level <= 100) {
                // Từ lv31-100: goal tăng từ 7000 -> 20000
                let minInc = 7000;
                let maxInc = 9000;
                let steps = 100 - 31; // 69 bước
                let stepInc = (maxInc - minInc) / steps;
                increment = Math.round(minInc + (this.level - 31) * stepInc);
            } else {
                // Từ lv101-150: goal tăng từ 20000 -> 30000
                let minInc = 7000;
                let maxInc = 11000;
                let steps = 150 - 100; // 50 bước
                let stepInc = (maxInc - minInc) / steps;
                increment = Math.round(minInc + (this.level - 100) * stepInc);
            }

            this.goal += increment;
            // Kiểm tra chênh lệch giữa goal và tiền người chơi
            let diff = this.goal - this.money;
            if (diff > 6000) {
                if (this.level % 5 === 0) {
                    // Nếu level chia hết cho 5 → giảm 25%
                    this.goal = this.money + Math.round(diff * 0.75);
                    //console.log(`Level ${this.level}: Goal adjusted by 25% reduction. New goal: ${this.goal}`);
                } else {
                    // Các level khác → giảm 45%
                    this.goal = this.money + Math.round(diff * 0.55);
                    //console.log(`Level ${this.level}: Goal adjusted by 45% reduction. New goal: ${this.goal}`);
                }
            } else if (this.money > this.goal + 8000) {
                // Nếu gold của người chơi lớn hơn goal của màn tiếp theo 8000 → lấy 25% phần chênh lệch cộng vào goal
                let excess = this.money - this.goal;
                this.goal = this.goal + Math.round(excess * 0.25);
                //console.log(`Level ${this.level}: Goal increased by 25% of excess money. New goal: ${this.goal}`);
            }
        }
    }

    // Getter for money with logging
    get money() {
        return this._money;
    }

    // Setter for money with logging
    set money(value) {
        const oldMoney = this._money;
        this._money = value;
        
        // ✅ Track session high score
        if (this._money > this.sessionHighScore) {
            this.sessionHighScore = this._money;
        }
    }

    

    reachGoal() {
        return this.money >= this.goal;
    }
    
    // ✅ NEW: Skin management methods
    setSkin(skinId) {
        if (this.unlockedSkins.includes(skinId)) {
            this.currentSkin = skinId;
        }
    }
    
    unlockSkin(skinId) {
        if (!this.unlockedSkins.includes(skinId)) {
            this.unlockedSkins.push(skinId);
        }
    }
    
    getSkinConfig() {
        return {
            currentSkin: this.currentSkin,
            unlockedSkins: this.unlockedSkins
        };
    }
    
    // Hàm xáo trộn mảng (Fisher-Yates shuffle)
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Phaser.Math.Between(0, i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Hàm tạo danh sách level từ start đến end với sub-level cố định hoặc đầy đủ
    createLevelRange(start, end, subLevel = null) {
        const levels = [];
        for (let i = start; i <= end; i++) {
            const subRange = subLevel ? [subLevel] : [1, 2, 3];
            for (let j of subRange) {
                levels.push(`L${i}_${j}`);
            }
        }
        return levels;
    }

    goToNextLevel() {
        this.level++;
        
        if (!this.levelsList) {
            this.levelsList = [];
            
            // Nhóm 1: L1_1 đến L5_3 - Dùng cho Level 1-15
            const group1 = this.shuffleArray(this.createLevelRange(1, 5));
            this.levelsList = this.levelsList.concat(group1);
            
            // Nhóm 2: L6_1 đến L10_3 - Dùng cho Level 16-30
            const group2 = this.shuffleArray(this.createLevelRange(6, 10));
            this.levelsList = this.levelsList.concat(group2);
            
            // Nhóm 3: L11_1 đến L15_3 - Dùng cho Level 31-45
            const group3 = this.shuffleArray(this.createLevelRange(11, 15));
            this.levelsList = this.levelsList.concat(group3);
            
            // Nhóm 4: L16_1 đến L20_3 - Dùng cho Level 46-60
            const group4 = this.shuffleArray(this.createLevelRange(16, 20));
            this.levelsList = this.levelsList.concat(group4);
            
            // Nhóm 5: L21_1 đến L25_3 - Dùng cho Level 61-75
            const group5 = this.shuffleArray(this.createLevelRange(21, 25));
            this.levelsList = this.levelsList.concat(group5);
            
            // Nhóm 6: L26_1 đến L30_3 - Dùng cho Level 76-90
            const group6 = this.shuffleArray(this.createLevelRange(26, 30));
            this.levelsList = this.levelsList.concat(group6);
            
            // Nhóm 7: L31_1 đến L35_3 - Dùng cho Level 91-105
            const group7 = this.shuffleArray(this.createLevelRange(31, 35));
            this.levelsList = this.levelsList.concat(group7);
            
            // Nhóm 8: L36_1 đến L40_3 - Dùng cho Level 106-120
            const group8 = this.shuffleArray(this.createLevelRange(36, 40));
            this.levelsList = this.levelsList.concat(group8);
            
            // Nhóm 9: L41_1 đến L45_3 - Dùng cho Level 121-135
            const group9 = this.shuffleArray(this.createLevelRange(41, 45));
            this.levelsList = this.levelsList.concat(group9);
            
            // Nhóm 10: L46_1 đến L50_3 - Dùng cho Level 136-150
            const group10 = this.shuffleArray(this.createLevelRange(46, 50));
            this.levelsList = this.levelsList.concat(group10);
            
            //console.log('Danh sách maps:', this.levelsList);
        }
    
        // Chọn map dựa vào level hiện tại
        let mapIndex = 0;
        
        if (this.level <= 15) {
            // Level 1-15 sử dụng maps từ nhóm 1 (L1_1 đến L5_3)
            mapIndex = (this.level - 1) % 15;
        } else if (this.level <= 30) {
            // Level 16-30 sử dụng maps từ nhóm 2 (L6_1 đến L10_3)
            mapIndex = 15 + ((this.level - 16) % 15);
        } else if (this.level <= 45) {
            // Level 31-45 sử dụng maps từ nhóm 3 (L11_1 đến L15_3)
            mapIndex = 30 + ((this.level - 31) % 15);
        } else if (this.level <= 60) {
            // Level 46-60 sử dụng maps từ nhóm 4 (L16_1 đến L20_3)
            mapIndex = 45 + ((this.level - 46) % 15);
        } else if (this.level <= 75) {
            // Level 61-75 sử dụng maps từ nhóm 5 (L21_1 đến L25_3)
            mapIndex = 60 + ((this.level - 61) % 15);
        } else if (this.level <= 90) {
            // Level 76-90 sử dụng maps từ nhóm 6 (L26_1 đến L30_3)
            mapIndex = 75 + ((this.level - 76) % 15);
        } else if (this.level <= 105) {
            // Level 91-105 sử dụng maps từ nhóm 7 (L31_1 đến L35_3)
            mapIndex = 90 + ((this.level - 91) % 15);
        } else if (this.level <= 120) {
            // Level 106-120 sử dụng maps từ nhóm 8 (L36_1 đến L40_3)
            mapIndex = 105 + ((this.level - 106) % 15);
        } else if (this.level <= 135) {
            // Level 121-135 sử dụng maps từ nhóm 9 (L41_1 đến L45_3)
            mapIndex = 120 + ((this.level - 121) % 15);
        } else {
            // Level 136-150 sử dụng maps từ nhóm 10 (L46_1 đến L50_3)
            mapIndex = 135 + ((this.level - 136) % 15);
        }
        
        this.realLevelStr = this.levelsList[mapIndex];
        console.log(`Hiện đang ở level: ${this.level}, map: ${this.realLevelStr}, Index: ${mapIndex}`);
        
        /*
        goToNextLevel() {
    this.level++;
    
    if (!this.levelsList) {
        this.levelsList = [];
        
        // Tạo danh sách map từ L1_1 đến L50_3 theo thứ tự tăng dần
        for (let i = 1; i <= 50; i++) {
            for (let j = 1; j <= 3; j++) {
                this.levelsList.push(`L${i}_${j}`);
            }
        }
        
        console.log('Danh sách maps:', this.levelsList);
    }
    
    // Chọn map dựa vào level hiện tại
    const mapIndex = this.level - 1; // Level 1 ánh xạ tới index 0 (L1_1), level 2 tới index 1 (L1_2), v.v.
    
    // Kiểm tra nếu level vượt quá số map (150)
    if (mapIndex >= this.levelsList.length) {
        console.warn(`Level ${this.level} vượt quá số map khả dụng. Quay lại map đầu tiên.`);
        this.level = 1; // Reset về level 1 nếu vượt quá
        this.realLevelStr = this.levelsList[0];
    } else {
        this.realLevelStr = this.levelsList[mapIndex];
    }
    
    console.log(`Hiện đang ở level: ${this.level}, map: ${this.realLevelStr}, Index: ${mapIndex}`);
    */
        // Reset buffs
        this.strength = 1;
        this.hasStrengthDrink = false;
        this.hasLuckyClover = false;
        this.hasRockCollectorsBook = false;
        this.hasGemPolish = false;
        
        // ✅ Reset special rare item effects
        this.hasGoldenHook = false;
        this.goldenHookTimer = 0;
        this.hasMagnetStone = false;
        this.magnetRadius = 0;
        this.magnetTimer = 0;
        this.hasLuckyStar = false;
        this.luckyStreakCount = 0;
        
        this.updateGoal();
    }

    addDynamite(amount = 1) {
        this.dynamiteCount = Math.min(this.dynamiteCount + amount, 12);
    }

    addTimeFreezeItem(amount = 1) {
        this.hasTimeFreezeItem = Math.min(this.hasTimeFreezeItem + amount, 12);
    }

    // ✅ GAME PROGRESS: Save current progress to localStorage
    saveProgress() {
        const progress = {
            level: this.level,
            money: this._money,
            dynamiteCount: this.dynamiteCount,
            hasTimeFreezeItem: this.hasTimeFreezeItem,
            goal: this.goal,
            realLevelStr: this.realLevelStr,
            strength: this.strength, // ✅ Save strength value
            // Save buffs
            hasStrengthDrink: this.hasStrengthDrink,
            hasLuckyClover: this.hasLuckyClover,
            hasRockCollectorsBook: this.hasRockCollectorsBook,
            hasGemPolish: this.hasGemPolish,
            // Save special items
            hasGoldenHook: this.hasGoldenHook,
            hasMagnetStone: this.hasMagnetStone,
            hasLuckyStar: this.hasLuckyStar,
            // Save level shuffle data
            levelsList: this.levelsList,
            levelIndex: this.levelIndex,
            timestamp: Date.now()
        };
        
        localStorage.setItem('goldMinerProgress', JSON.stringify(progress));
    }

    // ✅ GAME PROGRESS: Load progress from localStorage
    loadProgress() {
        const saved = localStorage.getItem('goldMinerProgress');
        if (!saved) return false;

        try {
            const progress = JSON.parse(saved);
            
            // Restore all saved data
            this.level = progress.level || 1;
            this._money = progress.money || 0;
            this.dynamiteCount = progress.dynamiteCount || 0;
            this.hasTimeFreezeItem = progress.hasTimeFreezeItem || 0;
            this.goal = progress.goal || 1600;
            this.realLevelStr = progress.realLevelStr || 'L1_1';
            this.strength = progress.strength || 1; // ✅ Restore strength value
            
            // Restore buffs
            this.hasStrengthDrink = progress.hasStrengthDrink || false;
            this.hasLuckyClover = progress.hasLuckyClover || false;
            this.hasRockCollectorsBook = progress.hasRockCollectorsBook || false;
            this.hasGemPolish = progress.hasGemPolish || false;
            
            // Restore special items
            this.hasGoldenHook = progress.hasGoldenHook || false;
            this.hasMagnetStone = progress.hasMagnetStone || false;
            this.hasLuckyStar = progress.hasLuckyStar || false;
            
            // Restore level shuffle data
            this.levelsList = progress.levelsList || null;
            this.levelIndex = progress.levelIndex || -1;
            
            return true;
        } catch (error) {
            console.error('Failed to load progress:', error);
            return false;
        }
    }

    // ✅ GAME PROGRESS: Clear saved progress (when game over/reset)
    clearProgress() {
        localStorage.removeItem('goldMinerProgress');
    }
}
