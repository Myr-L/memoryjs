const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let players = {};
let flippedCards = [];
let matchedPairs = 0;
let currentPlayer = null;
let timeLeft = 60;

// Lista de imágenes (coloca las imágenes en la carpeta /public/img/)
let images = [
    'img/img1.jpeg', 'img/img1.jpeg', 'img/img2.jpeg', 'img/img2.jpeg',
    'img/img3.jpeg', 'img/img3.jpeg', 'img/img4.jpeg', 'img/img4.jpeg',
    'img/img5.jpeg', 'img/img5.jpeg', 'img/img6.jpeg', 'img/img6.jpeg',
    'img/img7.jpeg', 'img/img7.jpeg', 'img/img8.jpeg', 'img/img8.jpeg'
];
images = shuffle(images);

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

wss.on('connection', function connection(ws) {
    let playerId = `Player-${Math.floor(Math.random() * 1000)}`;
    players[playerId] = { ws, score: 0 };

    if (!currentPlayer) {
        currentPlayer = playerId;
    }

    ws.send(JSON.stringify({ type: 'init', playerId, images, currentPlayer }));

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);
        
        if (data.type === 'flip') {
            if (flippedCards.length < 2 && playerId === currentPlayer) {
                flippedCards.push({ index: data.index, playerId });
                broadcast({ type: 'flip', index: data.index, image: images[data.index] });
                
                if (flippedCards.length === 2) {
                    setTimeout(checkMatch, 1000);
                }
            }
        }
    });

    ws.on('close', () => {
        delete players[playerId];
        if (currentPlayer === playerId) {
            switchTurn();
        }
    });
});

function checkMatch() {
    if (
        flippedCards[0].index !== flippedCards[1].index &&
        images[flippedCards[0].index] === images[flippedCards[1].index]
    ) {
        players[flippedCards[0].playerId].score += 1;
        
        broadcast({
            type: 'match',
            playerId: flippedCards[0].playerId,
            score: players[flippedCards[0].playerId].score,
            indexes: [flippedCards[0].index, flippedCards[1].index]
        });
        
        matchedPairs++;
        if (matchedPairs === images.length / 2) {
            broadcast({ type: 'gameOver' });
        }
    } else {
        broadcast({ type: 'unflip', indexes: [flippedCards[0].index, flippedCards[1].index] });
        switchTurn();
    }
    flippedCards = [];
}

function switchTurn() {
    let playerKeys = Object.keys(players);
    if (playerKeys.length > 0) {
        let currentIndex = playerKeys.indexOf(currentPlayer);
        currentPlayer = playerKeys[(currentIndex + 1) % playerKeys.length];
        broadcast({ type: 'switchTurn', currentPlayer });
    }
}

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

setInterval(() => {
    if (timeLeft > 0) {
        timeLeft--;
        broadcast({ type: 'timer', timeLeft });
    } else {
        broadcast({ type: 'gameOver' });
    }
}, 1000);

server.listen(8080, () => {
    console.log('Server running on http://localhost:8080');
});
