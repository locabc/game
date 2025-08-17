export default class Player {
    constructor() {
        this.level = 1;
        this.realLevelStr = 'L1_1';
        this.goal = 0;
        // goalAddOn không cần thiết nữa vì dùng công thức mới
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

    updateGoal() {
        // Tính toán mục tiêu dựa trên 85% thành công trong 60 giây (~8-10 lần kéo có giá trị)
        // Giá trị trung bình mỗi lần kéo: ~200-300$
        
        if (this.level === 1) {
            this.goal = 600; // L1_1: có ~1350$ max, cần 45% (dễ để làm quen)
        } else if (this.level === 2) {
            this.goal = 750; // L1_2: tương tự L1_1 nhưng khó hơn một chút
        } else if (this.level === 3) {
            this.goal = 900; // L1_3: bắt đầu có Diamond, mục tiêu cao hơn
        } else if (this.level <= 5) {
            // Level 4-5: Có Diamond nhưng cũng có TNT risk
            this.goal = 1200; // Cần kéo được mix Gold + 1 Diamond
        } else if (this.level <= 8) {
            // Level 6-8: TNT nhiều hơn, phải cẩn thận
            this.goal = 1500; // Thách thức về kỹ thuật tránh TNT
        } else if (this.level <= 12) {
            // Level 9-12: Rất nhiều TNT, ít Diamond
            this.goal = 1800; // Cần kỹ năng cao để tránh nổ
        } else {
            // Level 13+: Cực khó, TNT everywhere  
            this.goal = 2000 + (this.level - 12) * 100; // Tăng 100$/level
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