import { roundsCollectionRef } from './firebase.js';
import { displayWord } from './utilitats.js'; // Assegura't que toInternalWord existeix
import { fillFormDataFromRoundAndPlayer } from "./formulariRespostes.js";
const resultatsDiv = document.getElementById('resultats');
const rondaDisplay = document.getElementById('roundDisplay');


let currentRoundId = null;

// Escolta canvis a la ronda actual i mostra resultats
function showResultats(roundId) {
    currentRoundId = roundId;
    roundsCollectionRef.doc(roundId).onSnapshot((doc) => {
        const round = doc.data();
        renderResultats(round);
    });
}

function renderResultats(round) {
    if (!resultatsDiv) return;
    resultatsDiv.innerHTML = '';

    if (!round) {
        resultatsDiv.innerHTML = '<p>No hi ha dades per aquesta ronda.</p>';
        return;
    }

    // Mostra jugada mestra si existeix
    if (round.masterPlay) {
        //console.log("hi ha masterPlay")
        const master = round.masterPlay;
        const masterDiv = document.createElement('div');
        masterDiv.className = 'master-play-result';
        masterDiv.innerHTML = `
            <h4>Jugada mestra</h4>
            <p>
                <strong>Coords:</strong> ${master.coords || ''} <br>
                <strong>Paraula:</strong> ${master.word ? displayWord(master.word) : ''} <br>
                <strong>Direcció:</strong> ${master.direction || ''} <br>
                <strong>Punts:</strong> ${master.score ?? ''}
            </p>
        `;
        resultatsDiv.appendChild(masterDiv);
    }

    // Mostra respostes dels jugadors si existeixen
    if (round.results) {
        //ordena per punts descentents
        const resultats = Object.entries(round.results)
        const rsOrdreAlfabetic = resultats.sort((a, b) => {
            const playerA = a[1].word.toLowerCase();
            const playerB = b[1].word.toLowerCase();
            return playerA.localeCompare(playerB);
        });
       
        const sortedResults = rsOrdreAlfabetic.sort((a, b) => {
            const scoreA = a[1].score || 0;
            const scoreB = b[1].score || 0;
            return scoreB - scoreA;
        });
        //Si Jugada mestra existeix, posa'l al primer
        const masterPlay = sortedResults.find(([player]) => player.toLowerCase() === 'jugada mestra');
        if (masterPlay) {
            masterPlay[1].table = '';
            sortedResults.unshift(sortedResults.splice(sortedResults.indexOf(masterPlay), 1)[0]);
        }
       

        const table = document.createElement('table');
        table.className = 'table';            
        table.classList.add('table-hover');
        table.innerHTML = '<thead><tr><th>Taula</th><th>Jugador</th><th>Coord.</th><th>Paraula</th><th>Punts</th></tr></thead>';

        

// Modifica renderResultats per afegir la icona d'edició
// Substitueix la línia de table.innerHTML += ... per:
sortedResults.forEach(([player, data]) => {
    const tableDisplay = data.table || '';
    const coordinatesDisplay = data.coordinates || '';
    const wordDisplay = data.word ? displayWord(data.word,data.scraps) : '';
    const scoreDisplay = data.score !== undefined ? data.score : '';
    table.innerHTML += `
      <tr data-coords="${coordinatesDisplay}" data-word="${data.word}" data-scraps="${data.scraps}" data-player="${player}">
        <td>${tableDisplay}</td>
        <td>${player}</td>
        <td>${coordinatesDisplay}</td>
        <td>${wordDisplay}</td>
        <td>${scoreDisplay}</td>
        <td>
          <button type="button" class="btn btn-link btn-sm p-0 edit-result-btn" title="Edita" data-player="${player}">
            <i class="bi bi-pencil"></i>
          </button>
        </td>
      </tr>`;
});

        resultatsDiv.appendChild(table);
        // Afegir event listener per a cada fila
        const rows = table.querySelectorAll('tr');
        rows.forEach((row) => {
            row.addEventListener('click', () => {
                const coords = row.getAttribute('data-coords');
                const word = row.getAttribute('data-word');
                const scraps = row.getAttribute('data-scraps');
                const player = row.getAttribute('data-player');
                
                //setCoordinatesAndWord(coords, displayWord(word,scraps),scraps);
                document.getElementById('coords').value = coords;
                document.getElementById('coords').dispatchEvent(new Event('input')); // Trigger input event to update display
                document.getElementById('word').value = displayWord(word,scraps);   
                document.getElementById('scraps').value = scraps || '';
                document.getElementById('word').dispatchEvent(new Event('input')); // Trigger input event to update display
                // Omple el formulari amb les dades de la ronda i el jugador    
                //fillFormDataFromRoundAndPlayer(currentRoundId, player);
                //deixar la fila seleccionada activa fins que es faci clic a una altra
                rows.forEach((r) => r.classList.remove('table-active'));
                row.classList.add('table-active');

            });
        });
        // Després de crear la taula, afegeix aquest codi per als botons d'edició:
table.querySelectorAll('.edit-result-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const player = btn.getAttribute('data-player');
        const data = sortedResults.find(([p]) => p === player)?.[1];
        openEditResultModal(player, data, currentRoundId);
    });
});
    
    // Si no hi ha respostes, mostra un missatge
    } else {
        resultatsDiv.innerHTML += '<p>No hi ha respostes de jugadors per aquesta ronda.</p>';
    }
}

function openEditResultModal(player, data, roundId) {
    // Crea el modal si no existeix
    let modal = document.getElementById('editResultModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal fade mt-5';
        modal.id = 'editResultModal';
        modal.tabIndex = -1;
        modal.innerHTML = `
        <div class="modal-dialog">
          <form class="modal-content" id="editResultForm">
            <div class="modal-header">
              <h5 class="modal-title">Edita resultat de <span id="editPlayerName"></span></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
            <div class="mb-2">
                <label class="form-label">Nom</label>
                <input type="text" list="jugadorslistOptions" class="form-control" id="editPlayer">
              </div>
              <div class="mb-2">
                <label class="form-label">Taula</label>
                <input type="text" class="form-control" id="editTable">
              </div>
              <div class="mb-2">
                <label class="form-label">Coordenades</label>
                <input type="text" class="form-control" id="editCoords">
              </div>
              <div class="mb-2">
                <label class="form-label">Paraula</label>
                <input type="text" class="form-control" id="editWord">
                <div class="form-text">Marca els escarrassos en minúscula (ex: aBCde → B i C són fitxes normals, a, d, e són escarrassos)</div>
              </div>
              <div class="mb-2 d-none">
                <label class="form-label">Escarrassos</label>
                <input type="text" class="form-control" id="editScraps">
              </div>
              <div class="mb-2">
                <label class="form-label">Punts</label>
                <input type="number" class="form-control" id="editScore">
              </div>
              
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel·la</button>
              <button type="submit" class="btn btn-primary">Desa</button>
            </div>
          </form>
        </div>
        `;
        document.body.appendChild(modal);
    }

    // Omple el formulari amb les dades actuals
    document.getElementById('editPlayerName').textContent = player;
    document.getElementById('editPlayer').value = player;
    document.getElementById('editTable').value = data.table || '';
    document.getElementById('editCoords').value = data.coordinates || '';
    document.getElementById('editWord').value = displayWord(data.word || '', data.scraps);
    document.getElementById('editScraps').value = data.scraps || '';
    document.getElementById('editScore').value = data.score || '';

    // Assigna el submit handler
    const form = document.getElementById('editResultForm');
    form.onsubmit = async function(e) {
        e.preventDefault();
        const newPlayer = document.getElementById('editPlayer').value.trim();
        const wordInput = document.getElementById('editWord').value.trim();

        // Nova lògica: detecta escarrassos (minúscules) i tradueix la paraula a format intern
        let scraps = '';
        let internalWord = '';
        for (let c of wordInput) {
            if (c === c.toLowerCase() && c !== c.toUpperCase()) {
                scraps += c.toUpperCase();
                internalWord += c.toUpperCase();
            } else {
                internalWord += c;
            }
        }
        // Si tens una funció toInternalWord per als dígrafs, pots fer:
        // internalWord = toInternalWord(internalWord);

        const updatedData = {
            table: document.getElementById('editTable').value,
            coordinates: document.getElementById('editCoords').value,
            word: internalWord,
            scraps: scraps,
            score: Number(document.getElementById('editScore').value)
        };
        if (newPlayer !== player) {
            // Copia les dades al nou nom
            await roundsCollectionRef.doc(roundId).update({
                [`results.${newPlayer}`]: updatedData
            });
            // Esborra l'entrada antiga
            await roundsCollectionRef.doc(roundId).update({
                [`results.${player}`]: firebase.firestore.FieldValue.delete()
            });
        } else {
            // Nom igual, només actualitza dades
            await roundsCollectionRef.doc(roundId).update({
                [`results.${player}`]: updatedData
            });
        }
        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.hide();
    };

    // Mostra el modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}





export { showResultats };