// 游戏状态管理
const gameState = {
    currentGame: 1,
    completedGames: [],
    gameConfigs: [
        { id: 1, title: "跳跃恐龙", desc: "按空格键或点击屏幕跳跃，躲避障碍物", unlocked: true },
        { id: 2, title: "贪吃蛇", desc: "控制蛇吃到足够的食物获胜", unlocked: false },
        { id: 3, title: "羽毛球", desc: "在正确的时机点击按钮", unlocked: false },
        { id: 4, title: "数独", desc: "解开所有的谜题", unlocked: false }
    ],

    init() {
        this.loadProgress();
        this.updateUnlockStatus();
        this.updateGameGrid();
        this.setupUnlockCode();
    },

    loadProgress() {
        const savedProgress = localStorage.getItem('gameProgress');
        if (savedProgress) {
            this.completedGames = JSON.parse(savedProgress);
            this.updateUnlockStatus();
        }
    },

    updateUnlockStatus() {
        // 根据完成的游戏解锁下一个游戏
        this.gameConfigs.forEach((game, index) => {
            if (index === 0) return; // 第一个游戏始终解锁
            game.unlocked = this.completedGames.includes(index); // 前一个游戏完成才解锁
        });
    },

    saveProgress() {
        localStorage.setItem('gameProgress', JSON.stringify(this.completedGames));
    },

    updateGameGrid() {
        const gameGrid = document.querySelector('.game-grid');
        gameGrid.innerHTML = '';

        this.gameConfigs.forEach(game => {
            const isCompleted = this.completedGames.includes(game.id);
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            if (!game.unlocked) {
                gameCard.classList.add('locked');
            }
            if (isCompleted) {
                gameCard.classList.add('completed');
            }
            
            gameCard.dataset.game = game.id;
            
            gameCard.innerHTML = `
                <h2>游戏 ${game.id}</h2>
                <p>${game.title}</p>
                <p class="game-desc">${game.desc}</p>
                ${isCompleted ? '<div class="completed-badge">✓ 已完成</div>' : ''}
                ${!game.unlocked ? '<div class="locked-badge">🔒 需要完成前一个游戏</div>' : ''}
                <button onclick="startGame(${game.id})" 
                    ${!game.unlocked ? 'disabled' : ''}>
                    ${isCompleted ? '重玩' : '开始游戏'}
                </button>
            `;
            
            gameGrid.appendChild(gameCard);
        });

        // 修改查看祝贺卡片按钮的显示逻辑
        if (this.completedGames.length === this.gameConfigs.length) {  // 只有完成所有游戏才显示
            const viewCardBtn = document.createElement('button');
            viewCardBtn.className = 'view-card-btn';
            viewCardBtn.innerHTML = '🎉 查看生日贺卡';
            viewCardBtn.onclick = () => this.showVictory();
            document.querySelector('.container').appendChild(viewCardBtn);
        }
    },

    completeGame(gameId) {
        if (!this.completedGames.includes(gameId)) {
            this.completedGames.push(gameId);
            this.saveProgress();
            this.updateUnlockStatus();
        }

        setTimeout(() => {
            document.querySelector('.game-container').innerHTML = `
                <div class="game-result">
                    <h2>恭喜通过！</h2>
                    <p>${this.completedGames.length === this.gameConfigs.length ? 
                        '太棒了！你已经完成了所有游戏，快去查看生日贺卡吧！' : 
                        '返回主页继续挑战其他游戏吧！'}</p>
                    <button onclick="window.location.reload()">返回主页</button>
                </div>
            `;
        }, 1000);
    },

    resetProgress() {
        // 添加确认对话框
        const confirmReset = confirm('确定要清空所有游戏进度吗？');
        if (!confirmReset) return;

        // 添加重置动画效果
        const gameCards = document.querySelectorAll('.game-card');
        gameCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('resetting');
            }, index * 200);
        });

        // 延迟执行实际的重置操作
        setTimeout(() => {
            // 清除本地存储
            localStorage.removeItem('gameProgress');
            this.completedGames = [];
            
            // 重置解锁状态
            this.gameConfigs.forEach((game, index) => {
                game.unlocked = index === 0; // 只保持第一个游戏解锁
            });

            // 更新界面
            this.updateGameGrid();

            // 显示提示消息
            const message = document.createElement('div');
            message.className = 'reset-message';
            message.textContent = '游戏进度已重置！';
            document.body.appendChild(message);

            // 自动移除提示消息
            setTimeout(() => {
                message.classList.add('fade-out');
                setTimeout(() => message.remove(), 500);
            }, 2000);
        }, gameCards.length * 200 + 500);
    },

    showVictory() {
        // 创建遮罩层和祝贺卡片
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';
        
        const card = document.createElement('div');
        card.className = 'victory-popup';
        card.innerHTML = `
            <div class="fireworks"></div>
            <div class="birthday-card">
                <h1>🎉 恭喜你完成所有游戏！ 🎉</h1>
                <div class="cake">
                    <div class="candle">
                        <div class="flame"></div>
                    </div>
                </div>
                <div class="message">
                    <p>生日快乐！</p>
                    <p>愿你永远保持快乐，永远年轻！</p>
                    <div class="special-message" style="display: none;">
                        <p>这是给你的特别礼物...</p>
                        <p class="gift-text"></p>
                    </div>
                </div>
                <button class="reveal-btn">查看特别礼物</button>
                <button class="close-btn">关闭</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(card);

        // 添加烟花效果
        function createFirework() {
            const fireworks = card.querySelector('.fireworks');
            const colors = ['#ff0', '#f0f', '#0ff', '#ff4081', '#1a73e8'];
            
            const firework = document.createElement('div');
            firework.className = 'firework';
            firework.style.left = Math.random() * 100 + '%';
            firework.style.top = Math.random() * 100 + '%';
            firework.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            fireworks.appendChild(firework);
            
            setTimeout(() => firework.remove(), 1000);
        }

        const fireworkInterval = setInterval(createFirework, 300);

        // 礼物显示逻辑
        const revealBtn = card.querySelector('.reveal-btn');
        const specialMessage = card.querySelector('.special-message');
        const giftText = card.querySelector('.gift-text');
        const closeBtn = card.querySelector('.close-btn');
        
        revealBtn.addEventListener('click', () => {
            specialMessage.style.display = 'block';
            revealBtn.style.display = 'none';
            closeBtn.style.display = 'none';
            
            const message = "愿你在新的一年里开心快乐，心想事成！永远保持年轻的心态，充满活力地迎接每一天！";
            
            let index = 0;
            giftText.style.opacity = '1';
            giftText.style.transform = 'translateY(0)';
            
            const typeWriter = setInterval(() => {
                giftText.textContent = message.slice(0, index);
                index++;
                
                if (index > message.length) {
                    clearInterval(typeWriter);
                    closeBtn.style.display = 'block';
                    closeBtn.style.animation = 'fadeIn 0.5s ease forwards';
                }
            }, 100);
        });

        // 关闭按钮逻辑
        closeBtn.addEventListener('click', () => {
            clearInterval(fireworkInterval);
            overlay.remove();
            card.remove();
        });
    },

    setupUnlockCode() {
        // 创建密码输入框
        const unlockContainer = document.createElement('div');
        unlockContainer.className = 'unlock-code-container';
        unlockContainer.innerHTML = `
            <label for="unlockCode">🎁 输入生日密码</label>
            <div class="input-group">
                <input type="text" id="unlockCode" placeholder="输入密码解锁全部游戏" autocomplete="off">
                <button id="unlockButton">确认</button>
            </div>
            <div class="hint">提示：生日+名字拼音</div>
        `;
        document.body.appendChild(unlockContainer);

        const input = unlockContainer.querySelector('input');
        const button = unlockContainer.querySelector('button');
        const unlockCode = '20080125zichong';

        // 检查密码函数
        const checkPassword = () => {
            const inputValue = input.value.toLowerCase();
            
            if (inputValue === unlockCode) {
                // 解锁所有游戏
                this.gameConfigs.forEach(game => {
                    game.unlocked = true;
                    if (!this.completedGames.includes(game.id)) {
                        this.completeGame(game.id);
                    }
                });
                
                // 更新显示
                this.updateGameGrid();
                
                // 显示成功提示
                const notification = document.createElement('div');
                notification.className = 'unlock-notification';
                notification.textContent = '🎉 生日快乐！所有游戏已解锁！';
                document.body.appendChild(notification);
                
                // 3秒后移除提示
                setTimeout(() => {
                    notification.remove();
                }, 3000);
                
                // 清空输入
                input.value = '';
                
                // 禁用输入框和按钮
                input.disabled = true;
                button.disabled = true;
                unlockContainer.style.opacity = '0.7';
                unlockContainer.querySelector('.hint').textContent = '已全部解锁！';
            } else if (inputValue !== '') {
                // 显示错误提示
                input.style.borderColor = '#ff4444';
                input.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    input.style.borderColor = 'transparent';
                    input.style.animation = '';
                }, 500);
            }
        };

        // 绑定事件
        button.addEventListener('click', checkPassword);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });

        // 检查是否已经全部解锁
        const allUnlocked = this.gameConfigs.every(game => game.unlocked);
        if (allUnlocked) {
            input.disabled = true;
            button.disabled = true;
            unlockContainer.style.opacity = '0.7';
            unlockContainer.querySelector('.hint').textContent = '已全部解锁！';
        }
    }
};

function startGame(gameId) {
    // 检查游戏是否解锁
    const game = gameState.gameConfigs.find(g => g.id === gameId);
    if (!game.unlocked) {
        alert('请先完成前一个游戏！');
        return;
    }

    // 清除之前的游戏脚本（如果存在）
    const oldScript = document.querySelector(`script[data-game="${gameId}"]`);
    if (oldScript) {
        oldScript.remove();
    }

    // 创建新的脚本标签
    const script = document.createElement('script');
    script.src = `js/game${gameId}.js`;
    script.setAttribute('data-game', gameId);
    
    // 添加加载事件监听器
    script.onload = () => {
        console.log(`游戏 ${gameId} 脚本加载完成`);
    };
    
    script.onerror = (error) => {
        console.error(`游戏 ${gameId} 脚本加载失败:`, error);
    };

    document.body.appendChild(script);
}

function returnToGame() {
    // 重新创建初始HTML结构
    document.body.innerHTML = `
        <div class="container">
            <header>
                <h1>🎉 欢迎来到生日惊喜游戏！ 🎉</h1>
                <p>完成所有游戏，获得特别的惊喜！</p>
            </header>
            <main>
                <div class="game-grid"></div>
            </main>
            <div class="decoration cake-icon">🎂</div>
        </div>
        <button class="reset-progress" onclick="gameState.resetProgress()">重置进度</button>
    `;

    // 重新初始化游戏状态
    gameState.init();

    // 添加装饰元素
    const balloons = ['🎈', '🎈', '🎈', '🎈'];
    balloons.forEach((balloon, index) => {
        const div = document.createElement('div');
        div.className = 'balloon';
        div.style.top = `${10 + index * 5}%`;
        div.textContent = balloon;
        document.body.appendChild(div);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    gameState.init();
}); 