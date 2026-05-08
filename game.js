// Blockudoku Game Logic

class Blockudoku {
    constructor() {
        this.boardSize = 9;
        this.board = [];
        this.currentScore = 0;
        this.bestScore = parseInt(localStorage.getItem('blockudoku_best') || '0');
        this.pieces = [];
        this.selectedPiece = null;
        this.draggedElement = null;
        this.touchOffset = { x: 0, y: 0 };
        this.lastPreviewRow = -1;
        this.lastPreviewCol = -1;

        // Undo system
        this.undoStack = [];
        this.maxUndos = 3;
        this.undosRemaining = 3;

        // Color themes
        this.colorThemes = [
            { name: 'green', primary: '#22C55E', dark: '#16A34A', light: '#86EFAC', ultraLight: '#DCFCE7', rgb: '34, 197, 94' },
            { name: 'blue', primary: '#3B82F6', dark: '#2563EB', light: '#93C5FD', ultraLight: '#DBEAFE', rgb: '59, 130, 246' },
            { name: 'purple', primary: '#8B5CF6', dark: '#7C3AED', light: '#C4B5FD', ultraLight: '#EDE9FE', rgb: '139, 92, 246' },
            { name: 'pink', primary: '#EC4899', dark: '#DB2777', light: '#F9A8D4', ultraLight: '#FCE7F3', rgb: '236, 72, 153' },
            { name: 'orange', primary: '#F97316', dark: '#EA580C', light: '#FDBA74', ultraLight: '#FFEDD5', rgb: '249, 115, 22' },
            { name: 'teal', primary: '#14B8A6', dark: '#0D9488', light: '#5EEAD4', ultraLight: '#CCFBF1', rgb: '20, 184, 166' },
            { name: 'red', primary: '#EF4444', dark: '#DC2626', light: '#FCA5A5', ultraLight: '#FEE2E2', rgb: '239, 68, 68' },
            { name: 'indigo', primary: '#6366F1', dark: '#4F46E5', light: '#A5B4FC', ultraLight: '#E0E7FF', rgb: '99, 102, 241' },
        ];
        this.currentTheme = null;

        // Game modes
        this.gameMode = 'classic'; // classic, easy, hard, progressive, weighted
        this.progressiveLevel = 1;

        // Shapes categorized by difficulty
        this.easyShapes = [
            // Single
            [[1]],
            // Short lines (2 blocks)
            [[1, 1]],
            [[1], [1]],
            // Small L shapes (3 blocks)
            [[1, 1], [1, 0]],
            [[1, 1], [0, 1]],
            [[1, 0], [1, 1]],
            [[0, 1], [1, 1]],
            // Small square
            [[1, 1], [1, 1]],
        ];

        this.mediumShapes = [
            // Medium lines (3 blocks)
            [[1, 1, 1]],
            [[1], [1], [1]],
            // L shapes (4 blocks)
            [[1, 1, 1], [1, 0, 0]],
            [[1, 1, 1], [0, 0, 1]],
            [[1, 0, 0], [1, 1, 1]],
            [[0, 0, 1], [1, 1, 1]],
            [[1, 1], [1, 0], [1, 0]],
            [[1, 1], [0, 1], [0, 1]],
            [[1, 0], [1, 0], [1, 1]],
            [[0, 1], [0, 1], [1, 1]],
            // T shapes (4 blocks)
            [[1, 1, 1], [0, 1, 0]],
            [[0, 1, 0], [1, 1, 1]],
            [[1, 0], [1, 1], [1, 0]],
            [[0, 1], [1, 1], [0, 1]],
            // Z shapes (4 blocks)
            [[1, 1, 0], [0, 1, 1]],
            [[0, 1, 1], [1, 1, 0]],
            [[0, 1], [1, 1], [1, 0]],
            [[1, 0], [1, 1], [0, 1]],
        ];

        this.hardShapes = [
            // Long lines (4-5 blocks)
            [[1, 1, 1, 1]],
            [[1], [1], [1], [1]],
            [[1, 1, 1, 1, 1]],
            [[1], [1], [1], [1], [1]],
            // Big corners (5 blocks)
            [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
            [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
            [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
            [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
            // Big square (9 blocks)
            [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
        ];

        // Combined for classic mode
        this.allShapes = [...this.easyShapes, ...this.mediumShapes, ...this.hardShapes];

        this.init();
    }

    init() {
        this.setRandomTheme();
        this.setupBoard();
        this.setupEventListeners();
        this.updateDate();
        this.updateScoreDisplay();
        this.updateUndoButton();
        // Show mode selection on start
        this.showModeSelection();
    }

    setRandomTheme() {
        const randomIndex = Math.floor(Math.random() * this.colorThemes.length);
        this.currentTheme = this.colorThemes[randomIndex];
        this.applyTheme();
    }

    applyTheme() {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', this.currentTheme.primary);
        root.style.setProperty('--primary-dark', this.currentTheme.dark);
        root.style.setProperty('--primary-light', this.currentTheme.light);
        root.style.setProperty('--primary-ultra-light', this.currentTheme.ultraLight);
        root.style.setProperty('--primary-rgb', this.currentTheme.rgb);
    }

    setupBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        this.board = [];

        // Create 9 sections (3x3 grid of 3x3 sections)
        for (let sectionRow = 0; sectionRow < 3; sectionRow++) {
            for (let sectionCol = 0; sectionCol < 3; sectionCol++) {
                const section = document.createElement('div');
                section.className = 'board-section';
                section.dataset.section = sectionRow * 3 + sectionCol;

                // Create 9 cells in each section
                for (let cellRow = 0; cellRow < 3; cellRow++) {
                    for (let cellCol = 0; cellCol < 3; cellCol++) {
                        const row = sectionRow * 3 + cellRow;
                        const col = sectionCol * 3 + cellCol;

                        if (!this.board[row]) this.board[row] = [];
                        this.board[row][col] = 0;

                        const cell = document.createElement('div');
                        cell.className = 'cell';
                        cell.dataset.row = row;
                        cell.dataset.col = col;
                        section.appendChild(cell);
                    }
                }

                gameBoard.appendChild(section);
            }
        }
    }

    setupEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.showModeSelection());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.showModeSelection());
        document.getElementById('dailyChallenge').addEventListener('click', () => this.startDailyChallenge());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());

        // Mode selection buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.startGameWithMode(mode);
            });
        });

        // Board events for preview
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.addEventListener('mousemove', (e) => this.handleBoardHover(e));
        gameBoard.addEventListener('mouseleave', () => this.clearPreview());
        gameBoard.addEventListener('click', (e) => this.handleBoardClick(e));

        // Touch events for board
        gameBoard.addEventListener('touchmove', (e) => this.handleBoardTouch(e), { passive: false });
        gameBoard.addEventListener('touchend', (e) => this.handleBoardTouchEnd(e));
    }

    updateDate() {
        const now = new Date();
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                       'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        document.getElementById('currentDate').textContent = `${now.getDate()} ${months[now.getMonth()]}`;
    }

    updateScoreDisplay() {
        document.getElementById('currentScore').textContent = this.currentScore;
        document.getElementById('bestScore').textContent = this.bestScore;
    }

    updateUndoButton() {
        const undoBtn = document.getElementById('undoBtn');
        const undoCount = document.getElementById('undoCount');
        undoCount.textContent = this.undosRemaining;
        undoBtn.disabled = this.undosRemaining === 0 || this.undoStack.length === 0;
    }

    showModeSelection() {
        document.getElementById('modeSelectionModal').classList.add('show');
    }

    hideModeSelection() {
        document.getElementById('modeSelectionModal').classList.remove('show');
    }

    startGameWithMode(mode) {
        this.gameMode = mode;
        this.progressiveLevel = 1;
        this.hideModeSelection();
        this.newGame();
    }

    saveStateForUndo() {
        const state = {
            board: this.board.map(row => [...row]),
            score: this.currentScore,
            pieces: this.pieces.map(p => ({ shape: p.shape.map(r => [...r]), used: p.used }))
        };
        this.undoStack.push(state);
        // Keep only last few states
        if (this.undoStack.length > 10) {
            this.undoStack.shift();
        }
    }

    undo() {
        if (this.undosRemaining === 0 || this.undoStack.length === 0) return;

        const state = this.undoStack.pop();
        this.board = state.board;
        this.currentScore = state.score;
        this.pieces = state.pieces;
        this.undosRemaining--;

        this.updateBoardDisplay();
        this.updateScoreDisplay();
        this.updateUndoButton();
        this.renderAllPieces();
        this.highlightAlmostComplete();
    }

    generatePieces() {
        const container = document.getElementById('piecesContainer');
        container.innerHTML = '';
        this.pieces = [];

        for (let i = 0; i < 3; i++) {
            const shape = this.getShapeForMode();
            this.pieces.push({ shape: shape.map(r => [...r]), used: false });
        }
        this.renderAllPieces();
    }

    getShapeForMode() {
        let shapesPool;

        switch (this.gameMode) {
            case 'easy':
                // Only easy shapes
                shapesPool = this.easyShapes;
                break;

            case 'hard':
                // Only medium and hard shapes
                shapesPool = [...this.mediumShapes, ...this.hardShapes];
                break;

            case 'progressive':
                // Level 1-3: only easy
                // Level 4-6: easy + medium
                // Level 7+: all shapes
                if (this.progressiveLevel <= 3) {
                    shapesPool = this.easyShapes;
                } else if (this.progressiveLevel <= 6) {
                    shapesPool = [...this.easyShapes, ...this.mediumShapes];
                } else {
                    shapesPool = this.allShapes;
                }
                break;

            case 'weighted':
                // 60% easy, 30% medium, 10% hard
                const rand = Math.random();
                if (rand < 0.6) {
                    shapesPool = this.easyShapes;
                } else if (rand < 0.9) {
                    shapesPool = this.mediumShapes;
                } else {
                    shapesPool = this.hardShapes;
                }
                break;

            case 'classic':
            default:
                // All shapes with equal probability
                shapesPool = this.allShapes;
                break;
        }

        return shapesPool[Math.floor(Math.random() * shapesPool.length)];
    }

    renderAllPieces() {
        const container = document.getElementById('piecesContainer');
        container.innerHTML = '';

        this.pieces.forEach((piece, index) => {
            this.renderPiece(piece.shape, index, piece.used);
        });
    }

    renderPiece(shape, index, used = false) {
        const container = document.getElementById('piecesContainer');
        const piece = document.createElement('div');
        piece.className = 'piece' + (used ? ' used' : '');
        piece.dataset.index = index;

        const rows = shape.length;
        const cols = Math.max(...shape.map(row => row.length));

        // No gap between cells for solid appearance
        piece.style.gridTemplateColumns = `repeat(${cols}, auto)`;
        piece.style.gridTemplateRows = `repeat(${rows}, auto)`;
        piece.style.gap = '0px';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = `piece-cell ${shape[r][c] ? 'filled' : 'empty'}`;
                piece.appendChild(cell);
            }
        }

        if (!used) {
            // Mouse events
            piece.addEventListener('mousedown', (e) => this.startDrag(e, index));

            // Touch events
            piece.addEventListener('touchstart', (e) => this.startTouch(e, index), { passive: false });
            piece.addEventListener('touchmove', (e) => this.handleTouch(e), { passive: false });
            piece.addEventListener('touchend', (e) => this.endTouch(e));
        }

        container.appendChild(piece);
    }

    startDrag(e, index) {
        if (this.pieces[index].used) return;

        this.selectedPiece = index;
        const pieceElement = e.target.closest('.piece');
        pieceElement.classList.add('dragging');
        this.draggedElement = pieceElement;

        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));
    }

    handleDrag(e) {
        if (!this.draggedElement) return;

        this.draggedElement.style.position = 'fixed';
        this.draggedElement.style.left = `${e.clientX - this.draggedElement.offsetWidth / 2}px`;
        this.draggedElement.style.top = `${e.clientY - this.draggedElement.offsetHeight / 2}px`;
        this.draggedElement.style.zIndex = '1000';

        // Show preview while dragging
        const { row, col } = this.getCellFromPoint(e.clientX, e.clientY);
        this.clearPreview();
        if (row >= 0 && col >= 0 && row < this.boardSize && col < this.boardSize) {
            this.showPreview(row, col);
        }
    }

    endDrag(e) {
        if (!this.draggedElement) return;

        document.removeEventListener('mousemove', this.handleDrag.bind(this));
        document.removeEventListener('mouseup', this.endDrag.bind(this));

        this.draggedElement.classList.remove('dragging');
        this.draggedElement.style.position = '';
        this.draggedElement.style.left = '';
        this.draggedElement.style.top = '';
        this.draggedElement.style.zIndex = '';

        // Find exact cell under mouse
        const { row, col } = this.getCellFromPoint(e.clientX, e.clientY);
        if (row >= 0 && col >= 0 && row < this.boardSize && col < this.boardSize) {
            this.tryPlacePiece(row, col);
        }

        this.clearPreview();
        this.draggedElement = null;
    }

    startTouch(e, index) {
        if (this.pieces[index].used) return;
        e.preventDefault();

        this.selectedPiece = index;
        const pieceElement = e.target.closest('.piece');
        pieceElement.classList.add('dragging');
        this.draggedElement = pieceElement;

        const touch = e.touches[0];
        const rect = pieceElement.getBoundingClientRect();
        this.touchOffset = {
            x: touch.clientX - rect.left - rect.width / 2,
            y: touch.clientY - rect.top - rect.height / 2
        };
    }

    handleTouch(e) {
        if (!this.draggedElement) return;
        e.preventDefault();

        const touch = e.touches[0];

        // Position piece BELOW and slightly offset from finger
        // This way the finger doesn't block the view of the board
        const pieceWidth = this.draggedElement.offsetWidth;
        const offsetY = 30; // Small offset below finger

        this.draggedElement.style.position = 'fixed';
        this.draggedElement.style.left = `${touch.clientX - pieceWidth / 2}px`;
        this.draggedElement.style.top = `${touch.clientY + offsetY}px`;
        this.draggedElement.style.zIndex = '1000';

        // Store current preview position based on where piece visually is
        const pieceRect = this.draggedElement.getBoundingClientRect();
        const { row, col } = this.getCellFromPoint(pieceRect.left + 10, pieceRect.top + 10);

        this.lastPreviewRow = row;
        this.lastPreviewCol = col;

        this.clearPreview();
        if (row >= 0 && col >= 0 && row < this.boardSize && col < this.boardSize) {
            this.showPreview(row, col);
        }
    }

    endTouch(e) {
        if (!this.draggedElement) return;
        e.preventDefault();

        // Use the last preview position - this is exactly where the user saw it would go
        const row = this.lastPreviewRow;
        const col = this.lastPreviewCol;

        this.draggedElement.classList.remove('dragging');
        this.draggedElement.style.position = '';
        this.draggedElement.style.left = '';
        this.draggedElement.style.top = '';
        this.draggedElement.style.zIndex = '';

        if (row >= 0 && col >= 0 && row < this.boardSize && col < this.boardSize) {
            this.tryPlacePiece(row, col);
        }

        this.clearPreview();
        this.draggedElement = null;
        this.lastPreviewRow = -1;
        this.lastPreviewCol = -1;
    }

    // Get exact cell coordinates from a point
    getCellFromPoint(x, y) {
        const cells = document.querySelectorAll('.board-section .cell');
        for (const cell of cells) {
            const rect = cell.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return {
                    row: parseInt(cell.dataset.row),
                    col: parseInt(cell.dataset.col)
                };
            }
        }
        // Fallback: find closest cell
        let closestCell = null;
        let closestDist = Infinity;
        for (const cell of cells) {
            const rect = cell.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            if (dist < closestDist) {
                closestDist = dist;
                closestCell = cell;
            }
        }
        if (closestCell) {
            return {
                row: parseInt(closestCell.dataset.row),
                col: parseInt(closestCell.dataset.col)
            };
        }
        return { row: -1, col: -1 };
    }

    handleBoardHover(e) {
        if (this.selectedPiece === null) return;

        const cell = e.target;
        if (!cell.classList.contains('cell')) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        this.clearPreview();
        this.showPreview(row, col);
    }

    handleBoardTouch(e) {
        if (this.selectedPiece === null || !this.draggedElement) return;
        e.preventDefault();
    }

    handleBoardTouchEnd(e) {
        // Handled in endTouch
    }

    handleBoardClick(e) {
        if (this.selectedPiece === null) return;

        const cell = e.target;
        if (!cell.classList.contains('cell')) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        this.tryPlacePiece(row, col);
        this.clearPreview();
    }

    showPreview(row, col) {
        if (this.selectedPiece === null) return;

        const shape = this.pieces[this.selectedPiece].shape;
        const canPlace = this.canPlacePiece(shape, row, col);
        const cells = document.querySelectorAll('.cell');

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const targetRow = row + r;
                    const targetCol = col + c;

                    if (targetRow < this.boardSize && targetCol < this.boardSize) {
                        const index = targetRow * this.boardSize + targetCol;
                        const cellElement = this.getCellElement(targetRow, targetCol);
                        if (cellElement) {
                            cellElement.classList.add(canPlace ? 'preview' : 'preview-invalid');
                        }
                    }
                }
            }
        }

        // If can place, show which lines will be cleared
        if (canPlace) {
            this.showClearPreview(shape, row, col);
        }
    }

    // Show preview of which lines/boxes will be cleared
    showClearPreview(shape, row, col) {
        // Create temporary board with the piece placed
        const tempBoard = this.board.map(r => [...r]);
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    tempBoard[row + r][col + c] = 1;
                }
            }
        }

        const toClear = new Set();

        // Check rows
        for (let r = 0; r < this.boardSize; r++) {
            if (tempBoard[r].every(cell => cell === 1)) {
                for (let c = 0; c < this.boardSize; c++) {
                    toClear.add(`${r}-${c}`);
                }
            }
        }

        // Check columns
        for (let c = 0; c < this.boardSize; c++) {
            let full = true;
            for (let r = 0; r < this.boardSize; r++) {
                if (!tempBoard[r][c]) {
                    full = false;
                    break;
                }
            }
            if (full) {
                for (let r = 0; r < this.boardSize; r++) {
                    toClear.add(`${r}-${c}`);
                }
            }
        }

        // Check 3x3 boxes
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                let full = true;
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        if (!tempBoard[boxRow * 3 + r][boxCol * 3 + c]) {
                            full = false;
                            break;
                        }
                    }
                    if (!full) break;
                }
                if (full) {
                    for (let r = 0; r < 3; r++) {
                        for (let c = 0; c < 3; c++) {
                            toClear.add(`${boxRow * 3 + r}-${boxCol * 3 + c}`);
                        }
                    }
                }
            }
        }

        // Add will-clear class to cells that will be cleared
        toClear.forEach(pos => {
            const [r, c] = pos.split('-').map(Number);
            const cellElement = this.getCellElement(r, c);
            if (cellElement) {
                cellElement.classList.add('will-clear');
            }
        });
    }

    getCellElement(row, col) {
        const sectionIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        const cellIndex = (row % 3) * 3 + (col % 3);
        const section = document.querySelectorAll('.board-section')[sectionIndex];
        if (section) {
            return section.querySelectorAll('.cell')[cellIndex];
        }
        return null;
    }

    clearPreview() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('preview', 'preview-invalid', 'will-clear');
        });
    }

    canPlacePiece(shape, row, col) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const targetRow = row + r;
                    const targetCol = col + c;

                    if (targetRow >= this.boardSize || targetCol >= this.boardSize ||
                        targetRow < 0 || targetCol < 0 ||
                        this.board[targetRow][targetCol]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    tryPlacePiece(row, col) {
        if (this.selectedPiece === null) return;

        const shape = this.pieces[this.selectedPiece].shape;

        if (!this.canPlacePiece(shape, row, col)) return;

        // Save state for undo before placing
        this.saveStateForUndo();

        // Place the piece
        let cellsPlaced = 0;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    this.board[row + r][col + c] = 1;
                    cellsPlaced++;
                }
            }
        }

        // Mark piece as used
        this.pieces[this.selectedPiece].used = true;
        const pieceElements = document.querySelectorAll('.piece');
        pieceElements[this.selectedPiece].classList.add('used');

        // Add points for placing
        this.currentScore += cellsPlaced;

        this.selectedPiece = null;
        this.updateBoardDisplay();
        this.updateUndoButton();

        // Check for completed lines
        setTimeout(() => {
            this.checkAndClearLines();
        }, 100);
    }

    updateBoardDisplay() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cellElement = this.getCellElement(row, col);
                if (cellElement) {
                    if (this.board[row][col]) {
                        cellElement.classList.add('filled');
                    } else {
                        cellElement.classList.remove('filled');
                    }
                }
            }
        }
        this.highlightAlmostComplete();
    }

    highlightAlmostComplete() {
        // Clear all highlights first
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('highlight-row', 'highlight-col');
        });
        document.querySelectorAll('.board-section').forEach(section => {
            section.classList.remove('highlight-almost');
        });

        // Check rows - highlight if 7 or 8 filled
        for (let row = 0; row < this.boardSize; row++) {
            const filledCount = this.board[row].filter(cell => cell === 1).length;
            if (filledCount >= 7 && filledCount < 9) {
                for (let col = 0; col < this.boardSize; col++) {
                    const cellElement = this.getCellElement(row, col);
                    if (cellElement) cellElement.classList.add('highlight-row');
                }
            }
        }

        // Check columns - highlight if 7 or 8 filled
        for (let col = 0; col < this.boardSize; col++) {
            let filledCount = 0;
            for (let row = 0; row < this.boardSize; row++) {
                if (this.board[row][col]) filledCount++;
            }
            if (filledCount >= 7 && filledCount < 9) {
                for (let row = 0; row < this.boardSize; row++) {
                    const cellElement = this.getCellElement(row, col);
                    if (cellElement) cellElement.classList.add('highlight-col');
                }
            }
        }

        // Check 3x3 boxes - highlight if 7 or 8 filled
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                let filledCount = 0;
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        if (this.board[boxRow * 3 + r][boxCol * 3 + c]) filledCount++;
                    }
                }
                if (filledCount >= 7 && filledCount < 9) {
                    const sectionIndex = boxRow * 3 + boxCol;
                    const section = document.querySelectorAll('.board-section')[sectionIndex];
                    if (section) section.classList.add('highlight-almost');
                }
            }
        }
    }

    checkAndClearLines() {
        const toClear = new Set();
        let linesCleared = 0;

        // Check rows
        for (let row = 0; row < this.boardSize; row++) {
            if (this.board[row].every(cell => cell === 1)) {
                for (let col = 0; col < this.boardSize; col++) {
                    toClear.add(`${row}-${col}`);
                }
                linesCleared++;
            }
        }

        // Check columns
        for (let col = 0; col < this.boardSize; col++) {
            let full = true;
            for (let row = 0; row < this.boardSize; row++) {
                if (!this.board[row][col]) {
                    full = false;
                    break;
                }
            }
            if (full) {
                for (let row = 0; row < this.boardSize; row++) {
                    toClear.add(`${row}-${col}`);
                }
                linesCleared++;
            }
        }

        // Check 3x3 boxes
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                let full = true;
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        if (!this.board[boxRow * 3 + r][boxCol * 3 + c]) {
                            full = false;
                            break;
                        }
                    }
                    if (!full) break;
                }
                if (full) {
                    for (let r = 0; r < 3; r++) {
                        for (let c = 0; c < 3; c++) {
                            toClear.add(`${boxRow * 3 + r}-${boxCol * 3 + c}`);
                        }
                    }
                    linesCleared++;
                }
            }
        }

        if (toClear.size > 0) {
            // Add bonus points for clearing
            this.currentScore += linesCleared * 18;

            // Combo bonus
            if (linesCleared > 1) {
                this.currentScore += (linesCleared - 1) * 28;
            }

            // Animate clearing
            toClear.forEach(pos => {
                const [row, col] = pos.split('-').map(Number);
                const cellElement = this.getCellElement(row, col);
                if (cellElement) cellElement.classList.add('clearing');
            });

            setTimeout(() => {
                toClear.forEach(pos => {
                    const [row, col] = pos.split('-').map(Number);
                    this.board[row][col] = 0;
                });
                this.updateBoardDisplay();
                document.querySelectorAll('.clearing').forEach(cell => {
                    cell.classList.remove('clearing');
                });
            }, 300);
        }

        this.updateScoreDisplay();

        // Check if all pieces are used
        if (this.pieces.every(p => p.used)) {
            // In progressive mode, increase level
            if (this.gameMode === 'progressive') {
                this.progressiveLevel++;
            }
            setTimeout(() => this.generatePieces(), 400);
        }

        // Check game over
        setTimeout(() => this.checkGameOver(), 500);
    }

    checkGameOver() {
        // Check if any remaining piece can be placed
        const unusedPieces = this.pieces.filter(p => !p.used);

        for (const piece of unusedPieces) {
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (this.canPlacePiece(piece.shape, row, col)) {
                        return; // Game can continue
                    }
                }
            }
        }

        // No valid moves - game over
        this.gameOver();
    }

    gameOver() {
        // Update best score
        if (this.currentScore > this.bestScore) {
            this.bestScore = this.currentScore;
            localStorage.setItem('blockudoku_best', this.bestScore.toString());
            document.getElementById('newRecordMsg').classList.remove('hidden');
        } else {
            document.getElementById('newRecordMsg').classList.add('hidden');
        }

        document.getElementById('finalScore').textContent = this.currentScore;
        document.getElementById('gameOverModal').classList.add('show');
        this.updateScoreDisplay();
    }

    newGame() {
        this.currentScore = 0;
        this.selectedPiece = null;
        this.draggedElement = null;
        this.undoStack = [];
        this.undosRemaining = 3;

        document.getElementById('gameOverModal').classList.remove('show');

        // Set new random color theme
        this.setRandomTheme();

        this.setupBoard();
        this.generatePieces();
        this.updateScoreDisplay();
        this.updateUndoButton();

        // Reset progressive level if not in progressive mode
        if (this.gameMode !== 'progressive') {
            this.progressiveLevel = 1;
        }
    }

    startDailyChallenge() {
        // Use date as seed for daily challenge
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

        // Simple seeded random
        let currentSeed = seed;
        const seededRandom = () => {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            return currentSeed / 233280;
        };

        this.newGame();

        // Use seed to pick a consistent theme for the day
        const themeIndex = Math.floor(seededRandom() * this.colorThemes.length);
        this.currentTheme = this.colorThemes[themeIndex];
        this.applyTheme();

        // Pre-fill some cells for daily challenge
        const fillCount = 10 + Math.floor(seededRandom() * 10);
        for (let i = 0; i < fillCount; i++) {
            const row = Math.floor(seededRandom() * this.boardSize);
            const col = Math.floor(seededRandom() * this.boardSize);
            this.board[row][col] = 1;
        }

        this.updateBoardDisplay();
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Blockudoku();
});
