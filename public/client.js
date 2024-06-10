const socket = io();

const joinSection = document.getElementById('joinSection');
const gameSection = document.getElementById('gameSection');
const gameIdInput = document.getElementById('gameId');
const usernameInput = document.getElementById('username');
const createButton = document.getElementById('createButton');
const joinButton = document.getElementById('joinButton');
const randomButton = document.getElementById('randomButton');
const gameInfo = document.getElementById('gameInfo');
const gameBoard = document.getElementById('gameBoard');
const status = document.getElementById('status');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const restartButton = document.getElementById('restartButton');
const playerX = document.getElementById('playerX');
const playerO = document.getElementById('playerO');

let gameId = null;
let currentPlayer = null;
let mySymbol = null;

createButton.addEventListener('click', () => {
    const username = usernameInput.value;
    if (username) {
        socket.emit('createGame', { username });
    }
});

joinButton.addEventListener('click', () => {
    const username = usernameInput.value;
    const gameId = gameIdInput.value;
    if (username && gameId) {
        socket.emit('joinGame', { gameId, username });
    }
});

randomButton.addEventListener('click', () => {
    const username = usernameInput.value;
    if (username) {
        socket.emit('randomJoin', { username });
    }
});

restartButton.addEventListener('click', () => {
    socket.emit('restartGame', { gameId });
});

socket.on('gameCreated', ({ gameId }) => {
    gameInfo.textContent = `Game ID: ${gameId}. Waiting for another player...`;
});

socket.on('gameStarted', (game) => {
    gameId = game.id;
    currentPlayer = game.players.find(player => player.id === socket.id);
    mySymbol = currentPlayer.symbol;
    const opponent = game.players.find(player => player.id !== socket.id);
    playerX.textContent = game.players[0].symbol === 'X' ? `X: ${game.players[0].username}` : `X: ${game.players[1].username}`;
    playerO.textContent = game.players[0].symbol === 'O' ? `O: ${game.players[0].username}` : `O: ${game.players[1].username}`;
    joinSection.classList.add('hidden');
    gameSection.classList.remove('hidden');
    status.textContent = `Game started. You are ${mySymbol}. It's ${game.players[game.currentPlayer].symbol === mySymbol ? 'your' : opponent.username + "'s"} turn.`;
    renderBoard(game.board, game);
});

socket.on('moveMade', (game) => {
    renderBoard(game.board, game);
    const currentPlayerSymbol = game.players[game.currentPlayer].symbol;
    const currentPlayerName = game.players[game.currentPlayer].username;
    status.textContent = `It's ${currentPlayerSymbol === mySymbol ? 'your' : currentPlayerName + "'s"} turn`;
});

socket.on('gameWon', ({ game, winner, pattern }) => {
    renderBoard(game.board, game, pattern);
    const winnerPlayer = game.players[winner];
    status.textContent = `${winnerPlayer.username} wins!`;
    showModal(`${winnerPlayer.username} wins!`);
    restartButton.classList.remove('hidden');
});

socket.on('gameTied', (game) => {
    renderBoard(game.board, game);
    status.textContent = `It's a tie!`;
    showModal(`It's a tie!`);
    restartButton.classList.remove('hidden');
});

socket.on('playerLeft', (players) => {
    status.textContent = `A player left the game.`;
});

socket.on('gameRestarted', (game) => {
    renderBoard(game.board, game);
    const currentPlayerSymbol = game.players[game.currentPlayer].symbol;
    const currentPlayerName = game.players[game.currentPlayer].username;
    status.textContent = `Game restarted. It's ${currentPlayerSymbol === mySymbol ? 'your' : currentPlayerName + "'s"} turn`;
    restartButton.classList.add('hidden');
});

function renderBoard(board, game, winPattern = []) {
    gameBoard.innerHTML = '';
    board.forEach((cell, index) => {
        const cellElement = document.createElement('div');
        cellElement.classList.add('cell');
        if (cell) {
            cellElement.classList.add(cell === 'O' ? 'playerO' : 'playerX');
            cellElement.textContent = cell;
        }
        if (winPattern.includes(index)) {
            cellElement.classList.add('win');
        }
        cellElement.addEventListener('click', () => {
            if (cell === null && mySymbol === game.players[game.currentPlayer].symbol) {
                socket.emit('makeMove', { gameId, index });
            }
        });
        gameBoard.appendChild(cellElement);
    });
}

function showModal(message) {
    modalContent.innerHTML = `<h2>${message}</h2><img src="winning.gif" alt="winner">`;
    modal.classList.add('show');
    setTimeout(() => {
        modal.classList.remove('show');
    }, 3000);
}
