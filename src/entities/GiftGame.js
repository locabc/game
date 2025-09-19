// Hàm để mở game từ file lat_the.html khi nhận GiftBox
export function createGiftBoxMiniGame(scene) {
    // Tạm dừng trò chơi chính
    if (scene.timerEvent) scene.timerEvent.paused = true;
    scene.isImageOpen = true;
    
    // Random chọn 1 trong 3 game: lật thẻ, đố vui, tính toán
    const games = ['lat_the.html', 'do_vui.html', 'tinh_toan.html'];
    const randomGame = games[Math.floor(Math.random() * games.length)];
    
    //console.log('🎮 Random game selected:', randomGame);
    
    // Tạo hiệu ứng tối nền để hiển thị trò chơi
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setDepth(1000);
    overlay.setScrollFactor(0);
    
    // Lưu overlay để có thể xóa sau này
    window.currentGameOverlay = overlay;
    
    // Tạo một HTML iframe element để hiển thị game được chọn
    const iframeElement = document.createElement('iframe');
    iframeElement.style.position = 'fixed';
    iframeElement.style.top = '50%';
    iframeElement.style.left = '50%';
    iframeElement.style.transform = 'translate(-50%, -50%)';
    iframeElement.style.width = '98%';
    iframeElement.style.height = '98%';
    iframeElement.style.border = 'none';
    iframeElement.style.zIndex = '1001';
    iframeElement.style.borderRadius = '10px';
    iframeElement.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    iframeElement.style.overflow = 'hidden';
    iframeElement.style.backgroundColor = '#1a202c';
    
    // Tạo URL với tham số để đảm bảo iframe load với CSS đúng
    const iframeUrl = new URL(randomGame, window.location.href);
    iframeUrl.searchParams.set('embedded', 'true');
    iframeElement.src = iframeUrl.toString();
    
    // Thêm iframe vào DOM
    document.body.appendChild(iframeElement);
    
    // Tạo nút đóng HTML để người dùng có thể quay lại game
    const htmlCloseButton = document.createElement('button');
    htmlCloseButton.textContent = 'X';
    htmlCloseButton.style.position = 'fixed';
    htmlCloseButton.style.top = '5%';
    htmlCloseButton.style.right = '5%';
    htmlCloseButton.style.zIndex = '1002';
    htmlCloseButton.style.backgroundColor = '#ff0000';
    htmlCloseButton.style.color = 'white';
    htmlCloseButton.style.border = 'none';
    htmlCloseButton.style.borderRadius = '50%';
    htmlCloseButton.style.width = '40px';
    htmlCloseButton.style.height = '40px';
    htmlCloseButton.style.fontSize = '20px';
    htmlCloseButton.style.cursor = 'pointer';
    htmlCloseButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    
    document.body.appendChild(htmlCloseButton);
    
    // Create a named function handler to allow for proper cleanup
    const messageHandler = function(event) {
        // Kiểm tra thông điệp từ game đố vui và tính toán
        if (event.data && event.data.type === 'quizGameCompleted') {
            const result = event.data.result;
            const correctAnswers = result.correctAnswers;
            
            //console.log('🧠 Quiz game completed with', correctAnswers, 'correct answers');
            
            // Xử lý phần thưởng dựa trên số câu trả lời đúng
            let rewardText = '';
            let rewardMoney = 0;
            let rewardDynamite = 0;
            let rewardFreeze = 0;
            
            if (correctAnswers === 5) {
                // 🎉 Hoàn hảo - 5/5 câu
                rewardMoney = 5000;
                rewardDynamite = 4;
                rewardFreeze = 4;
                rewardText = `� XUẤT SẮC! Trả lời đúng 5/5 câu!\n💰 +${rewardMoney} GOLD\n💣 +${rewardDynamite} Thuốc nổ\n❄️ +${rewardFreeze} Đóng băng`;
            } else if (correctAnswers === 4) {
                // ❄️ Tốt - 4/5 câu: Gold + Đóng băng
                rewardMoney = 3000;
                rewardFreeze = 3;
                rewardText = `🎯 Trả lời đúng ${correctAnswers}/5 câu!\n💰 +${rewardMoney} GOLD\n❄️ +${rewardFreeze} Đóng băng`;
            } else if (correctAnswers === 3) {
                // 💣 Khá - 3/5 câu: Gold + Thuốc nổ
                rewardMoney = 2000;
                rewardDynamite = 2;
                rewardText = `🎯 Trả lời đúng ${correctAnswers}/5 câu!\n💰 +${rewardMoney} GOLD\n💣 +${rewardDynamite} Thuốc nổ`;
            } else if (correctAnswers === 2) {
                // 💰 Đạt - 2/5 câu: Chỉ Gold
                rewardMoney = 1000;
                rewardText = `� Trả lời đúng ${correctAnswers}/5 câu!\n💰 +${rewardMoney} GOLD`;
            } else {
                // 😢 Chưa đạt - 0-1 câu: Không có gì
                rewardText = `😢 Trả lời đúng ${correctAnswers}/5 câu!\n🎯 Cần tối thiểu 2 câu đúng để nhận phần thưởng`;
            }
            
            // Áp dụng phần thưởng
            if (rewardMoney > 0) {
                scene.player.money += rewardMoney;
                scene.moneyText.setText('$' + scene.player.money);
            }
            if (rewardDynamite > 0) {
                // Sử dụng addDynamite để đảm bảo consistency
                scene.player.addDynamite(rewardDynamite);
            }
            if (rewardFreeze > 0) {
                // Sử dụng addTimeFreezeItem để đảm bảo consistency
                scene.player.addTimeFreezeItem(rewardFreeze);
            }
            
            // QUAN TRỌNG: Lưu tiến trình ngay lập tức sau khi nhận phần thưởng
            if (scene.player.saveProgress) {
                scene.player.saveProgress();
            }
            
            // Cập nhật UI
            if (scene.updatePlayerStats) scene.updatePlayerStats();
            
            // Gửi thông báo phần thưởng về game quiz để hiển thị (với delay để đảm bảo UI sẵn sàng)
            setTimeout(() => {
                if (window.frames.length > 0) {
                    try {
                        const iframe = document.querySelector('iframe');
                        if (iframe && iframe.contentWindow) {
                            //console.log('🎁 Sending reward message to iframe:', rewardText);
                            iframe.contentWindow.postMessage({
                                type: 'showReward',
                                reward: {
                                    text: rewardText,
                                    money: rewardMoney,
                                    dynamite: rewardDynamite,
                                    freeze: rewardFreeze
                                }
                            }, '*');
                        }
                    } catch (error) {
                        console.warn('Could not send reward message to iframe:', error);
                    }
                }
            }, 500); // Delay 500ms để UI quiz sẵn sàng
            
            // Đóng iframe sau khi hiển thị thông báo
            setTimeout(() => {
                try {
                    const iframe = document.querySelector('iframe');
                    const closeButton = document.querySelector('button');
                    
                    if (iframe) {
                        document.body.removeChild(iframe);
                    }
                    if (closeButton && closeButton.textContent === 'X') {
                        document.body.removeChild(closeButton);
                    }
                    
                    window.removeEventListener('message', messageHandler);
                    
                    if (scene.timerEvent) scene.timerEvent.paused = false;
                    scene.isImageOpen = false;
                    
                    // Xóa overlay đúng cách
                    if (window.currentGameOverlay) {
                        window.currentGameOverlay.destroy();
                        window.currentGameOverlay = null;
                    }
                } catch (error) {
                    console.warn('⚠️ Quiz cleanup warning:', error);
                }
            }, 5000); // Tăng từ 3000 lên 5000ms
            
            return;
        }
        
        // Kiểm tra thông điệp đóng game từ quiz/math games
        if (event.data && event.data.type === 'closeGame') {
            try {
                const iframe = document.querySelector('iframe');
                const closeButton = document.querySelector('button');
                
                if (iframe) {
                    document.body.removeChild(iframe);
                }
                if (closeButton && closeButton.textContent === 'X') {
                    document.body.removeChild(closeButton);
                }
                
                window.removeEventListener('message', messageHandler);
                
                if (scene.timerEvent) scene.timerEvent.paused = false;
                scene.isImageOpen = false;
                
                // Xóa overlay đúng cách
                if (window.currentGameOverlay) {
                    window.currentGameOverlay.destroy();
                    window.currentGameOverlay = null;
                }
            } catch (error) {
                console.warn('⚠️ Close game cleanup warning:', error);
            }
            
            return;
        }
        
        // Kiểm tra thông điệp từ iframe lat_the.html
        if (event.data && event.data.type === 'cardGameCompleted') {
            const reward = event.data.reward;
            
            // Debug logging
            // console.log('🎮 GiftGame nhận được reward:', JSON.stringify(reward));
            
            // Xử lý phần thưởng dựa trên kết quả từ game lật thẻ
            if (reward) {
                // console.log('🎯 Xử lý reward type:', reward.type);
                switch (reward.type) {
                    case 'money':
                        scene.player.money += reward.value;
                        scene.moneyText.setText('$' + scene.player.money);
                        
                        // Hiển thị thông báo
                        const moneyRewardText = scene.add.text(scene.cameras.main.centerX, 60, `💰 +${reward.value} Tiền`, {
                            fontFamily: 'Arial',
                            fontSize: '16px',
                            fill: '#FFD700',
                            stroke: '#000000',
                            strokeThickness: 2
                        }).setOrigin(0.5);
                        
                        scene.tweens.add({
                            targets: moneyRewardText,
                            alpha: 0,
                            y: 30,
                            duration: 2000,
                            onComplete: () => moneyRewardText.destroy()
                        });
                        break;
                        
                    case 'dynamite':
                        // Sử dụng addDynamite để đảm bảo consistency
                        scene.player.addDynamite(reward.value);
                        if (scene.updatePlayerStats) scene.updatePlayerStats();
                        
                        // Lưu progress ngay sau khi nhận dynamite
                        if (scene.player.saveProgress) {
                            scene.player.saveProgress();
                        }
                        
                        // Hiển thị thông báo
                        const dynamiteText = scene.add.text(scene.cameras.main.centerX, 60, `💣 +${reward.value} Thuốc Nổ`, {
                            fontFamily: 'Arial',
                            fontSize: '16px',
                            fill: '#FF6B35',
                            stroke: '#000000',
                            strokeThickness: 2
                        }).setOrigin(0.5);
                        
                        scene.tweens.add({
                            targets: dynamiteText,
                            alpha: 0,
                            y: 30,
                            duration: 2000,
                            onComplete: () => dynamiteText.destroy()
                        });
                        break;
                        
                    case 'time':
                        scene.timeLeft += reward.value;
                        scene.timeText.setText('Time: ' + scene.timeLeft);
                        
                        // Hiển thị thông báo
                        const timeText = scene.add.text(scene.cameras.main.centerX, 60, `⏰ +${reward.value} Giây`, {
                            fontFamily: 'Arial',
                            fontSize: '16px',
                            fill: '#4CAF50',
                            stroke: '#000000',
                            strokeThickness: 2
                        }).setOrigin(0.5);
                        
                        scene.tweens.add({
                            targets: timeText,
                            alpha: 0,
                            y: 30,
                            duration: 2000,
                            onComplete: () => timeText.destroy()
                        });
                        break;
                        
                    case 'freeze':
                        // Sử dụng addTimeFreezeItem để đảm bảo consistency
                        scene.player.addTimeFreezeItem(reward.value);
                        if (scene.updatePlayerStats) scene.updatePlayerStats();
                        
                        // Lưu progress ngay sau khi nhận freeze
                        if (scene.player.saveProgress) {
                            scene.player.saveProgress();
                        }
                        
                        // Hiển thị thông báo
                        const freezeText = scene.add.text(scene.cameras.main.centerX, 60, `❄️ +${reward.value} Đóng Băng`, {
                            fontFamily: 'Arial',
                            fontSize: '16px',
                            fill: '#00BCD4',
                            stroke: '#000000',
                            strokeThickness: 2
                        }).setOrigin(0.5);
                        
                        scene.tweens.add({
                            targets: freezeText,
                            alpha: 0,
                            y: 30,
                            duration: 2000,
                            onComplete: () => freezeText.destroy()
                        });
                        break;
                        
                    case 'special_prize':
                        // Xử lý giải đặc biệt: Cộng tiền và chuyển level
                        scene.player.money += reward.gold || 5000;
                        scene.moneyText.setText('$' + scene.player.money);
                        
                        // Debug thông tin scene
                        // console.log('🔍 Scene info:', {
                        //     key: scene.scene?.key,
                        //     hasCompleteLevel: typeof scene.completeLevel === 'function',
                        //     hasSceneManager: !!scene.scene,
                        //     hasEvents: !!scene.events,
                        //     hasRegistry: !!scene.registry,
                        //     hasPlayer: !!scene.player,
                        //     playerHasGoToNextLevel: scene.player && typeof scene.player.goToNextLevel === 'function'
                        // });
                        
                        // Hiển thị thông báo đặc biệt
                        const specialText = scene.add.text(scene.cameras.main.centerX, 60, `🎉 GIẢI ĐẶC BIỆT!\n💰 +${reward.gold || 5000} GOLD\n🚀 Chuyển level tiếp theo!`, {
                            fontFamily: 'Arial',
                            fontSize: '18px',
                            fill: '#FFD700',
                            stroke: '#000000',
                            strokeThickness: 3,
                            align: 'center'
                        }).setOrigin(0.5);
                        
                        // Animation nổi bật cho thông báo
                        scene.tweens.add({
                            targets: specialText,
                            scaleX: 1.2,
                            scaleY: 1.2,
                            alpha: 0,
                            y: 30,
                            duration: 4000,
                            ease: 'Power2',
                            onComplete: () => specialText.destroy()
                        });
                        
                        // Chuyển tới màn chơi tiếp theo sau 2 giây
                        setTimeout(() => {
                            // console.log('🎯 Đang thử chuyển màn...');
                            
                            // Cleanup và đóng iframe trước khi chuyển scene
                            try {
                                // Tìm và đóng iframe + button
                                const iframe = document.querySelector('iframe');
                                const closeButton = document.querySelector('button');
                                
                                if (iframe) {
                                    // console.log('🧹 Đóng iframe trước khi chuyển scene...');
                                    document.body.removeChild(iframe);
                                }
                                
                                if (closeButton && closeButton.textContent === 'X') {
                                    document.body.removeChild(closeButton);
                                }
                                
                                // Remove event listener
                                window.removeEventListener('message', messageHandler);
                                
                                // Resume game
                                if (scene.timerEvent) scene.timerEvent.paused = false;
                                scene.isImageOpen = false;
                                
                                // Destroy overlay if exists
                                // Xóa overlay đúng cách
                                if (window.currentGameOverlay) {
                                    window.currentGameOverlay.destroy();
                                    window.currentGameOverlay = null;
                                }
                                
                            } catch (cleanupError) {
                                console.warn('⚠️ Cleanup warning:', cleanupError);
                            }
                            
                            // Delay thêm một chút để đảm bảo cleanup hoàn tất
                            setTimeout(() => {
                                // Chuyển level theo cách của game
                                try {
                                    // Sử dụng MadeGoal nhưng phải tăng level trước
                                    // console.log('🎯 Tăng level trước khi chuyển TransitionScene...');
                                    // console.log('🔍 Current player level trước khi tăng:', scene.player.level);
                                    // console.log('🔍 Current player realLevelStr trước:', scene.player.realLevelStr);
                                    
                                    // Tăng level giống như trong endLevel()
                                    if (scene.player && scene.player.goToNextLevel) {
                                        scene.player.goToNextLevel();
                                        // console.log('✅ Đã tăng level thành:', scene.player.level);
                                        // console.log('✅ RealLevelStr mới:', scene.player.realLevelStr);
                                        
                                        // Lưu progress
                                        if (scene.player.saveProgress) {
                                            scene.player.saveProgress();
                                        }
                                    }
                                    
                                    // Chuyển thẳng đến cửa hàng thay vì TransitionScene
                                    // console.log('🎯 Chuyển thẳng đến ShopScene...');
                                    
                                    // Đảm bảo scene hiện tại vẫn active trước khi chuyển
                                    if (scene.scene && scene.scene.isActive()) {
                                        scene.scene.start('ShopScene', { 
                                            player: scene.player 
                                        });
                                    } else {
                                        console.warn('⚠️ Scene không active, thử restart game...');
                                        // Fallback: restart toàn bộ game
                                        window.location.reload();
                                    }
                                } catch (error) {
                                    console.error('❌ Lỗi khi chuyển màn:', error);
                                    console.error('Error details:', error.stack);
                                    
                                    // Fallback: thử cách khác - restart PlayScene với player hiện tại
                                    // console.log('🔄 Fallback: restart PlayScene...');
                                    try {
                                        if (scene.scene && scene.scene.isActive()) {
                                            scene.scene.start('PlayScene', { player: scene.player });
                                        } else {
                                            console.error('⚠️ Scene không active trong fallback, reload page...');
                                            window.location.reload();
                                        }
                                    } catch (fallbackError) {
                                        console.error('❌ Fallback cũng lỗi, reload page:', fallbackError);
                                        window.location.reload();
                                    }
                                }
                            }, 100);
                        }, 2000);
                        break;
                        
                    case 'next_level':
                        // Chuyển tới màn chơi tiếp theo
                        if (scene.completeLevel) {
                            scene.completeLevel(true); // Truyền true để bỏ qua animation và chuyển ngay
                        } else {
                            // Nếu không có hàm hoàn thành level, tăng điểm và ghi nhận hoàn thành level
                            scene.player.money += 500; // Thưởng tiền khi chuyển level
                            scene.moneyText.setText('$' + scene.player.money);
                            scene.events.emit('levelCompleted');
                        }
                        break;
                        
                    case 'close':
                        // Không cần làm gì, chỉ để đóng mini-game
                        break;
                        
                    case 'image':
                        // Không cần làm gì đặc biệt, hình ảnh đã hiển thị trong iframe
                        break;
                }
            }
        }
    };
    
    // Add the event listener with our named handler
    window.addEventListener('message', messageHandler);
    
    // Xử lý sự kiện đóng game
    htmlCloseButton.addEventListener('click', function() {
        try {
            // Xóa iframe và button khỏi DOM
            if (iframeElement.parentNode) {
                document.body.removeChild(iframeElement);
            }
            if (htmlCloseButton.parentNode) {
                document.body.removeChild(htmlCloseButton);
            }
            
            // Remove the message event listener
            window.removeEventListener('message', messageHandler);
            
            // Tiếp tục trò chơi chính
            if (scene.timerEvent) scene.timerEvent.paused = false;
            scene.isImageOpen = false;
            
            // QUAN TRỌNG: Xóa overlay để tắt hiệu ứng tối màn hình
            if (window.currentGameOverlay) {
                window.currentGameOverlay.destroy();
                window.currentGameOverlay = null;
            }
            
            // Thêm phần thưởng nhỏ khi đóng sớm
            scene.player.money += 50;
            scene.moneyText.setText('$' + scene.player.money);
            
            // Lưu progress sau khi thêm tiền
            if (scene.player.saveProgress) {
                scene.player.saveProgress();
            }
        
        // Hiển thị thông báo
        const smallReward = scene.add.text(scene.cameras.main.centerX, 60, "💰 +50 Tiền", {
            fontFamily: 'Arial',
            fontSize: '16px',
            fill: '#FFD700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Animation cho thông báo
        scene.tweens.add({
            targets: smallReward,
            alpha: 0,
            y: 30,
            duration: 2000,
            onComplete: () => smallReward.destroy()
        });
        
        // Xóa overlay
        if (window.currentGameOverlay) {
            window.currentGameOverlay.destroy();
            window.currentGameOverlay = null;
        }
        } catch (error) {
            console.warn('⚠️ Error closing gift game:', error);
            // Vẫn cố gắng khôi phục game state
            if (scene.timerEvent) scene.timerEvent.paused = false;
            scene.isImageOpen = false;
            if (window.currentGameOverlay) {
                window.currentGameOverlay.destroy();
                window.currentGameOverlay = null;
            }
        }
    });
    
    // Lắng nghe sự kiện đóng iframe ngay lập tức
    window.addEventListener('closeIframe', function() {
        // Xóa iframe và button khỏi DOM
        document.body.removeChild(iframeElement);
        document.body.removeChild(htmlCloseButton);
        
        // Tiếp tục trò chơi chính
        if (scene.timerEvent) scene.timerEvent.paused = false;
        scene.isImageOpen = false;
        
        // Xóa overlay
        if (window.currentGameOverlay) {
            window.currentGameOverlay.destroy();
            window.currentGameOverlay = null;
        }
        
        // Xóa event listener
        window.removeEventListener('message', messageHandler);
    });
}
