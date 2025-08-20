export default class Player {
    constructor() {
        this.level = 1;
        this.realLevelStr = 'L1_1';
        this.goal = 0;
        this.goalAddOn = 500;
        this._money = 3000; // Private money field
        this.strength = 1;
        this.dynamiteCount = 0;

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
        let addOn = 350; 
        
        if (this.level > 1 && this.level <= 30) { 
            addOn += 350;   // = 700 
        } 

        // cộng thêm bonus theo level (lv2:200, lv3:300, ... lv30:3000) 
        let levelBonus = this.level * 100;    

        // thêm phần tăng đều 20 mỗi level 
        let extra = this.level * 20;   

        this.goal += addOn + this.goalAddOn + levelBonus + extra; 
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
    
    goToNextLevel() {
        this.level++;
        let realLevel = 0;
        if (this.level <= 3) {
            realLevel = this.level;
        } else {
            realLevel = (this.level - 4) % 7 + 4; // L4-L10
        }
        this.realLevelStr = `L${realLevel}_${Phaser.Math.Between(1, 3)}`;

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
}
