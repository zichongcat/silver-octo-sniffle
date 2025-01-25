class SudokuGame {
    constructor() {
        this.board = Array(9).fill().map(() => Array(9).fill(0));  // 9x9的数独板
        this.solution = Array(9).fill().map(() => Array(9).fill(0)); // 完整解答
        this.initial = Array(9).fill().map(() => Array(9).fill(0));  // 初始数字位置
        this.selected = null;  // 当前选中的格子
        this.difficulty = 'medium';  // 难度：easy, medium, hard
        this.mistakes = 0;     // 错误次数
        this.gameStarted = false;
        this.init = this.init.bind(this);  // 绑定init方法
    }

    init() {
        document.querySelector('.container').innerHTML = `
            <div class="game-container">
                <div class="game-info">
                    <h2>游戏 4: 数独</h2>
                    <div class="controls">
                        <button id="newGameBtn" style="display: none;">新游戏</button>
                        <select id="difficultySelect" style="display: none;">
                            <option value="easy">简单</option>
                            <option value="medium" selected>中等</option>
                            <option value="hard">困难</option>
                        </select>
                    </div>
                    <div class="stats">
                        <span>错误: <span id="mistakes">0</span>/3</span>
                    </div>
                </div>
                <div class="sudoku-board" style="display: none;"></div>
                <div class="number-pad" style="display: none;">
                    ${Array(9).fill().map((_, i) => 
                        `<button class="number-btn">${i + 1}</button>`
                    ).join('')}
                    <button class="number-btn erase">擦除</button>
                </div>
                <button id="startButton" class="start-button">开始游戏</button>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .game-container {
                max-width: 500px;
                margin: 0 auto;
                padding: 20px;
                text-align: center;
            }
            .sudoku-board {
                display: grid;
                grid-template-columns: repeat(9, 40px);
                gap: 1px;
                background: #aaa;
                padding: 2px;
                margin: 20px auto;
                width: fit-content;
            }
            .sudoku-cell {
                width: 40px;
                height: 40px;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                cursor: pointer;
                user-select: none;
            }
            .sudoku-cell.initial {
                font-weight: bold;
                background: #f0f0f0;
                cursor: not-allowed;
            }
            .sudoku-cell.selected {
                background: #e3f2fd;
            }
            .sudoku-cell.error {
                color: red;
            }
            .number-pad {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 5px;
                margin: 20px auto;
                max-width: 300px;
            }
            .number-btn {
                padding: 10px;
                font-size: 18px;
                cursor: pointer;
                background: #1a73e8;
                color: white;
                border: none;
                border-radius: 5px;
            }
            .number-btn:hover {
                background: #1557b0;
            }
            .number-btn.erase {
                grid-column: span 2;
                background: #dc3545;
            }
            .number-btn.erase:hover {
                background: #c82333;
            }
            .controls {
                margin: 10px 0;
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            .stats {
                margin: 10px 0;
                font-size: 18px;
            }
            .start-button {
                padding: 15px 30px;
                font-size: 20px;
                background: #1a73e8;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                margin: 20px auto;
                display: block;
            }
            .start-button:hover {
                background: #1557b0;
            }
        `;
        document.head.appendChild(style);

        // 绑定开始游戏按钮事件
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });
    }

    startGame() {
        // 显示游戏界面
        document.querySelector('.sudoku-board').style.display = 'grid';
        document.querySelector('.number-pad').style.display = 'grid';
        document.getElementById('newGameBtn').style.display = 'inline-block';
        document.getElementById('difficultySelect').style.display = 'inline-block';
        
        // 隐藏开始按钮
        document.getElementById('startButton').style.display = 'none';
        
        // 创建游戏板
        this.createBoard();
        this.bindEvents();
        this.newGame();
    }

    createBoard() {
        const board = document.querySelector('.sudoku-board');
        board.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const cell = document.createElement('div');
                cell.className = 'sudoku-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                // 添加3x3宫格的边框
                if (i % 3 === 0) cell.style.borderTop = '2px solid #666';
                if (j % 3 === 0) cell.style.borderLeft = '2px solid #666';
                if (i === 8) cell.style.borderBottom = '2px solid #666';
                if (j === 8) cell.style.borderRight = '2px solid #666';
                
                board.appendChild(cell);
            }
        }
    }

    bindEvents() {
        // 绑定格子点击事件
        document.querySelector('.sudoku-board').addEventListener('click', (e) => {
            const cell = e.target.closest('.sudoku-cell');
            if (!cell || cell.classList.contains('initial')) return;
            
            // 移除之前的选中状态
            document.querySelectorAll('.sudoku-cell.selected').forEach(cell => 
                cell.classList.remove('selected'));
            
            cell.classList.add('selected');
            this.selected = {
                row: parseInt(cell.dataset.row),
                col: parseInt(cell.dataset.col)
            };
        });

        // 绑定数字按钮事件
        document.querySelector('.number-pad').addEventListener('click', (e) => {
            if (!e.target.classList.contains('number-btn')) return;
            if (!this.selected) return;

            const value = e.target.classList.contains('erase') ? 0 : parseInt(e.target.textContent);
            this.makeMove(this.selected.row, this.selected.col, value);
        });

        // 绑定新游戏按钮
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.difficulty = document.getElementById('difficultySelect').value;
            this.newGame();
        });
    }

    newGame() {
        // 重置游戏状态
        this.mistakes = 0;
        document.getElementById('mistakes').textContent = '0';
        this.selected = null;
        
        // 生成新的数独
        this.generateSudoku();
        this.updateBoard();
        
        // 隐藏开始按钮
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.style.display = 'none';
        }
    }

    updateBoard() {
        const cells = document.querySelectorAll('.sudoku-cell');
        cells.forEach(cell => {
            const i = parseInt(cell.dataset.row);
            const j = parseInt(cell.dataset.col);
            
            cell.textContent = this.board[i][j] || '';
            cell.className = 'sudoku-cell';
            
            if (this.initial[i][j]) {
                cell.classList.add('initial');
            }
        });
    }

    makeMove(row, col, value) {
        if (this.initial[row][col]) return;
        
        const cell = document.querySelector(
            `.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
        
        if (value === 0) {
            this.board[row][col] = 0;
            cell.textContent = '';
            cell.classList.remove('error');
            return;
        }

        this.board[row][col] = value;
        cell.textContent = value;

        // 检查是否正确
        if (value !== this.solution[row][col]) {
            cell.classList.add('error');
            this.mistakes++;
            document.getElementById('mistakes').textContent = this.mistakes;
            
            if (this.mistakes >= 3) {
                this.gameOver(false);
            }
        } else {
            cell.classList.remove('error');
            
            // 检查是否完成
            if (this.checkWin()) {
                this.gameOver(true);
            }
        }
    }

    checkWin() {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (this.board[i][j] !== this.solution[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }

    gameOver(won) {
        setTimeout(() => {
            if (won) {
                this.showResult(true);
            } else {
                this.showResult(false);
            }
        }, 500);
    }

    showResult(won) {
        document.querySelector('.game-container').innerHTML = `
            <div class="game-result">
                <h2>${won ? '恭喜通过！' : '游戏失败'}</h2>
                <p>${won ? '你成功完成了数独！' : '错误次数过多，再试一次吧！'}</p>
                <button onclick="location.reload()">
                    ${won ? '返回主页' : '重新开始'}
                </button>
            </div>
        `;
        if (won) {
            gameState.completeGame(4);
        }
    }

    generateSudoku() {
        // 生成完整的解答
        this.generateSolution();
        
        // 根据难度移除一些数字
        this.createPuzzle();
        
        // 复制初始数字到游戏板
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                this.board[i][j] = this.initial[i][j];
            }
        }
    }

    generateSolution() {
        try {
            // 清空解答板
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    this.solution[i][j] = 0;
                }
            }

            // 先填充一些随机数字作为起点
            for (let i = 0; i < 3; i++) {
                const row = Math.floor(Math.random() * 9);
                const col = Math.floor(Math.random() * 9);
                const num = Math.floor(Math.random() * 9) + 1;
                if (this.isValid(this.solution, row, col, num)) {
                    this.solution[row][col] = num;
                }
            }
            
            // 填充剩余的格子
            if (!this.solveSudoku(this.solution)) {
                // 如果无法解决，重新生成
                console.log("重新生成数独...");
                this.generateSolution();
            }
        } catch (error) {
            console.error("生成数独时出错:", error);
            // 生成一个简单的有效数独作为备选
            this.generateSimpleSudoku();
        }
    }

    generateSimpleSudoku() {
        // 生成一个简单但有效的数独作为备选
        const template = [
            [5,3,0,0,7,0,0,0,0],
            [6,0,0,1,9,5,0,0,0],
            [0,9,8,0,0,0,0,6,0],
            [8,0,0,0,6,0,0,0,3],
            [4,0,0,8,0,3,0,0,1],
            [7,0,0,0,2,0,0,0,6],
            [0,6,0,0,0,0,2,8,0],
            [0,0,0,4,1,9,0,0,5],
            [0,0,0,0,8,0,0,7,9]
        ];
        
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                this.solution[i][j] = template[i][j];
            }
        }
        
        // 解决这个模板以获得完整解答
        this.solveSudoku(this.solution);
    }

    createPuzzle() {
        // 复制解答到初始板
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                this.initial[i][j] = this.solution[i][j];
            }
        }

        // 根据难度确定要移除的数字数量
        let cellsToRemove;
        switch (this.difficulty) {
            case 'easy':
                cellsToRemove = 35;  // 调整难度，留下更多数字
                break;
            case 'medium':
                cellsToRemove = 45;
                break;
            case 'hard':
                cellsToRemove = 50;
                break;
        }

        // 随机移除数字，但不检查唯一解（为了提高性能）
        while (cellsToRemove > 0) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            
            if (this.initial[row][col] !== 0) {
                this.initial[row][col] = 0;
                cellsToRemove--;
            }
        }
    }

    hasUniqueSolution() {
        const testBoard = Array(9).fill().map(() => Array(9).fill(0));
        
        // 复制初始板
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                testBoard[i][j] = this.initial[i][j];
            }
        }
        
        // 使用一个对象来存储解的数量
        const solutions = { count: 0 };
        this.countSolutions(testBoard, solutions);
        return solutions.count === 1;
    }

    countSolutions(board, solutions) {
        if (solutions.count > 1) return;
        
        const emptyCell = this.findEmptyCell(board);
        if (!emptyCell) {
            solutions.count++;
            return;
        }
        
        const [row, col] = emptyCell;
        for (let num = 1; num <= 9; num++) {
            if (this.isValid(board, row, col, num)) {
                board[row][col] = num;
                this.countSolutions(board, solutions);
                board[row][col] = 0;
            }
        }
    }

    solveSudoku(board) {
        const emptyCell = this.findEmptyCell(board);
        if (!emptyCell) return true;
        
        const [row, col] = emptyCell;
        const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        
        for (const num of numbers) {
            if (this.isValid(board, row, col, num)) {
                board[row][col] = num;
                
                if (this.solveSudoku(board)) {
                    return true;
                }
                
                board[row][col] = 0;
            }
        }
        
        return false;
    }

    findEmptyCell(board) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (board[i][j] === 0) {
                    return [i, j];
                }
            }
        }
        return null;
    }

    isValid(board, row, col, num) {
        // 检查行
        for (let j = 0; j < 9; j++) {
            if (board[row][j] === num) return false;
        }
        
        // 检查列
        for (let i = 0; i < 9; i++) {
            if (board[i][col] === num) return false;
        }
        
        // 检查3x3宫格
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }
        
        return true;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

// 修改游戏启动方式（在文件末尾）
(() => {
    try {
        console.log("开始初始化数独游戏...");
        window.currentGame = new SudokuGame();
        window.currentGame.init();
        console.log("数独游戏初始化完成");
    } catch (error) {
        console.error("游戏初始化失败:", error);
        document.querySelector('.container').innerHTML = `
            <div class="game-error">
                <h2>游戏加载失败</h2>
                <p>请刷新页面重试</p>
                <button onclick="location.reload()">重新加载</button>
            </div>
        `;
    }
})(); 