class BadmintonGame {
    constructor() {
        this.player = {
            x: 100,
            y: 300,
            width: 30,
            height: 60,
            speed: 8,
            jumping: false,
            velocity: 0,
            score: 0,
            movingLeft: false,
            movingRight: false,
            racket: {
                length: 40,
                angle: -45,
                swinging: false,
                swingSpeed: 20,
                swingAngle: 0,
                maxSwingAngle: 120,
                mouseX: 0,
                mouseY: 0,
                hitPoint: { x: 0, y: 0 },
                hitStrength: 1.0  // 添加击球力度控制
            }
        };

        this.ai = {
            x: 650,
            y: 300,
            width: 30,
            height: 60,
            speed: 8,
            jumping: false,
            velocity: 0,
            score: 0,
            reactionDelay: 10,
            racket: {
                length: 40,
                angle: -45,
                swinging: false,
                swingSpeed: 20,
                swingAngle: 0,
                maxSwingAngle: 120,
                hitPoint: { x: 0, y: 0 }
            }
        };
        
        this.shuttle = {
            x: 400,
            y: 100,
            radius: 5,
            speedX: 0,
            speedY: 0,
            gravity: 0.2,      // 增加重力
            drag: 0.001,      // 减小空气阻力
            maxSpeed: 18,     // 增加最大速度
            minSpeed: 5,       // 增加最小速度
            lastHitBy: null,
            hitCooldown: 0,
            isServed: false,
            serveHeight: 150  // 发球高度
        };
        
        this.gravity = 0.5;
        this.jumpForce = -12;
        this.groundY = 350;  // 保持地面高度
        this.targetScore = 11;
        this.gameLoop = null;
        this.gameStarted = false;
        this.net = {
            x: 400,
            y: 250,        // 降低网的起始位置
            width: 5,
            height: 100    // 减小网的高度
        };
        this.serving = true;
        this.playerServe = true;  // 初始发球权给玩家
        this.serveCount = 0;      // 添加发球计数器
    }

    init() {
        document.querySelector('.container').innerHTML = `
            <div class="game-container">
                <div class="game-info">
                    <h2>游戏 3: 火柴人打羽毛球</h2>
                    <p>先得${this.targetScore}分获胜！</p>
                    <div class="controls-info" style="
                        margin: 10px 0;
                        padding: 5px;
                        background: rgba(255,255,255,0.9);
                        border-radius: 5px;
                    ">
                        <p>操作说明：</p>
                        <ul style="list-style: none; padding-left: 10px;">
                            <li>A D : 左右移动</li>
                            <li>W键: 跳跃</li>
                            <li>鼠标移动: 控制球拍</li>
                            <li>鼠标点击: 发球/击球</li>
                            <li>发球规则: 每两球交换发球权</li>
                        </ul>
                    </div>
                    <div class="stats">
                        <span>你: <span id="playerScore">0</span></span>
                        <span style="margin: 0 20px">VS</span>
                        <span>对手: <span id="aiScore">0</span></span>
                        <div id="serveIndicator" style="
                            margin-top: 5px;
                            font-size: 14px;
                            color: #666;
                        "></div>
                    </div>
                </div>
                <canvas id="gameCanvas" width="800" height="400"></canvas>
                <button id="startButton">开始游戏</button>
            </div>
        `;

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 移动设备适配
        if (window.innerWidth <= 768) {
            this.canvas.width = 320;
            this.canvas.height = 400;
            this.player.x = 50;
            this.shuttle.x = 200;
        }

        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });
    }

    startGame() {
        this.gameStarted = true;
        document.getElementById('startButton').style.display = 'none';
        this.bindControls();
        this.prepareServe();
        this.gameLoop = requestAnimationFrame(() => this.update());
    }

    bindControls() {
        // 键盘控制移动和跳跃
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW' && !this.player.jumping) {
                this.jump();
            }
            if (e.code === 'KeyA') {
                this.player.movingLeft = true;
            }
            if (e.code === 'KeyD') {
                this.player.movingRight = true;
            }
        });

        // 键盘松开
        document.addEventListener('keyup', (e) => {
            if (e.code === 'KeyA') {
                this.player.movingLeft = false;
            }
            if (e.code === 'KeyD') {
                this.player.movingRight = false;
            }
        });

        // 改进鼠标控制
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // 更新鼠标位置
            this.player.racket.mouseX = mouseX;
            this.player.racket.mouseY = mouseY;
            
            // 计算球拍角度
            const shoulderX = this.player.x + this.player.width/2;
            const shoulderY = this.player.y + this.player.height*0.3;
            
            const dx = mouseX - shoulderX;
            const dy = mouseY - shoulderY;
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // 限制球拍角度范围，使其更合理
            angle = Math.max(-80, Math.min(60, angle));
            this.player.racket.angle = angle;
            
            // 更新击球点
            const radians = angle * Math.PI / 180;
            this.player.racket.hitPoint = {
                x: shoulderX + Math.cos(radians) * this.player.racket.length,
                y: shoulderY + Math.sin(radians) * this.player.racket.length
            };
        });

        // 修改鼠标点击控制
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.serving && this.playerServe) {
                // 只在点击时发球
                this.serve();
            } else if (!this.player.racket.swinging) {
                // 非发球状态才挥拍
                this.swingRacket('player');
            }
        });

        // 触摸控制
        let touchStartX = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            if (!this.player.jumping) {
                this.jump();
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            const touchX = e.touches[0].clientX;
            const diff = touchX - touchStartX;
            touchStartX = touchX;
            
            const newX = this.player.x + diff;
            if (newX >= 0 && newX <= this.net.x - this.player.width) {
                this.player.x = newX;
            }
        });
    }

    jump() {
        this.player.jumping = true;
        this.player.velocity = this.jumpForce;
    }

    update() {
        // 更新玩家移动
        if (this.player.movingLeft) {
            this.player.x = Math.max(0, this.player.x - this.player.speed);
        }
        if (this.player.movingRight) {
            this.player.x = Math.min(this.net.x - this.player.width, 
                this.player.x + this.player.speed);
        }

        // 更新跳跃
        if (this.player.jumping) {
            this.player.velocity += this.gravity;
            this.player.y += this.player.velocity;

            if (this.player.y >= this.groundY - this.player.height) {
                this.player.y = this.groundY - this.player.height;
                this.player.jumping = false;
                this.player.velocity = 0;
            }
        }

        // 更新AI
        this.updateAI();

        // 更新球拍
        this.updateRacket(this.player);
        this.updateRacket(this.ai);

        // 如果在发球状态，球跟随玩家移动
        if (this.serving && !this.shuttle.isServed) {
            this.shuttle.x = this.player.x + this.player.width + 20;
            this.shuttle.y = this.player.y + this.player.height * 0.3;
        } else {
            // 正常的球物理更新
            if (!this.serving) {
                if (this.shuttle.hitCooldown > 0) {
                    this.shuttle.hitCooldown--;
                }

                this.shuttle.speedY += this.shuttle.gravity;
                this.shuttle.speedX *= (1 - this.shuttle.drag);
                this.shuttle.speedY *= (1 - this.shuttle.drag);

                // 限制球速
                const speed = Math.sqrt(this.shuttle.speedX * this.shuttle.speedX + 
                    this.shuttle.speedY * this.shuttle.speedY);
                if (speed > this.shuttle.maxSpeed) {
                    const ratio = this.shuttle.maxSpeed / speed;
                    this.shuttle.speedX *= ratio;
                    this.shuttle.speedY *= ratio;
                }

                // 更新球位置
                this.shuttle.x += this.shuttle.speedX;
                this.shuttle.y += this.shuttle.speedY;

                // 只保留左右墙壁的反弹
                // 左边界反弹
                if (this.shuttle.x < this.shuttle.radius) {
                    this.shuttle.x = this.shuttle.radius;
                    this.shuttle.speedX = Math.abs(this.shuttle.speedX) * 0.7;  // 减少反弹速度
                }
                // 右边界反弹
                if (this.shuttle.x > this.canvas.width - this.shuttle.radius) {
                    this.shuttle.x = this.canvas.width - this.shuttle.radius;
                    this.shuttle.speedX = -Math.abs(this.shuttle.speedX) * 0.7;
                }
            }
        }

        // 检查击球
        if (this.shuttle.hitCooldown === 0) {
            if (this.checkRacketHit(this.player) && this.shuttle.lastHitBy !== 'player') {
                this.handleRacketHit(this.player, 'player');
            }
            if (this.checkRacketHit(this.ai) && this.shuttle.lastHitBy !== 'ai') {
                this.handleRacketHit(this.ai, 'ai');
            }
        }

        // 检查网的碰撞
        if (this.checkNetCollision()) {
            this.shuttle.speedX *= -0.5;
            this.shuttle.speedY *= 0.8;
        }

        // 检查得分
        if (this.shuttle.y > this.groundY) {
            if (this.shuttle.x < this.net.x) {
                this.ai.score++;
                document.getElementById('aiScore').textContent = this.ai.score;
            } else {
                this.player.score++;
                document.getElementById('playerScore').textContent = this.player.score;
            }
            
            // 每两球交换发球权
            this.serveCount++;
            if (this.serveCount >= 2) {
                this.playerServe = !this.playerServe;
                this.serveCount = 0;
            }
            
            this.prepareServe();
        }

        // 检查胜利条件
        if (this.player.score >= this.targetScore) {
            this.gameWin();
            return;
        } else if (this.ai.score >= this.targetScore) {
            this.gameLose();
            return;
        }

        this.draw();
        this.gameLoop = requestAnimationFrame(() => this.update());
    }

    checkNetCollision() {
        return (
            this.shuttle.x > this.net.x - this.shuttle.radius &&
            this.shuttle.x < this.net.x + this.net.width + this.shuttle.radius &&
            this.shuttle.y > this.net.y &&
            this.shuttle.y < this.net.y + this.net.height
        );
    }

    checkRacketHit(figure) {
        // 扩大击球判定区域
        const hitArea = {
            x: figure.x - 40,
            y: figure.y - 40,
            width: figure.width + 100,
            height: figure.height + 100
        };

        return (
            this.shuttle.x >= hitArea.x &&
            this.shuttle.x <= hitArea.x + hitArea.width &&
            this.shuttle.y >= hitArea.y &&
            this.shuttle.y <= hitArea.y + hitArea.height
        );
    }

    handleRacketHit(figure, who) {
        if (who === 'player') {
            // 玩家击球逻辑
            const hitPoint = figure.racket.hitPoint;
            
            // 计算击球方向，基于鼠标位置
            const dx = this.player.racket.mouseX - hitPoint.x;
            const dy = this.player.racket.mouseY - hitPoint.y;
            let angle = Math.atan2(dy, dx);
            
            // 计算鼠标到击球点的距离，用于确定力度
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 200; // 最大距离参考值
            
            // 根据距离计算力度，距离越远力度越大
            let power = Math.min(distance / maxDistance, 1) * 10 + 6;  // 6-16的力度范围
            
            // 根据球拍的挥动状态增加额外力量
            if (figure.racket.swinging) {
                power *= 1.2;  // 挥拍加成
            }
            
            // 设置球速
            this.shuttle.speedX = Math.cos(angle) * power;
            this.shuttle.speedY = Math.sin(angle) * power;
            
            // 根据击球高度调整
            const hitHeight = this.groundY - this.shuttle.y;
            if (hitHeight > 200) {
                // 高空击球，增加下压力度
                this.shuttle.speedY *= 1.2;
            } else if (hitHeight < 100) {
                // 低空击球，增加上升力
                this.shuttle.speedY -= 2;
            }
            
            // 调整最大速度限制
            const maxVerticalSpeed = 10;    // 降低垂直速度上限
            if (Math.abs(this.shuttle.speedY) > maxVerticalSpeed) {
                this.shuttle.speedY = Math.sign(this.shuttle.speedY) * maxVerticalSpeed;
            }
            
            // 确保球不会太平
            if (Math.abs(this.shuttle.speedY) < 3) {
                this.shuttle.speedY = -3;
            }
            
            // 添加很小的随机性
            this.shuttle.speedX += (Math.random() - 0.5) * 0.2;
            this.shuttle.speedY += (Math.random() - 0.5) * 0.2;
            
            // 调整水平速度限制
            const maxHorizontalSpeed = 12;  // 降低水平速度上限
            if (Math.abs(this.shuttle.speedX) > maxHorizontalSpeed) {
                this.shuttle.speedX = Math.sign(this.shuttle.speedX) * maxHorizontalSpeed;
            }
        } else {
            // 改进AI击球逻辑
            const playerCenter = this.player.x + this.player.width/2;
            // 更智能的目标选择
            const targetX = Math.random() < 0.8 ? 
                (playerCenter < 200 ? 50 : 250) :  // 80%概率瞄准反手
                (Math.random() * 150 + 50);        // 20%概率随机位置
            const targetY = -150;
            
            const dx = targetX - figure.x;
            const dy = targetY;
            const angle = Math.atan2(dy, dx);
            
            // 增加基础力量
            let power = 13;
            const heightFactor = 1 - (this.shuttle.y / this.groundY);
            
            if (this.shuttle.y < this.net.y || this.ai.jumping) {
                // 增强扣杀
                power = 18;
                this.shuttle.speedX = -Math.abs(Math.cos(angle) * power);
                this.shuttle.speedY = Math.abs(Math.sin(angle) * power) * 0.6;
            } else {
                // 更有力的回球
                power = 12 + heightFactor * 4;
                this.shuttle.speedX = Math.cos(angle) * power;
                this.shuttle.speedY = Math.sin(angle) * power;
                
                // 增加战术变化
                if (Math.random() < 0.5) {
                    if (Math.random() < 0.7) {
                        this.shuttle.speedY -= 4; // 快球
                    } else {
                        this.shuttle.speedY += 2; // 高球
                    }
                }
            }

            // 确保球不会太平
            if (Math.abs(this.shuttle.speedY) < 4) {
                this.shuttle.speedY = -4;
            }
            
            // 增加最大垂直速度限制
            if (this.shuttle.speedY < -12) {
                this.shuttle.speedY = -12;
            }

            // 减少随机性，增加准确性
            this.shuttle.speedX += (Math.random() - 0.5) * 0.15;
            this.shuttle.speedY += (Math.random() - 0.5) * 0.15;
        }
        
        this.shuttle.lastHitBy = who;
        this.shuttle.hitCooldown = 5;
    }

    pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    resetRound() {
        // 发球方交替
        const servingRight = (this.player.score + this.ai.score) % 2 === 0;
        this.shuttle.x = servingRight ? this.player.x + 50 : this.ai.x - 50;
        this.shuttle.y = 100;
        this.shuttle.speedX = servingRight ? 3 : -3;
        this.shuttle.speedY = 1;  // 减小初始下落速度
        this.shuttle.lastHitBy = null;
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 画地面
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.canvas.width, this.groundY);
        this.ctx.strokeStyle = '#333';
        this.ctx.stroke();

        // 画网
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(
            this.net.x,
            this.net.y,
            this.net.width,
            this.net.height
        );

        // 画玩家
        this.drawStickman(this.player, '#4CAF50');

        // 画AI
        this.drawStickman(this.ai, '#ff4081');

        // 画羽毛球
        this.ctx.fillStyle = '#fff';
        this.ctx.strokeStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(this.shuttle.x, this.shuttle.y, this.shuttle.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // 画轨迹
        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(this.shuttle.x, this.shuttle.y);
        this.ctx.lineTo(
            this.shuttle.x - this.shuttle.speedX * 5,
            this.shuttle.y - this.shuttle.speedY * 5
        );
        this.ctx.stroke();
    }

    drawStickman(figure, color) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        
        // 身体
        this.ctx.beginPath();
        this.ctx.moveTo(figure.x + figure.width/2, figure.y);
        this.ctx.lineTo(figure.x + figure.width/2, figure.y + figure.height*0.6);
        
        // 腿
        this.ctx.moveTo(figure.x + figure.width/2, figure.y + figure.height*0.6);
        this.ctx.lineTo(figure.x, figure.y + figure.height);
        this.ctx.moveTo(figure.x + figure.width/2, figure.y + figure.height*0.6);
        this.ctx.lineTo(figure.x + figure.width, figure.y + figure.height);
        
        // 手臂和球拍
        const shoulderX = figure.x + figure.width/2;
        const shoulderY = figure.y + figure.height*0.3;
        // 根据是否是玩家来决定球拍的基础角度
        const isPlayer = figure === this.player;
        const racketAngle = (isPlayer ? 0 : 180) + figure.racket.angle;
        const radians = racketAngle * Math.PI / 180;
        
        // 球拍
        const racketX = shoulderX + Math.cos(radians) * figure.racket.length;
        const racketY = shoulderY + Math.sin(radians) * figure.racket.length;
        
        // 画手臂
        this.ctx.moveTo(shoulderX, shoulderY);
        this.ctx.lineTo(racketX, racketY);
        
        // 画球拍头
        this.ctx.beginPath();
        this.ctx.arc(racketX, racketY, 15, radians - Math.PI/2, radians + Math.PI/2);
        
        this.ctx.stroke();
        
        // 头
        this.ctx.beginPath();
        this.ctx.arc(figure.x + figure.width/2, figure.y, 10, 0, Math.PI * 2);
        this.ctx.stroke();

        // 如果是玩家，绘制击球判定范围（调试用）
        if (figure === this.player) {
            this.ctx.beginPath();
            this.ctx.arc(figure.racket.hitPoint.x, figure.racket.hitPoint.y, 30, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
            this.ctx.stroke();
        }
    }

    swingRacket(who) {
        const figure = who === 'player' ? this.player : this.ai;
        if (!figure.racket.swinging) {
            figure.racket.swinging = true;
            figure.racket.swingAngle = 0;
        }
    }

    updateRacket(figure) {
        if (figure === this.player) {
            // 玩家的球拍更新逻辑保持不变...
        } else {
            // AI的球拍更新
            const shoulderX = figure.x + figure.width/2;
            const shoulderY = figure.y + figure.height*0.3;
            const radians = figure.racket.angle * Math.PI / 180;
            
            // 更新AI的击球点
            figure.racket.hitPoint = {
                x: shoulderX + Math.cos(radians) * figure.racket.length,
                y: shoulderY + Math.sin(radians) * figure.racket.length
            };
            
            if (figure.racket.swinging) {
                figure.racket.swingAngle += figure.racket.swingSpeed;
                if (figure.racket.swingAngle >= figure.racket.maxSwingAngle) {
                    figure.racket.swinging = false;
                    figure.racket.swingAngle = 0;
                }
            }
        }
    }

    cleanup() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
    }

    gameWin() {
        this.cleanup();
        gameState.completeGame(3);
        this.showResult(true);
    }

    gameLose() {
        this.cleanup();
        this.showResult(false);
    }

    showResult(won) {
        this.canvas.style.display = 'none';
        document.querySelector('.game-container').innerHTML = `
            <div class="game-result">
                <h2>${won ? '恭喜通过！' : '游戏失败'}</h2>
                <p>${won ? '你成功完成了火柴人打羽毛球游戏！' : '再试一次吧！'}</p>
                <button onclick="location.reload()">
                    ${won ? '返回主页' : '重新开始'}
                </button>
            </div>
        `;
    }

    updateAI() {
        if (this.shuttle.x > this.net.x) {  // 球在AI这边
            // 预测球的落点
            const timeToGround = Math.max(0, (-this.shuttle.speedY + 
                Math.sqrt(this.shuttle.speedY * this.shuttle.speedY + 
                    2 * this.shuttle.gravity * (this.groundY - this.shuttle.y))) / 
                this.shuttle.gravity);
            
            const predictedX = this.shuttle.x + this.shuttle.speedX * timeToGround;
            
            // 更积极的站位
            let targetX;
            if (predictedX > this.net.x) {
                targetX = predictedX - 25;  // 更靠近球
            } else {
                targetX = this.canvas.width - 130;  // 更前置的等待位置
            }

            // 限制移动范围
            targetX = Math.max(this.net.x + 50, Math.min(this.canvas.width - 50, targetX));
            
            // 更快的移动速度
            this.ai.x += (targetX - this.ai.x) * 0.3;

            // 更积极的跳跃判断
            const ballHeight = this.groundY - this.shuttle.y;
            if (!this.ai.jumping && 
                ((ballHeight < 200 && this.shuttle.speedY > 0) || 
                 (this.shuttle.y < this.net.y && Math.abs(this.shuttle.x - this.ai.x) < 120)) &&
                Math.abs(this.shuttle.x - this.ai.x) < 120) {
                this.aiJump();
            }

            // 扩大击球判定范围
            const canHitBall = 
                this.shuttle.lastHitBy !== 'ai' && 
                !this.ai.racket.swinging && 
                Math.abs(this.shuttle.x - this.ai.x) < 140 &&
                Math.abs(this.shuttle.y - (this.ai.y + (this.ai.jumping ? -60 : 0))) < 160;

            if (canHitBall) {
                // 更智能的击球策略
                const playerPos = this.player.x + this.player.width/2;
                
                if (this.ai.jumping || this.shuttle.y < this.net.y) {
                    // 跳跃或高球扣杀
                    this.ai.racket.angle = -80;
                    this.ai.racket.power = 18;
                } else if (ballHeight > 150) {
                    // 高球快速抽击
                    const targetAngle = playerPos < 200 ? -50 : -60;
                    this.ai.racket.angle = targetAngle;
                    this.ai.racket.power = 16;
                } else if (ballHeight > 80) {
                    // 中等高度快球
                    this.ai.racket.angle = -35;
                    this.ai.racket.power = 15;
                } else {
                    // 低球快速挑打
                    this.ai.racket.angle = -20;
                    this.ai.racket.power = 14;
                }
                
                this.swingRacket('ai');
            }
        } else {
            // 更积极的等待位置
            const waitX = this.canvas.width - 130;
            this.ai.x += (waitX - this.ai.x) * 0.25;
        }

        // 更新AI的跳跃状态
        if (this.ai.jumping) {
            this.ai.velocity += this.gravity;
            this.ai.y += this.ai.velocity;

            if (this.ai.y >= this.groundY - this.ai.height) {
                this.ai.y = this.groundY - this.ai.height;
                this.ai.jumping = false;
                this.ai.velocity = 0;
            }
        }
    }

    aiJump() {
        if (!this.ai.jumping) {
            this.ai.jumping = true;
            this.ai.velocity = this.jumpForce * 0.8;  // 稍微降低跳跃高度
        }
    }

    prepareServe() {
        this.serving = true;
        this.shuttle.isServed = false;

        // 更新发球提示
        const serveIndicator = document.getElementById('serveIndicator');
        serveIndicator.textContent = this.playerServe ? "你的发球回合" : "对手的发球回合";

        if (this.playerServe) {
            // 玩家发球位置
            this.shuttle.x = this.player.x + 40;
            this.shuttle.y = this.player.y + 20;
        } else {
            // AI发球位置
            this.shuttle.x = this.ai.x - 40;
            this.shuttle.y = this.ai.y + 20;
            setTimeout(() => {
                if (this.serving && !this.shuttle.isServed) {
                    this.aiServe();
                }
            }, 1000);
        }
        
        this.shuttle.speedX = 0;
        this.shuttle.speedY = 0;
    }

    serve() {
        if (this.serving && !this.shuttle.isServed && this.playerServe) {
            this.shuttle.isServed = true;
            this.serving = false;
            
            // 减小发球速度
            this.shuttle.speedX = 5;
            this.shuttle.speedY = -5;
            this.shuttle.lastHitBy = 'player';
        }
    }

    aiServe() {
        if (this.serving && !this.shuttle.isServed && !this.playerServe) {
            this.shuttle.isServed = true;
            this.serving = false;
            
            // 减小AI发球速度
            this.shuttle.speedX = -4;
            this.shuttle.speedY = -6;
            this.shuttle.lastHitBy = 'ai';
        }
    }
}

// 启动游戏
new BadmintonGame().init(); 