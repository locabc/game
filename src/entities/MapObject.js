// src/entities/MapObject.js - PHIÊN BẢN SỬA LỖI HOÀN CHỈNH

export class MapObject extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, key) {
        super(scene, x, y, key);
        
        // SỬA LỖI "Ô MÀU HỒNG": Tự thêm mình vào cả Display List và Physics World
        // Điều này đảm bảo đối tượng luôn được hiển thị và có thể va chạm
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    // Hàm init để gán config sau khi được tạo ra
    init(config) {
        this.config = config;
        this.body.setSize(this.width, this.height);
        return this; 
    }

    grabbed() {
        let hook = this.scene.hook;
        if (!hook.isBacking && !hook.grabbedEntity) {
            hook.grabbedEntity = this;
            hook.sprite.setFrame(this.width < hook.sprite.width ? 2 : 1);
            this.body.setEnable(false);
        }
    }
}
export class RandomEffectMapObject extends MapObject {
    init(config) {
        super.init(config);

        // Tính toán giá trị và khối lượng ngẫu nhiên
        const randomBonus = Phaser.Math.Between(this.config.randomBonusRatioMin, this.config.randomBonusRatioMax) * this.config.bonusBase;
        const randomMass = Phaser.Math.Between(this.config.randomMassMin, this.config.randomMassMax);

        // Ghi đè lên config của riêng object này
        this.config.bonus = randomBonus;
        this.config.mass = randomMass;

        return this;
    }

    // Hàm đặc biệt được gọi khi thu thập xong
    onCollected(scene) {
        
        // Kiểm tra xem có nhận được hiệu ứng đặc biệt không
        if (Math.random() < this.config.extraEffectChances) {
            // 20% cơ hội nhận thuốc nổ, 80% còn lại nhận sức mạnh
            if (Math.random() < 0.2) {
                scene.player.addDynamite();
                // Có thể thêm text "Got Dynamite!" ở đây
            } else {
                scene.player.strength = Math.min(6, scene.player.strength * 1.5 + 1);
                // Có thể thêm text "Strength!" ở đây
            }
        }
    }
}

export class MoveAroundMapObject extends MapObject {
    init(config, dir) {
        super.init(config);
        this.dir = (dir === 'Left' ? -1 : 1);
        this.speed = config.speed;
        this.moveRange = config.moveRange;
        this.originalX = this.x;
        this.setVelocityX(this.speed * 50);
        this.setFlipX(this.dir === -1);
        return this;
    }
    
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (this.body && this.body.enable) { // Kiểm tra body có tồn tại và được kích hoạt
            if (this.dir > 0 && this.x > this.originalX + this.moveRange) {
                this.setVelocityX(-this.speed * 50);
                this.dir = -1;
                this.setFlipX(true);
            } else if (this.dir < 0 && this.x < this.originalX) {
                this.setVelocityX(this.speed * 50);
                this.dir = 1;
                this.setFlipX(false);
            }
        }
    }
}

export class ExplosiveMapObject extends MapObject {
    init(config) {
        super.init(config);
        return this;
    }

    // Viết đè lên hàm grabbed() của class cha
    grabbed() {
        // Không cho phép móc câu kéo về
        // Thay vào đó, gọi hàm explode ngay lập tức
        this.explode();
    }

    explode() {
        // Nếu đã bị phá hủy rồi thì không nổ nữa
        if (!this.scene) return;

        const scene = this.scene;
        const explosionRadius = 60; // Bán kính vụ nổ

        // 1. Tạo hiệu ứng nổ
        const explosionSprite = scene.add.sprite(this.x, this.y, 'bigger_explosive_fx_sheet');
        explosionSprite.play('tnt-explosion');
        explosionSprite.on('animationcomplete', () => {
            explosionSprite.destroy(); // Hủy sprite hiệu ứng sau khi chạy xong
        });

        // 2. Chơi âm thanh nổ
        scene.sound.play('Explosive');

        // 3. Tìm và phá hủy các vật phẩm xung quanh
        scene.mapObjects.getChildren().forEach(child => {
            // Đảm bảo child vẫn còn tồn tại và không phải là chính TNT
            if (child && child.body && child !== this) {
                const distance = Phaser.Math.Distance.Between(this.x, this.y, child.x, child.y);
                if (distance < explosionRadius) {
                    // Có thể thêm hiệu ứng nhỏ cho vật phẩm bị phá hủy ở đây
                    child.destroy();
                }
            }
        });
        
        // 4. Bắt móc câu phải quay về ngay lập tức
        scene.hook.isBacking = true;

        // 5. Cuối cùng, tự hủy chính thùng TNT
        this.destroy();
    }
}
