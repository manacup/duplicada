// Admin side logic

import { database } from './config.js';

// Referències Firebase (utilitzant l'objecte database importat)
const gameInfoRef = database.ref('gameInfo');
const responsesRef = database.ref('rounds');
const formEnabledRef = database.ref('formEnabled');
const historyRef = database.ref('gameInfo/history'); // Referència a l'historial

// Referències als elements del DOM
const configForm = document.getElementById('configForm');
const roundNumberInput = document.getElementById('roundNumber');
const currentRackInput = document.getElementById('currentRack');
const messageDiv = document.getElementById('message');
const responsesAccordion = document.getElementById('responsesAccordion');
const toggleFormButton = document.getElementById('toggleFormButton');

// Funció per actualitzar l'estat del botó
function updateToggleButton(isEnabled) {
    if (isEnabled) {
        toggleFormButton.textContent = 'Desactivar Formulari de Respostes';
        toggleFormButton.classList.remove('btn-danger');
        toggleFormButton.classList.add('btn-success');
    } else {
        toggleFormButton.textContent = 'Activar Formulari de Respostes';
        toggleFormButton.classList.remove('btn-success');
        toggleFormButton.classList.add('btn-danger');
    }
}

// Escolta els canvis en l'estat del formulari
formEnabledRef.on('value', (snapshot) => {
    const isEnabled = snapshot.val();
    updateToggleButton(isEnabled);
});

// Event per canviar l'estat del formulari
toggleFormButton.addEventListener('click', () => {
    const currentState = toggleFormButton.textContent.includes('Activar');
    formEnabledRef.set(currentState); // Inverteix l'estat
});

// Quan el DOM estigui completament carregat
document.addEventListener('DOMContentLoaded', () => {
    // Llegeix la ronda i el faristol actuals de gameInfo
    gameInfoRef.once('value', (snapshot) => {
        const currentGameInfo = snapshot.val();
        if (currentGameInfo && currentGameInfo.currentRound) {
            roundNumberInput.value = currentGameInfo.currentRound;
        }
        if (currentGameInfo && currentGameInfo.currentRack) {
            currentRackInput.value = currentGameInfo.currentRack;
        }
    });

    // Inicialitza la visualització de les respostes
    updateAllRoundResponses();
});

 configForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const newRoundNumber = parseInt(roundNumberInput.value);
    const newRack = currentRackInput.value.trim().toUpperCase();

    if (!newRoundNumber || !newRack) {
        messageDiv.textContent = 'Si us plau, introdueix un número de ronda i un faristol vàlids.';
        messageDiv.className = 'alert alert-danger';
        return;
    }

    // Desactiva el botó per evitar múltiples enviaments
    const submitButton = configForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Actualitzant...';

    gameInfoRef.once('value', (snapshot) => {
        const currentGameInfo = snapshot.val();
        const currentRound = currentGameInfo && currentGameInfo.currentRound;

        if (newRoundNumber !== currentRound && currentGameInfo && currentGameInfo.currentRound) {
            // Desa la informació de la ronda anterior a l'historial
            historyRef.child(currentGameInfo.currentRound).set(currentGameInfo.currentRack);
        } else if (newRoundNumber === currentRound && currentGameInfo && currentGameInfo.currentRack !== newRack) {
            // Adverteix sobre el canvi de faristol sense canviar la ronda
            messageDiv.textContent = 'Atenció: Estàs canviant el faristol sense canviar el número de ronda.';
            messageDiv.className = 'alert alert-warning';
            submitButton.disabled = false;
            submitButton.textContent = 'Actualitzar';
            return;
        }

        // Actualitza la informació actual de la ronda i el faristol
        gameInfoRef.update({ currentRound: newRoundNumber, currentRack: newRack })
            .then(() => {
                messageDiv.textContent = 'Ronda i faristol actualitzats correctament!';
                messageDiv.className = 'alert alert-success';
                updateAllRoundResponses(); // Actualitza les respostes al canviar de ronda
            })
            .catch((error) => {
                console.error("Error en actualitzar la ronda i el faristol:", error);
                messageDiv.textContent = 'Error en actualitzar la ronda i el faristol. Si us plau, intenta-ho de nou.';
                messageDiv.className = 'alert alert-danger';
            })
            .finally(() => {
                // Re-activa el botó
                submitButton.disabled = false;
                submitButton.textContent = 'Actualitzar';
            });
    });
});

// Funció per obtenir i mostrar les respostes de totes les rondes
function updateAllRoundResponses() {
    responsesRef.on('value', (snapshot) => {
        const allRoundData = snapshot.val();
        responsesAccordion.innerHTML = '<h2>Respostes per Ronda</h2><div class="accordion" id="roundResponsesAccordion">'; // Inicialitza l'acordió de Bootstrap
        const accordionElement = document.getElementById('roundResponsesAccordion');

        // Recupera l'historial de faristols per ronda
        historyRef.once('value', (historySnapshot) => {
            const historyData = historySnapshot.val();

            if (allRoundData) {
                Object.entries(allRoundData).forEach(([roundNumber, roundData]) => {
                    const accordionItem = document.createElement('div');
                    accordionItem.className = 'accordion-item';

                    const headingId = `headingRound${roundNumber}`;
                    const collapseId = `collapseRound${roundNumber}`;
                    const isFirstRound = accordionElement.children.length === 0; // Per mostrar la primera ronda oberta

                    const header = document.createElement('h2');
                    header.className = 'accordion-header';
                    header.id = headingId;

                    const button = document.createElement('button');
                    button.className = `accordion-button ${!isFirstRound ? 'collapsed' : ''}`;
                    button.type = 'button';
                    button.setAttribute('data-bs-toggle', 'collapse');
                    button.setAttribute('data-bs-target', `#${collapseId}`);
                    button.setAttribute('aria-expanded', isFirstRound ? 'true' : 'false');
                    button.setAttribute('aria-controls', collapseId);

                    let roundTitle = `Ronda ${roundNumber}`;
                    if (historyData && historyData[roundNumber]) {
                        roundTitle += ` (Faristol: ${historyData[roundNumber]})`;
                    }
                    button.textContent = roundTitle; // Títol de la ronda amb el faristol

                    header.appendChild(button);
                    accordionItem.appendChild(header);

                    const collapse = document.createElement('div');
                    collapse.id = collapseId;
                    collapse.className = `accordion-collapse collapse ${isFirstRound ? 'show' : ''}`;
                    collapse.setAttribute('aria-labelledby', headingId);
                    collapse.setAttribute('data-bs-parent', '#roundResponsesAccordion');

                    const body = document.createElement('table');
                    body.className = 'accordion-body table table-striped';
                    body.innerHTML = '<thead><tr><th>Nom del Jugador</th><th>Coordenades</th><th>Paraula</th><th>Ronda</th></tr></thead>';

                    if (roundData) {
                        Object.entries(roundData).forEach(([playerName, playerData]) => {
                            const coordinatesDisplay = playerData.coordinates;
                            const roundDisplay = playerData.round ? `(Ronda: ${playerData.round})` : ''; // Obté la ronda desada
                            const rackDisplay = playerData.rack ? `(Faristol: ${playerData.rack})` : ''; // Obté el faristol desat
                            body.innerHTML += `<tr><td>${playerName}</td><td>${coordinatesDisplay}</td><td>${playerData.word}</td><td>${roundDisplay} ${rackDisplay}</td></tr>`;
                            //body.innerHTML += `<strong>${playerName}:</strong> ${coordinatesDisplay}, ${playerData.word}<br>`;
                        });
                    } else {
                        body.innerHTML = '<p>No hi ha respostes per a aquesta ronda.</p>';
                    }

                    collapse.appendChild(body);
                    accordionItem.appendChild(collapse);
                    accordionElement.appendChild(accordionItem);
                });
            } else {
                responsesAccordion.innerHTML += '<p>Encara no hi ha respostes registrades.</p>';
            }
            responsesAccordion.appendChild(accordionElement); // Afegim l'acordió complet al contenidor principal
        });
    });
}
// Admin side logic