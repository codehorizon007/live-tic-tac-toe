const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let games = {};

io.on('connection', (socket) => {
    socket.on('createGame', ({ username }) => {
        const gameId = uuidv4();
        games[gameId] = {
            id: gameId,
            players: [{ id: socket.id, username, symbol: 'X' }],
            board: Array(9).fill(null),
            currentPlayer: 0,
            status: 'waiting',
            winner: null,
        };
        socket.join(gameId);
        socket.emit('gameCreated', { gameId });
    });

    socket.on('joinGame', ({ gameId, username }) => {
        const game = games[gameId];
        if (game && game.players.length < 2) {
            game.players.push({ id: socket.id, username, symbol: 'O' });
            game.status = 'playing';
            socket.join(gameId);
            io.to(gameId).emit('gameStarted', game);
        } else {
            socket.emit('noAvailableGames');
        }
    });

    socket.on('randomJoin', ({ username }) => {
        const waitingGame = Object.values(games).find(game => game.status === 'waiting');
        if (waitingGame) {
            waitingGame.players.push({ id: socket.id, username, symbol: 'O' });
            waitingGame.status = 'playing';
            socket.join(waitingGame.id);
            io.to(waitingGame.id).emit('gameStarted', waitingGame);
        } else {
            const gameId = uuidv4();
            games[gameId] = {
                id: gameId,
                players: [{ id: socket.id, username, symbol: 'X' }],
                board: Array(9).fill(null),
                currentPlayer: 0,
                status: 'waiting',
                winner: null,
            };
            socket.join(gameId);
            socket.emit('gameCreated', { gameId });
        }
    });

    socket.on('makeMove', ({ gameId, index }) => {
        const game = games[gameId];
        if (game && game.players && game.players.length > game.currentPlayer && game.players[game.currentPlayer].id === socket.id && game.board[index] === null && game.winner === null) {

            game.board[index] = game.players[game.currentPlayer].symbol;
            const winner = checkWin(game.board);
            if (winner !== null) {
                game.winner = game.currentPlayer;
                io.to(gameId).emit('gameWon', { game, winner: game.currentPlayer, pattern: winner });
            } else if (game.board.every(cell => cell !== null)) {
                io.to(gameId).emit('gameTied', game);
            } else {
                game.currentPlayer = 1 - game.currentPlayer;
                io.to(gameId).emit('moveMade', game);
            }
        }
    });

    socket.on('restartGame', ({ gameId }) => {
        const game = games[gameId];
        if (game) {
            game.board = Array(9).fill(null);
            game.currentPlayer = 0;
            game.winner = null;
            io.to(gameId).emit('gameRestarted', game);
        }
    });

    socket.on('disconnect', () => {
        for (const gameId in games) {
            const game = games[gameId];
            game.players = game.players.filter(player => player.id !== socket.id);
            if (game.players.length === 0) {
                delete games[gameId];
            } else {
                io.to(gameId).emit('playerLeft', game.players);
            }
        }
    });
});

const checkWin = (board) => {
    const winPatterns = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return pattern;
        }
    }
    return null;
};

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
