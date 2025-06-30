wordInput.addEventListener('input', () => {
    const word = wordInput.value;
    generateTileButtons(word);
});

// Events per seleccionar la direcció
horizontalBtn.addEventListener('click', () => {
    directionInput.value = 'horitzontal';
    horizontalBtn.classList.add('active');
    verticalBtn.classList.remove('active');
    formatCoordinatesOnDirectionChange(); // Formateja les coordenades al canviar la direcció
});

verticalBtn.addEventListener('click', () => {
    directionInput.value = 'vertical';
    verticalBtn.classList.add('active');
    horizontalBtn.classList.remove('active');
    formatCoordinatesOnDirectionChange(); // Formateja les coordenades al canviar la direcció
});

function formatCoordinatesOnDirectionChange() {
    const currentCoordinates = coordinatesInput.value.trim().toUpperCase();
    const direction = directionInput.value;

    if (currentCoordinates.length === 2) {
        const letter = currentCoordinates.match(/[A-Za-z]/);
        const number = currentCoordinates.match(/[0-9]/);

        if (letter && number) {
            if (direction === 'horitzontal') {
                coordinatesInput.value = `${letter[0].toUpperCase()}${number[0]}`;
            } else if (direction === 'vertical') {
                coordinatesInput.value = `${number[0]}${letter[0].toUpperCase()}`;
            }
        }
    }
}

// Event per enviar el formulari
responseForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const playerName = playerNameInput.value.trim();
    const coordinates = coordinatesInput.value.trim().toUpperCase();
    const direction = directionInput.value;
    let word = wordInput.value.trim().toUpperCase();
    const scraps = JSON.parse(scrapsInput.value || '[]');

    if (!playerName) {
        messageDiv.textContent = 'Si us plau, introdueix el teu nom o número de taula.';
        messageDiv.classList.add('alert', 'alert-danger');
        return;
    }

    if (!direction) {
        messageDiv.textContent = 'Si us plau, selecciona la direcció.';
        messageDiv.classList.add('alert', 'alert-danger');
        return;
    } 

    // Formateja la paraula amb els escarrassos en minúscula
    let formattedWord = '';
    for (let i = 0; i < word.length; i++) {
        if (scraps.includes(i)) {
            formattedWord += word[i].toLowerCase();
        } else {
            formattedWord += word[i];
        }
    }

    // Obté el número de ronda actual i el faristol de la interfície
    const currentRoundDisplayed = roundNumberDisplay.textContent;
    const currentRackDisplayed = currentRackDisplay.textContent;

    // Desa la resposta a la base de dades sota la ronda actual i el nom del jugador
    database.ref(`rounds/${currentRoundDisplayed}/${playerName}`).set({ // Utilitza la ronda mostrada
        coordinates: coordinates,
        direction: direction,
        word: formattedWord,
        scraps: scraps,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        round: currentRoundDisplayed, // Desa la ronda
        rack: currentRackDisplayed // Desa el faristol
    })
    .then(() => {
        messageDiv.textContent = 'Resposta enviada correctament!';
        messageDiv.classList.remove('alert', 'alert-danger');
        messageDiv.classList.add('alert', 'alert-success');
        responseForm.reset();
        tileButtonsDiv.innerHTML = ''; // Neteja els botons de les fitxes
        directionInput.value = '';
        horizontalBtn.classList.remove('active');
        verticalBtn.classList.remove('active');

        // Restaura el nom del jugador des de localStorage
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            playerNameInput.value = savedName;
        }

        // Guarda el nom del jugador al localStorage (per si no hi era prèviament o s'ha modificat)
        localStorage.setItem('playerName', playerName);
    })
    .catch((error) => {
        console.error("Error en enviar la resposta:", error);
        messageDiv.textContent = 'Error en enviar la resposta. Si us plau, intenta-ho de nou.';
        messageDiv.classList.remove('alert', 'alert-success');
        messageDiv.classList.add('alert', 'alert-danger');
    });
});
