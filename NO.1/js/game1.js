class DinoGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.dino = {
            x: 50,
            y: 0,
            width: 40,
            height: 40,
            velocity: 0,
            jumping: false,
            doubleJump: false
        };
        this.groundY = 300;
        this.jumpForce = -18;
        this.gravity = 1;
        this.score = 0;
        this.targetScore = 30;
        this.gameSpeed = 8;
        this.speedIncrease = 0.3;
        this.minObstacleInterval = 800;
        this.maxObstacleInterval = 2000;
        this.lastObstacleTime = 0;
        this.isGameActive = false;
        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        this.coinCount = 0;
        this.jumpSound = new Audio('sounds/jump.mp3');
        this.coinSound = new Audio('sounds/coin.mp3');
        this.colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
        this.gameLoop = null;
        this.spawnInterval = null;
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.update = this.update.bind(this);
        this.backgroundObjects = [];
        this.dinoSprite = {
            frame: 0,
            frameCount: 2,
            animationSpeed: 0.2,
            width: 60,
            height: 60
        };
        this.isDebug = false;  // 设置为 true 可以看到碰撞箱
    }

    resetGameState() {
        this.score = 0;
        this.gameSpeed = 8;
        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        this.coinCount = 0;
        this.dino = {
            x: 50,
            y: this.groundY - 40,  // 直接设置正确的初始位置
            width: 40,
            height: 40,
            velocity: 0,
            jumping: false,
            doubleJump: false
        };
        this.backgroundObjects = [];
        this.isGameActive = false;
        this.lastObstacleTime = 0;
    }

    init() {
        document.querySelector('.container').innerHTML = `
            <div class="game-container">
                <div class="game-info">
                    <h2>游戏 1: 跳跃恐龙</h2>
                    <p>按空格键或点击屏幕跳跃（可二段跳），躲避障碍物并收集金币！</p>
                    <div class="stats">
                        <span>得分: <span id="score">0</span>/${this.targetScore}</span>
                        <span>金币: <span id="coins">0</span></span>
                        <span>速度: <span id="speed">0</span></span>
                    </div>
                </div>
                <canvas id="gameCanvas" width="800" height="400"></canvas>
                <button id="startButton">点击或按空格键开始</button>
            </div>
        `;

        // 初始化画布
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // 移动设备适配
        if (window.innerWidth <= 768) {
            this.canvas.width = 320;
            this.canvas.height = 200;
            this.groundY = 150;
            this.dino.width = 30;
            this.dino.height = 30;
        }

        // 重置游戏状态
        this.resetGameState();

        // 绑定开始按钮事件
        const startButton = document.getElementById('startButton');
        startButton.addEventListener('click', () => this.startGame());
        
        // 绑定空格键事件（只用于开始游戏）
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isGameActive) {
                e.preventDefault();
                this.startGame();
            }
        });

        // 绘制初始画面
        this.draw();
    }

    handleKeydown(e) {
        if (!this.isGameActive || e.code !== 'Space') return;
        
        e.preventDefault(); // 防止页面滚动
        this.jump();
    }

    handleClick() {
        if (!this.isGameActive) return;
        this.jump();
    }

    jump() {
        if (!this.dino.jumping) {
            this.dino.jumping = true;
            this.dino.velocity = this.jumpForce;
            this.jumpSound.play().catch(() => {});
            this.createParticles(this.dino.x, this.dino.y + this.dino.height, '#fff');
        } else if (!this.dino.doubleJump) {
            this.dino.doubleJump = true;
            this.dino.velocity = this.jumpForce * 0.8;
            this.jumpSound.play().catch(() => {});
            this.createParticles(this.dino.x, this.dino.y + this.dino.height, '#fff');
        }
    }

    startGame() {
        if (this.isGameActive) return;

        // 隐藏开始按钮
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.style.display = 'none';
        }

        // 重置游戏状态
        this.resetGameState();
        this.isGameActive = true;

        // 绑定控制事件
        document.addEventListener('keydown', this.handleKeydown);
        this.canvas.addEventListener('click', this.handleClick);

        // 移除固定间隔生成障碍物，改用动态生成
        this.lastObstacleTime = performance.now();
        this.gameLoop = requestAnimationFrame(this.update);

        // 更新显示
        document.getElementById('score').textContent = '0';
        document.getElementById('coins').textContent = '0';
    }

    spawnObstacle() {
        // 检查最后一个障碍物的位置
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        if (lastObstacle && lastObstacle.x > this.canvas.width - 200) {
            return; // 如果最后一个障碍物还太靠右，就不生成新的
        }

        // 随机生成不同类型的障碍物
        const types = [
            { width: 20, height: 40, y: this.groundY - 40 },  // 普通障碍物
            { width: 40, height: 20, y: this.groundY - 20 },  // 矮胖障碍物
            { width: 15, height: 60, y: this.groundY - 60 },  // 高瘦障碍物
        ];
        
        const type = types[Math.floor(Math.random() * types.length)];
        const obstacle = {
            x: this.canvas.width,
            y: type.y,
            width: type.width,
            height: type.height,
            counted: false
        };
        
        // 修改连续障碍物的生成逻辑
        if (Math.random() < 0.3 && this.score > 10) {
            const gap = Math.random() * 150 + 150;  // 增加间距到 150-300
            const obstacle2 = { ...obstacle };
            obstacle2.x += gap;
            this.obstacles.push(obstacle2);
        }
        
        this.obstacles.push(obstacle);
    }

    spawnCoin() {
        if (Math.random() < 0.3) {  // 30%概率生成金币
            const coin = {
                x: this.canvas.width,
                y: Math.random() * (this.groundY - 100) + 50,  // 随机高度
                width: 20,
                height: 20,
                rotation: 0,
                collected: false
            };
            this.coins.push(coin);
        }
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: Math.random() * 4 + 2,
                color: color || this.colors[Math.floor(Math.random() * this.colors.length)],
                life: 1
            });
        }
    }

    update() {
        if (!this.isGameActive) return;

        const currentTime = performance.now();
        // 动态生成障碍物
        if (currentTime - this.lastObstacleTime >= this.getObstacleInterval()) {
            this.spawnObstacle();
            this.lastObstacleTime = currentTime;
        }

        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 更新恐龙位置
        this.dino.velocity += this.gravity;
        this.dino.y += this.dino.velocity;

        if (this.dino.y > this.groundY - this.dino.height) {
            this.dino.y = this.groundY - this.dino.height;
            this.dino.velocity = 0;
            this.dino.jumping = false;
            this.dino.doubleJump = false;
        }

        // 更新和检查障碍物
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.x -= this.gameSpeed;

            if (obstacle.x + obstacle.width < this.dino.x && !obstacle.counted) {
                obstacle.counted = true;
                this.score++;
                // 增加游戏速度
                this.gameSpeed += this.speedIncrease;
                document.getElementById('score').textContent = this.score;
            }

            return obstacle.x + obstacle.width > 0;
        });

        // 更新金币
        this.coins = this.coins.filter(coin => {
            coin.x -= this.gameSpeed;
            coin.rotation += 0.1;  // 旋转效果

            // 检查收集
            if (!coin.collected && this.checkCoinCollision(coin)) {
                coin.collected = true;
                this.coinCount++;
                this.coinSound.play();
                this.createParticles(coin.x, coin.y, '#FFD700');
                document.getElementById('coins').textContent = this.coinCount;
                // 金币给予额外得分
                this.score++;
                document.getElementById('score').textContent = this.score;
            }

            return coin.x + coin.width > 0 && !coin.collected;
        });

        // 更新粒子
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            return particle.life > 0;
        });

        // 随机生成金币
        if (Math.random() < 0.02) {  // 2%概率每帧生成金币
            this.spawnCoin();
        }

        // 绘制所有游戏元素
        this.draw();

        // 检查碰撞
        if (this.checkCollisions()) {
            this.gameOver(false);
            return;
        }

        // 检查胜利
        if (this.score >= this.targetScore) {
            this.gameOver(true);
            return;
        }

        // 继续游戏循环
        this.gameLoop = requestAnimationFrame(this.update);
    }

    drawDino() {
        this.ctx.fillStyle = '#333';
        
        // 基础恐龙形状
        this.ctx.fillRect(this.dino.x, this.dino.y, this.dino.width, this.dino.height);
        
        // 添加眼睛
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(
            this.dino.x + this.dino.width * 0.7,
            this.dino.y + this.dino.height * 0.2,
            this.dino.width * 0.2,
            this.dino.height * 0.2
        );

        // 如果在跳跃中，显示不同的姿势
        if (this.dino.jumping || this.dino.doubleJump) {
            // 弯曲的腿部
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(
                this.dino.x + this.dino.width * 0.2,
                this.dino.y + this.dino.height * 0.8,
                this.dino.width * 0.3,
                this.dino.height * 0.2
            );
        } else {
            // 奔跑动画
            this.dinoSprite.frame += this.dinoSprite.animationSpeed;
            if (this.dinoSprite.frame >= this.dinoSprite.frameCount) {
                this.dinoSprite.frame = 0;
            }

            const legOffset = Math.sin(this.dinoSprite.frame * Math.PI) * 5;
            
            // 左腿
            this.ctx.fillRect(
                this.dino.x + this.dino.width * 0.2,
                this.dino.y + this.dino.height * 0.8 + legOffset,
                this.dino.width * 0.2,
                this.dino.height * 0.2
            );
            
            // 右腿
            this.ctx.fillRect(
                this.dino.x + this.dino.width * 0.6,
                this.dino.y + this.dino.height * 0.8 - legOffset,
                this.dino.width * 0.2,
                this.dino.height * 0.2
            );
        }
    }

    updateBackground() {
        this.backgroundObjects.forEach(obj => {
            if (obj.type === 'cloud') {
                obj.x -= obj.speed;
                if (obj.x + 50 < 0) {
                    obj.x = this.canvas.width;
                    obj.y = Math.random() * (this.groundY / 2);
                }
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(obj.x, obj.y, 20, 0, Math.PI * 2);
                this.ctx.arc(obj.x + 15, obj.y - 10, 15, 0, Math.PI * 2);
                this.ctx.arc(obj.x + 30, obj.y, 20, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    checkCollisions() {
        // 缩小碰撞箱的大小，使判定更精确
        const hitboxPadding = 5;  // 碰撞箱缩小的像素值
        const dinoHitbox = {
            x: this.dino.x + hitboxPadding,
            y: this.dino.y + hitboxPadding,
            width: this.dino.width - (hitboxPadding * 2),
            height: this.dino.height - (hitboxPadding * 2)
        };

        return this.obstacles.some(obstacle => {
            // 同样缩小障碍物的碰撞箱
            const obstacleHitbox = {
                x: obstacle.x + hitboxPadding,
                y: obstacle.y + hitboxPadding,
                width: obstacle.width - (hitboxPadding * 2),
                height: obstacle.height - (hitboxPadding * 2)
            };

            // 使用更精确的碰撞检测
            const collision = (
                dinoHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
                dinoHitbox.x + dinoHitbox.width > obstacleHitbox.x &&
                dinoHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
                dinoHitbox.y + dinoHitbox.height > obstacleHitbox.y
            );

            // 调试用：绘制碰撞箱（可选）
            if (this.isDebug) {
                this.ctx.strokeStyle = collision ? 'red' : 'green';
                this.ctx.strokeRect(
                    dinoHitbox.x,
                    dinoHitbox.y,
                    dinoHitbox.width,
                    dinoHitbox.height
                );
                this.ctx.strokeRect(
                    obstacleHitbox.x,
                    obstacleHitbox.y,
                    obstacleHitbox.width,
                    obstacleHitbox.height
                );
            }

            return collision;
        });
    }

    checkCoinCollision(coin) {
        return (
            this.dino.x < coin.x + coin.width &&
            this.dino.x + this.dino.width > coin.x &&
            this.dino.y < coin.y + coin.height &&
            this.dino.y + this.dino.height > coin.y
        );
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制地面
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.canvas.width, this.groundY);
        this.ctx.strokeStyle = '#333';
        this.ctx.stroke();

        // 绘制恐龙（添加动画）
        this.drawDino();

        // 绘制障碍物
        this.obstacles.forEach(obstacle => {
            this.ctx.fillStyle = '#ff4081';
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });

        // 绘制金币
        this.coins.forEach(coin => {
            this.ctx.save();
            this.ctx.translate(coin.x + coin.width/2, coin.y + coin.height/2);
            this.ctx.rotate(coin.rotation);
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(-coin.width/2, -coin.height/2, coin.width/2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // 绘制粒子
        this.particles.forEach(particle => {
            this.ctx.fillStyle = `rgba(${hexToRgb(particle.color)}, ${particle.life})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 更新速度显示（修复重复显示问题）
        document.getElementById('speed').textContent = this.gameSpeed.toFixed(1);
    }

    cleanup() {
        if (!this.isGameActive) return;
        
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        
        // 移除控制事件
        document.removeEventListener('keydown', this.handleKeydown);
        if (this.canvas) {
            this.canvas.removeEventListener('click', this.handleClick);
        }
        
        this.isGameActive = false;
    }

    gameOver(won) {
        this.cleanup();
        
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }

        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.innerHTML = `
                <div class="game-result">
                    <h2>${won ? '恭喜通过！' : '游戏失败'}</h2>
                    <p>${won ? '你成功完成了跳跃恐龙游戏！' : '再试一次吧！'}</p>
                    <button onclick="restartGame()">${won ? '重新开始' : '重试'}</button>
                </div>
            `;
        }

        if (won) {
            gameState.completeGame(1);
        }
    }

    updateDisplay() {
        const scoreElement = document.getElementById('score');
        const speedElement = document.getElementById('speed');
        
        if (scoreElement) scoreElement.textContent = '0';
        if (speedElement) speedElement.textContent = this.gameSpeed.toFixed(1);
    }

    getObstacleInterval() {
        // 根据分数动态调整障碍物生成间隔
        const decrease = Math.min(this.score * 30, 800); // 调整生成间隔的减少速度
        return Math.max(
            this.minObstacleInterval,
            this.maxObstacleInterval - decrease
        );
    }
}

// 辅助函数：将十六进制颜色转换为RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
        : '255, 255, 255';
}

// 将游戏实例放在全局作用域
let currentGame;

// 添加重启游戏函数
function restartGame() {
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        // 重新创建游戏HTML结构
        gameContainer.innerHTML = `
            <div class="game-info">
                <h2>游戏 1: 跳跃恐龙</h2>
                <p>按空格键或点击屏幕跳跃（可二段跳），躲避障碍物！</p>
                <div class="stats">
                    <span>得分: <span id="score">0</span>/${currentGame ? currentGame.targetScore : 30}</span>
                    <span>速度: <span id="speed">0</span></span>
                </div>
            </div>
            <canvas id="gameCanvas" width="800" height="400"></canvas>
        `;

        // 创建新的游戏实例并直接开始游戏
        currentGame = new DinoGame();
        currentGame.init();
        currentGame.startGame();  // 直接开始游戏，不显示开始按钮
    }
}

// 修改初始化代码
function initGame() {
    currentGame = new DinoGame();
    currentGame.init();
}

// 初始化游戏
initGame(); 
game.init(); 