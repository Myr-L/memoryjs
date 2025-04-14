const socket = new WebSocket('ws://localhost:8080');
let playerId;
let score = 0;
let gameBoard = document.getElementById('gameBoard');
let scoreDisplay = document.getElementById('score');
let flippedCards = {};
let timeLeft = 60;
let timerDisplay = document.getElementById('timer') || document.createElement('h3');
timerDisplay.id = 'timer';
document.body.insertBefore(timerDisplay, gameBoard);

// Cargar sonidos
const correctSound = new Audio('sounds/correct.mp3');
const wrongSound = new Audio('sounds/wrong.mp3');

socket.onmessage = function(event) {
    let data = JSON.parse(event.data);
    if (data.type === 'init') {
        playerId = data.playerId;
        document.getElementById('playerId').innerText = playerId;
        createBoard(data.images);
    } else if (data.type === 'flip') {
        flipCard(data.index, data.image);
    } else if (data.type === 'unflip') {
        setTimeout(() => {
            unflipCards(data.indexes);
            wrongSound.play(); // Sonido de fallo
        }, 1000);
    } else if (data.type === 'match') {
        if (data.playerId === playerId) {
            score = data.score;
            scoreDisplay.innerText = score;
        }
        setTimeout(() => {
            removeMatchedCards(data.indexes);
            correctSound.play(); // Sonido de acierto
        }, 1000);
    } else if (data.type === 'timer') {
        timeLeft = data.timeLeft;
        if (timerDisplay) {
            timerDisplay.innerText = `Tiempo restante: ${timeLeft}s`;
        }
    } else if (data.type === 'gameOver') {
        alert('¡Juego terminado! Recarga para jugar otra vez.');
    }
};

// Si el servidor no maneja el temporizador, iniciar uno localmente
setInterval(() => {
    if (timeLeft > 0) {
        timeLeft--;
        timerDisplay.innerText = `Tiempo restante: ${timeLeft}s`;
    }
}, 1000);

function createBoard(images) {
    gameBoard.innerHTML = '';
    images.forEach((_, index) => {
        let card = document.createElement('div');
        card.classList.add('card');
        card.dataset.index = index;
        let cardInner = document.createElement('div');
        cardInner.classList.add('card-inner');
        let cardFront = document.createElement('div');
        cardFront.classList.add('card-front');
        cardFront.innerText = '?';
        let cardBack = document.createElement('div');
        cardBack.classList.add('card-back');
        cardBack.style.backgroundImage = "url('" + images[index] + "')";
        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        card.appendChild(cardInner);
        card.addEventListener('click', () => sendFlip(index));
        gameBoard.appendChild(card);
    });
}

function sendFlip(index) {
    if (!flippedCards[index]) {
        socket.send(JSON.stringify({ type: 'flip', index }));
    }
}

function flipCard(index, image) {
    let card = document.querySelector(`[data-index="${index}"]`);
    card.classList.add('flipped');
    flippedCards[index] = true;
}

function unflipCards(indexes) {
    indexes.forEach(index => {
        let card = document.querySelector(`[data-index="${index}"]`);
        card.classList.remove('flipped');
        delete flippedCards[index];
    });
}

function removeMatchedCards(indexes) {
    indexes.forEach(index => {
        let card = document.querySelector(`[data-index="${index}"]`);
        setTimeout(() => card.remove(), 500);
    });
}