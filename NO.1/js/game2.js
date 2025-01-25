class SnakeGame {
    constructor() {
        this.gridSize = 20;
        this.tileCount = 20;
        this.tileSize = 20;
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.food = null;
        this.powerUp = null; // 特殊食物
        this.direction = { x: 1, y: 0 };
        this.speed = 120;
        this.score = 0;
        this.targetScore = 15;
        this.gameLoop = null;
        this.isMobile = window.innerWidth <= 768;
        this.gameStarted = false;
        this.speedIncrease = true;
        this.baseSpeed = 120;
        this.minSpeed = 60;
        this.obstacles = [];
        this.effects = {
            speedBoost: false,
            invincible: false,
            rainbow: false
        };
        this.effectTimer = null;
    }

    init() {
        document.querySelector('.container').innerHTML = `
            <div class="game-container">
                <div class="game-info">
                    <h2>游戏 2: 贪吃蛇</h2>
                    <p>用${this.isMobile ? '方向按钮' : '方向键'}控制蛇移动，吃到${this.targetScore}个食物获胜！</p>
                    <div class="stats">
                        <span>得分: <span id="score">0</span>/${this.targetScore}</span>
                    </div>
                </div>
                <canvas id="gameCanvas" width="400" height="400"></canvas>
                ${this.isMobile ? `
                    <div class="mobile-controls">
                        <div class="control-row">
                            <button class="control-btn" data-dir="up">↑</button>
                        </div>
                        <div class="control-row">
                            <button class="control-btn" data-dir="left">←</button>
                            <button class="control-btn" data-dir="right">→</button>
                        </div>
                        <div class="control-row">
                            <button class="control-btn" data-dir="down">↓</button>
                        </div>
                    </div>
                ` : ''}
                <button id="startButton">点击或按空格键开始</button>
            </div>
        `;

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (this.isMobile) {
            this.canvas.width = 300;
            this.canvas.height = 300;
            this.tileSize = 15;
        }

        this.bindControls();
        document.getElementById('startButton').addEventListener('click', () => {
            if (!this.gameStarted) {
                this.startGame();
            }
        });

        // 添加空格键开始游戏功能
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                const startButton = document.getElementById('startButton');
                if (startButton && startButton.style.display !== 'none' && !this.gameStarted) {
                    this.startGame();
                }
            }
        });

        // 初始绘制
        this.draw();
        this.generateFood(); // 确保游戏开始时有食物
    }

    startGame() {
        this.gameStarted = true;
        document.getElementById('startButton').style.display = 'none';
        this.generateObstacles();
        this.gameLoop = setInterval(() => this.update(), this.speed);
    }

    bindControls() {
        const handleDirection = (dir) => {
            if (!this.gameStarted) return;
            
            switch(dir) {
                case 'up':
                    if (this.direction.y !== 1) {
                        this.direction = { x: 0, y: -1 };
                    }
                    break;
                case 'down':
                    if (this.direction.y !== -1) {
                        this.direction = { x: 0, y: 1 };
                    }
                    break;
                case 'left':
                    if (this.direction.x !== 1) {
                        this.direction = { x: -1, y: 0 };
                    }
                    break;
                case 'right':
                    if (this.direction.x !== -1) {
                        this.direction = { x: 1, y: 0 };
                    }
                    break;
            }
        };

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            const key = e.key.replace('Arrow', '').toLowerCase();
            if (['up', 'down', 'left', 'right'].includes(key)) {
                handleDirection(key);
            }
        });

        // 移动端控制
        if (this.isMobile) {
            document.querySelectorAll('.control-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    handleDirection(btn.dataset.dir);
                });
            });
        }
    }

    update() {
        const newHead = {
            x: (this.snake[0].x + this.direction.x + this.tileCount) % this.tileCount,
            y: (this.snake[0].y + this.direction.y + this.tileCount) % this.tileCount
        };

        // 只在非无敌状态下检查碰撞
        if (!this.effects.invincible && this.checkCollision(newHead)) {
            this.gameLose();
            return;
        }

        this.snake.unshift(newHead);

        // 检查是否吃到食物
        let ate = false;
        if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score++;
            document.getElementById('score').textContent = this.score;
            this.generateFood();
            ate = true;
        }

        // 检查是否吃到特殊食物
        if (this.powerUp && newHead.x === this.powerUp.x && newHead.y === this.powerUp.y) {
            this.activateEffect(this.powerUp.type);
            this.powerUp = null;
            ate = true;
        }

        if (!ate) {
            this.snake.pop();
        }

        if (this.score >= this.targetScore) {
            this.gameWin();
            return;
        }

        this.draw();
    }

    checkCollision(head) {
        // 检查自身碰撞
        const selfCollision = this.snake.some((segment, index) => 
            index !== 0 && segment.x === head.x && segment.y === head.y
        );
        
        // 检查障碍物碰撞
        const obstacleCollision = this.obstacles.some(obstacle => 
            obstacle.x === head.x && obstacle.y === head.y
        );
        
        return selfCollision || obstacleCollision;
    }

    generateFood() {
        do {
            this.food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount),
                type: 'normal'
            };
        } while (
            this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y) ||
            this.obstacles.some(obstacle => obstacle.x === this.food.x && obstacle.y === this.food.y)
        );

        // 20%概率生成特殊食物
        if (Math.random() < 0.2 && !this.powerUp) {
            this.generatePowerUp();
        }
    }

    generatePowerUp() {
        const types = ['speed', 'invincible', 'rainbow'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        do {
            this.powerUp = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount),
                type: type
            };
        } while (
            this.snake.some(segment => segment.x === this.powerUp.x && segment.y === this.powerUp.y) ||
            this.obstacles.some(obstacle => obstacle.x === this.powerUp.x && obstacle.y === this.powerUp.y) ||
            (this.food && this.powerUp.x === this.food.x && this.powerUp.y === this.food.y)
        );
    }

    activateEffect(type) {
        clearTimeout(this.effectTimer);
        
        switch(type) {
            case 'speed':
                this.effects.speedBoost = true;
                this.speed = this.speed / 2;
                this.effectTimer = setTimeout(() => {
                    this.effects.speedBoost = false;
                    this.speed = this.speed * 2;
                }, 5000);
                break;
            case 'invincible':
                this.effects.invincible = true;
                this.effectTimer = setTimeout(() => {
                    this.effects.invincible = false;
                }, 5000);
                break;
            case 'rainbow':
                this.effects.rainbow = true;
                this.effectTimer = setTimeout(() => {
                    this.effects.rainbow = false;
                }, 5000);
                break;
        }
    }

    generateObstacles() {
        // 生成固定障碍物
        const obstacleCount = 8;
        for (let i = 0; i < obstacleCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.tileCount);
                y = Math.floor(Math.random() * this.tileCount);
            } while (
                this.snake.some(segment => segment.x === x && segment.y === y) ||
                (this.food && this.food.x === x && this.food.y === y) ||
                (this.powerUp && this.powerUp.x === x && this.powerUp.y === y)
            );
            this.obstacles.push({ x, y });
        }
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 画网格
        this.ctx.strokeStyle = '#ddd';
        for (let i = 0; i < this.tileCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.tileSize, 0);
            this.ctx.lineTo(i * this.tileSize, this.canvas.height);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.tileSize);
            this.ctx.lineTo(this.canvas.width, i * this.tileSize);
            this.ctx.stroke();
        }

        // 画蛇
        this.snake.forEach((segment, index) => {
            if (this.effects.rainbow) {
                // 彩虹效果
                const hue = (index * 30 + Date.now() / 50) % 360;
                this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            } else {
                this.ctx.fillStyle = this.effects.invincible ? '#ffd700' : '#4CAF50';
            }
            this.ctx.fillRect(
                segment.x * this.tileSize,
                segment.y * this.tileSize,
                this.tileSize - 2,
                this.tileSize - 2
            );
        });

        // 画食物
        if (this.food) {
            this.ctx.fillStyle = '#ff4081';
            this.ctx.fillRect(
                this.food.x * this.tileSize,
                this.food.y * this.tileSize,
                this.tileSize - 2,
                this.tileSize - 2
            );
        }

        // 画特殊食物
        if (this.powerUp) {
            const colors = {
                speed: '#00ff00',
                invincible: '#ffd700',
                rainbow: '#ff00ff'
            };
            this.ctx.fillStyle = colors[this.powerUp.type];
            this.ctx.beginPath();
            this.ctx.arc(
                this.powerUp.x * this.tileSize + this.tileSize/2,
                this.powerUp.y * this.tileSize + this.tileSize/2,
                this.tileSize/2 - 2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }

        // 画障碍物
        this.ctx.fillStyle = '#ff6b6b';
        this.obstacles.forEach(obstacle => {
            this.ctx.fillRect(
                obstacle.x * this.tileSize,
                obstacle.y * this.tileSize,
                this.tileSize - 2,
                this.tileSize - 2
            );
        });

        // 显示当前效果状态
        this.ctx.fillStyle = '#666';
        this.ctx.font = '14px Arial';
        let y = 20;
        if (this.effects.speedBoost) {
            this.ctx.fillText('加速中！', 10, y);
            y += 20;
        }
        if (this.effects.invincible) {
            this.ctx.fillText('无敌中！', 10, y);
            y += 20;
        }
        if (this.effects.rainbow) {
            this.ctx.fillText('彩虹模式！', 10, y);
        }
    }

    gameWin() {
        clearInterval(this.gameLoop);
        gameState.completeGame(2);
        this.showResult(true);
    }

    gameLose() {
        clearInterval(this.gameLoop);
        this.showResult(false);
    }

    showResult(won) {
        this.canvas.style.display = 'none';
        this.gameOver(won);
    }

    gameOver(won) {
        clearInterval(this.gameLoop);
        setTimeout(() => {
            const message = won ? 
                '恭喜通过！点击或按空格键重新开始' : 
                '游戏失败！点击或按空格键重试';

            document.querySelector('.game-container').innerHTML = `
                <div class="game-result">
                    <h2>${won ? '恭喜通过！' : '游戏失败'}</h2>
                    <p>${won ? '你成功完成了贪吃蛇游戏！' : '再试一次吧！'}</p>
                    <button id="restartButton">
                        ${won ? '重新开始' : '重试'}
                    </button>
                </div>
            `;

            // 添加空格键重新开始功能
            const restartHandler = (e) => {
                if (e.type === 'click' || (e.type === 'keydown' && e.code === 'Space')) {
                    document.removeEventListener('keydown', restartHandler);
                    location.reload();
                }
            };

            document.getElementById('restartButton').addEventListener('click', restartHandler);
            document.addEventListener('keydown', restartHandler);

            if (won) {
                gameState.completeGame(2);
            }
        }, 500);
    }
}

// 启动游戏
new SnakeGame().init(); 