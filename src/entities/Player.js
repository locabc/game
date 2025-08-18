export default class Player {
    constructor() {
        this.level = 1;
        this.realLevelStr = 'L1_1';
        this.goal = 0;
        this.goalAddOn = 750;
        this._money = 0; // Private money field
        this.strength = 1;
        this.dynamiteCount = 0;

        this.hasStrengthDrink = false;
        this.hasLuckyClover = false;
        this.hasRockCollectorsBook = false;
        this.hasGemPolish = false;

        // ✅ Track high score for current session
        this.sessionHighScore = 0;
        this.hasRecordedFinalScore = false;

        this.updateGoal(); // Set initial goal
    }
    updateGoal() {
        if (this.level === 1) {
            this.goal = 1800;
        } else {
            if (this.level > 1 && this.level <= 30) {
                this.goalAddOn += 750;
            }
            this.goal += this.goalAddOn;
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
        
        this.updateGoal();
    }

    addDynamite(amount = 1) {
        this.dynamiteCount = Math.min(this.dynamiteCount + amount, 12);
    }
}