import { gameInfoRef } from './firebase.js';
import { splitWordToTiles, displayLetter, letterValues } from './utilitats.js';

const rackTilesDiv = document.getElementById('rackTiles');

function renderRackTiles(rackString) {
    rackTilesDiv.innerHTML = '';
    const tiles = splitWordToTiles(rackString.toUpperCase());
    for (let i = 0; i < tiles.length; i++) {
        const letter = tiles[i];
        const div = document.createElement('div');
        div.className = 'rack-tile' + (letter === '?' ? ' scrap' : '');
        div.textContent = displayLetter(letter);

        // Afegeix dataset-letter i dataset-value
        div.dataset.letter = letter;
        div.dataset.value = (letter === '?' ? '0' : (letterValues[letter.toUpperCase()] ?? ''));

        const valueSpan = document.createElement('span');
        valueSpan.className = 'tile-value';
        valueSpan.textContent = (letter === '?' ? '0' : (letterValues[letter.toUpperCase()] ?? ''));
        div.appendChild(valueSpan);
        rackTilesDiv.appendChild(div);
    }
}

// Actualitza la vista prèvia del rack
function updateRackTilesPreview(word, scraps) {
    const rackTilesDiv = document.getElementById("rackTiles");
    if (!rackTilesDiv) return;
  
    // Mostra totes les fitxes primer
    Array.from(rackTilesDiv.children).forEach(
      (tile) => (tile.style.visibility = "visible")
    );
  
    const tiles = splitWordToTiles(word);
    // Crea una còpia de l'estat de les fitxes del rack (no només referència)
    let rackState = Array.from(rackTilesDiv.children).map((tile) => ({
      el: tile,
      letter: tile.dataset.letter?.toUpperCase() || tile.textContent.trim().charAt(0).toUpperCase(),
      isBlank: tile.dataset.value === "0" || tile.classList.contains("scrap"),
      used: false
    }));
  
    for (let i = 0; i < tiles.length; i++) {
      const isScrap = scraps.includes(i);
      const tileLetter = tiles[i].toUpperCase(); // Assegura't que sempre es compara en majúscules
  
      if (isScrap) {
        // Amaga la primera fitxa escarràs visible i no usada
        const blankTile = rackState.find(
          (t) => t.isBlank && !t.used && t.el.style.visibility !== "hidden"
        );
        if (blankTile) {
          blankTile.el.style.visibility = "hidden";
          blankTile.used = true;
        }
      } else {
        // Amaga la primera fitxa normal visible i no usada que coincideixi amb la lletra
        const normalTile = rackState.find(
          (t) => !t.isBlank && t.letter === tileLetter && !t.used && t.el.style.visibility !== "hidden"
        );
        if (normalTile) {
          normalTile.el.style.visibility = "hidden";
          normalTile.used = true;
        }
      }
    }
  }

// Escolta canvis al faristol a la base de dades
gameInfoRef.child('currentRack').on('value', (snapshot) => {
    const rack = snapshot.val() || '';
    renderRackTiles(rack);
});

export { renderRackTiles, updateRackTilesPreview };