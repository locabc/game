// src/entities/Hook.js - PHIÊN BẢN SỬA LỖI VỊ TRÍ MÓC SÁT VÀ HIỂN THỊ TOÀN BỘ

import * as C from '../utils/Constants.js';

export default class Hook {
    constructor(scene, x, y) {
        this.scene = scene;
        this.origin = { x, y };

        this.line = scene.add.graphics();
        this.sprite = scene.physics.add.sprite(x, y, 'hookSheet');
        
        this.sprite.setOrigin(0.5, 0); // Đặt tâm xoay ở đỉnh móc
        this.sprite.body.setAllowGravity(false);
        this.sprite.body.setCircle(this.sprite.width / 2);

        this.grabSoundTimer = 0;
        this.reset(true);
    }

    reset(isInit = false) {
    if (isInit) {
        // Lần đầu tiên thì đặt về góc trái
        this.angle = C.HOOK_MIN_ANGLE;
        this.isSwingingRight = true;
    }
        this.hookLength = 0;
        this.isGrabbing = false;
        this.isBacking = false;
        this.grabbedEntity = null;
        this.sprite.setFrame(0); 
        this.sprite.setPosition(this.origin.x, this.origin.y);
        this.sprite.setRotation(-Phaser.Math.DegToRad(this.angle));       
        this.updatePosition();
        this.scene.sound.play('HookReset');
    }

    startGrabbing() {
        if (!this.isGrabbing) {
            this.isGrabbing = true;
            this.scene.sound.play('GrabStart');
        }
    }
    // Thêm hàm này vào trong class Hook (ví dụ: bên dưới hàm startGrabbing)
useDynamite() {
    if (this.grabbedEntity && this.scene.player.dynamiteCount > 0) {
        const { x, y } = this.grabbedEntity;
        // Hủy vật phẩm bị kéo
        this.grabbedEntity.destroy();
        this.grabbedEntity = null;

        // Giảm số lượng dynamite
        this.scene.player.dynamiteCount--;
        // Thêm sprite nổ
        const explosion = this.scene.add.sprite(x, y, 'explosion');
        explosion.play('explosion_anim');
        explosion.once('animationcomplete', () => explosion.destroy());
        // Cho hook quay về thay vì reset lại hoàn toàn
        this.isBacking = true;
        this.isGrabbing = true; // giữ trạng thái đang hoạt động để update() xử lý quay về

        // Thêm hiệu ứng hoặc âm thanh nổ
        this.scene.sound.play('Explosive');
    } else {
        console.log("Không thể dùng dynamite: Không có vật phẩm hoặc không đủ dynamite!");
    }
}


    update(dt) {
    if (!this.isGrabbing) {
        if (this.angle >= C.HOOK_MAX_ANGLE) this.isSwingingRight = false;
        if (this.angle <= C.HOOK_MIN_ANGLE) this.isSwingingRight = true;
        this.angle += (this.isSwingingRight ? 1 : -1) * C.HOOK_ROTATE_SPEED * dt;
        this.sprite.setFrame(0);
    } else {
        if (!this.isBacking) {
            this.hookLength += C.HOOK_GRAB_SPEED * dt;
            const rad = Phaser.Math.DegToRad(this.angle);
            const worldX = this.origin.x - Math.sin(rad) * this.hookLength;
            const worldY = this.origin.y + Math.cos(rad) * this.hookLength;

            // Nếu móc câu đi ra ngoài màn hình thì cho nó quay về
            if (worldX < 0 || worldX > C.VIRTUAL_WIDTH || worldY > C.VIRTUAL_HEIGHT) {
                this.isBacking = true;
            }
            if (this.hookLength >= C.HOOK_MAX_LENGTH || this.grabbedEntity) {
                this.isBacking = true;
                if (this.grabbedEntity) {
                    // SỬA: Chọn frame dựa trên loại vật phẩm (kiểm tra tên key chứa 'Mini')
                    let selectedFrame = 0; // Mặc định dùng frame 0
                    if (this.grabbedEntity.texture.key.includes('Mini')) {
                        selectedFrame = 2; // Nếu là vật phẩm mini thì dùng frame 2
                    }
                    this.sprite.setFrame(selectedFrame);
                    if (this.grabbedEntity.config.bonusType) {
                        this.scene.sound.play(this.grabbedEntity.config.bonusType);
                    }
                }
            } else {
                this.sprite.setFrame(0);
            }
        } else {
            let backSpeed = C.HOOK_GRAB_SPEED;
            if (this.grabbedEntity) {
                let mass = (this.grabbedEntity.config.mass || 3) * 2.5;
                let strength = this.scene.player.hasStrengthDrink ? 1.5 : 1;
                backSpeed *= strength / mass;
                this.grabSoundTimer -= dt;
                if (this.grabSoundTimer <= 0) {
                    this.scene.sound.play('GrabBack');
                    this.grabSoundTimer = 1;
                }
            }
            this.hookLength -= backSpeed * dt;
            if (this.hookLength <= 0) {
                this.scene.sound.stopByKey('GrabBack');
                if (this.grabbedEntity) {
                    this.scene.events.emit('entityGrabbed', this.grabbedEntity);
                }
                this.reset();
                return;
            }
        }
    }
    this.updatePosition();
}

    updatePosition() {
        const rad = Phaser.Math.DegToRad(this.angle);
        const worldX = this.origin.x + Math.sin(rad) * this.hookLength;
        const worldY = this.origin.y + Math.cos(rad) * this.hookLength;

        this.sprite.setPosition(worldX, worldY);
        this.sprite.setRotation(-rad);
        
        this.line.clear().lineStyle(1, 0x424242)
            .beginPath().moveTo(this.origin.x, this.origin.y).lineTo(worldX, worldY).stroke();
        
        if (this.grabbedEntity && this.isBacking) {
            // SỬA LỖI: Đặt vật phẩm sát đầu móc với overlap nhẹ và hiển thị toàn bộ móc
            const hookTipOffset = this.sprite.height; // Chiều cao từ đỉnh móc đến đầu
            let entityOffsetY;
            const overlap = 2; 
            // Kiểm tra nếu là túi bí ẩn (QuestionBag, type: 'RandomEffect')
            if (this.grabbedEntity.config && this.grabbedEntity.config.type === 'RandomEffect') {
                // Điều chỉnh offset cho túi bí ẩn (thử nghiệm với giá trị phù hợp)
                entityOffsetY = (this.grabbedEntity.height / 2) -10; 
            } else {
                entityOffsetY = (this.grabbedEntity.height / 2) - overlap; // Offset mặc định cho các vật phẩm khác
            }
            
            
            const entityX = worldX + Math.sin(rad) * hookTipOffset;
            const entityY = worldY + Math.cos(rad) * hookTipOffset + entityOffsetY;
            
            this.grabbedEntity.setPosition(entityX, entityY).setRotation(-rad);
            
            // Đảm bảo móc hiển thị trên vật phẩm để không bị che khuất
            this.sprite.setDepth(1);
            this.grabbedEntity.setDepth(0.7);
        }
    }
}