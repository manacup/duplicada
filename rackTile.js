import { gameInfoRef, historyRef } from "./firebase.js";
import {
  splitWordToTiles,
  displayLetter,
  letterValues,
  tileDistribution,
} from "./utilitats.js";
import { updateTileButtonsFromForm } from "./formulariRespostes.js";
import { getTileAt } from "./tauler.js";

const rackTilesDiv = document.getElementById("rackTiles");
const sacTilesDiv = document.getElementById("sacTiles");

function renderRackTiles(rackString) {
  rackTilesDiv.innerHTML = "";
  const tiles = splitWordToTiles(rackString.toUpperCase());
  for (let i = 0; i < tiles.length; i++) {
    const letter = tiles[i];
    const div = document.createElement("div");
    div.className = "rack-tile" + (letter === "?" ? " scrap" : "");
    div.textContent = displayLetter(letter);
    // Afegeix les dades per al modal
    // Si la lletra és '?', afegeix els atributs per al modal
    // Assegura't que el modal té l'ID "lettersModal"
    // i que Bootstrap està carregat correctament

    if (letter === "?") {
      //console.log("es una fitxa escarràs", div);
      div.dataset.bsToggle = "modal";
      div.dataset.bsTarget = "#lettersModal"; // Assegura't que el modal té aquest ID
    }

    // Afegeix dataset-letter i dataset-value
    div.dataset.letter = letter;
    div.dataset.value =
      letter === "?" ? "0" : letterValues[letter.toUpperCase()] ?? "";

    const valueSpan = document.createElement("span");
    valueSpan.className = "tile-value";
    valueSpan.textContent =
      letter === "?" ? "0" : letterValues[letter.toUpperCase()] ?? "";
    div.appendChild(valueSpan);
    rackTilesDiv.appendChild(div);
  }
}

// Mostra el sac de fitxes
function renderSacTiles(sacString) {
  sacTilesDiv.innerHTML = "";
  const tiles = splitWordToTiles(sacString.toUpperCase());
  for (let i = 0; i < tiles.length; i++) {
    const letter = tiles[i];
    const div = rederTile(letter, true);
    sacTilesDiv.appendChild(div);
  }
}
function rederTile(letter, valor = true) {
  // Crea un element div per la fitxa
  const div = document.createElement("div");
  div.className = "rack-tile" + (letter === "?" ? " scrap" : "");
  div.textContent = displayLetter(letter);

  // Afegeix dataset-letter i dataset-value
  if (valor) {
    div.dataset.letter = letter;
    div.dataset.value =
      letter === "?" ? "0" : letterValues[letter.toUpperCase()] ?? "";

    const valueSpan = document.createElement("span");
    valueSpan.className = "tile-value";
    valueSpan.textContent =
      letter === "?" ? "0" : letterValues[letter.toUpperCase()] ?? "";
    div.appendChild(valueSpan);
  }
  return div;
}

// Actualitza la vista prèvia del rack
function updateRackTilesPreview(word, scraps) {
  const rackTilesDiv = document.getElementById("rackTiles");
  if (!rackTilesDiv) return;

  // Mostra totes les fitxes primer
  Array.from(rackTilesDiv.children).forEach((tile) =>
    tile.classList.remove("seleccionada")
  );

  const tiles = splitWordToTiles(word);
  // Crea una còpia de l'estat de les fitxes del rack (no només referència)
  let rackState = Array.from(rackTilesDiv.children).map((tile) => ({
    el: tile,
    letter:
      tile.dataset.letter?.toUpperCase() ||
      tile.textContent.trim().charAt(0).toUpperCase(),
    isBlank: tile.dataset.value === "0" || tile.classList.contains("scrap"),
    used: false,
  }));

  for (let i = 0; i < tiles.length; i++) {
    const isScrap = scraps.includes(i);
    const tileLetter = tiles[i].toUpperCase(); // Assegura't que sempre es compara en majúscules

    if (isScrap) {
      // Amaga la primera fitxa escarràs visible i no usada
      const blankTile = rackState.find(
        (t) => t.isBlank && !t.used && t.el.style.opacity !== "100%"
      );
      if (blankTile) {
        blankTile.el.classList.add("seleccionada");
        blankTile.used = "hidden";
        blankTile.used = true;
      }
    } else {
      // Amaga la primera fitxa normal visible i no usada que coincideixi amb la lletra
      const normalTile = rackState.find(
        (t) =>
          !t.isBlank &&
          t.letter === tileLetter &&
          !t.used &&
          t.el.style.opacity !== "50%"
      );
      if (normalTile) {
        normalTile.el.classList.add("seleccionada");
        normalTile.used = "hidden";
        normalTile.used = true;
      }
    }
  }
}

const wordInput = document.getElementById("word");
const coordsInput = document.getElementById("coords");
const directionInput = document.getElementById("direction");
const scrapsInput = document.getElementById("scraps");

// Habilita l'entrada de fitxes del rack
function enableRackTileInput() {
  rackTilesDiv.addEventListener("click", function (e) {
    const tile = e.target.closest(".rack-tile");
    console.log("tile", tile);
    if (!tile) return;
    if (tile.classList.contains("scrap")) {
      // Marca/desmarca la fitxa escarràs
      // Si és una fitxa escarràs, obre un modal amb totes les possibilitats
      const currentScraps = JSON.parse(scrapsInput.value || "[]");
      currentScraps.push(wordInput.value.length - 1); // Afegim la posició de la fitxa escarràs
      //scrapsInput.value = JSON.stringify(currentScraps);
      return;
    }
    // Si la fitxa ja està seleccionada, no fa res
    if (tile.classList.contains("seleccionada")) {
      return;
    }
    const letter = tile.dataset.letter || tile.textContent.trim().charAt(0);
    if (letter) {
      wordInput.value += displayLetter(letter); // Mostra el dígraf si és necessari
      // Si és una fitxa escarràs, afegeix a scraps

      wordInput.dispatchEvent(new Event("input")); // Per si hi ha listeners
    }
  });
}
// Crida la funció després de renderitzar el rack
enableRackTileInput();

const modal = document.getElementById("lettersModal");
new bootstrap.Modal(modal); // Assegura't que tens una classe Modal que gestioni el modal

function ompleModalWithLetters() {
  const modalContent = document.getElementById("scrapButtons");
  modalContent.innerHTML = ""; // Neteja el contingut existent

  // Obtenim totes les fitxes del sac
  const tiles = Object.keys(tileDistribution).filter(
    (letter) => letter !== "?"
  ); // Excloem les fitxes escarràs
  const currentScraps = JSON.parse(scrapsInput.value || "[]");
  // Creem un div per cada lletra
  tiles.forEach((letter) => {
    const div = rederTile(letter, false);
    div.dataset.bsDismiss = "modal"; // Classe per estilitzar al modal
    div.addEventListener("click", () => {
      wordInput.value += displayLetter(letter.toLowerCase()); // Afegeix la lletra al camp de paraula
      wordInput.dispatchEvent(new Event("input"));

      currentScraps.push(wordInput.value.length - 1); // Afegeix la posició de la fitxa escarràs
      scrapsInput.value = JSON.stringify(currentScraps);
      wordInput.dispatchEvent(new Event("input"));
      //scrapsInput.dispatchEvent(new Event("input"));
      //wordInput.dispatchEvent(new Event("input")); // Per si hi ha listeners
      // Aquí pots afegir la lògica per actualitzar el rack si cal
      /*  const rackTiles = document.querySelectorAll(".rack-tile");
      rackTiles.forEach((tile) => {
        if (tile.dataset.letter === '?') {
          tile.classList.add("seleccionada"); // Marca la fitxa com seleccionada
        }
      });
      modal.style.display = "none"; // Tanca el modal després de seleccionar */
      // Actualitza els botons de les fitxes i la vista del rack
      //generateTileButtons(wordInput.value || "");
      // Re-apply the scrap visual state based on the loaded scraps
      // Marca només el botó corresponent a la nova posició de scrap, sense modificar els altres
      const tileButtonsDiv = document.getElementById("tileButtons");
      const tileButtons = tileButtonsDiv.querySelectorAll('.tile-button');
      const newScrapIndex = wordInput.value.length - 1;
      tileButtons.forEach((button, idx) => {
        const index = parseInt(button.dataset.index);
        if (index === newScrapIndex) {
          button.classList.add("scrap");
          // Actualitza només aquest botó amb la lletra i valor d'escarràs
          button.textContent = displayLetter(letter.toLowerCase());
          let valueSpan = button.querySelector(".tile-value");
          if (!valueSpan) {
            valueSpan = document.createElement("span");
            valueSpan.className = "tile-value";
            button.appendChild(valueSpan);
          }
          valueSpan.textContent = "0";
        }
      });


      updateRackTilesPreview(wordInput.value || "", currentScraps);
      // Dins el click del modal, després d'afegir la lletra i actualitzar scrapsInput:
      const rackTiles = document.querySelectorAll(".rack-tile.scrap:not(.scrap-fixed)");
      if (rackTiles.length > 0) {
        // Només el primer escarràs lliure
        const rackTile = rackTiles[0];
        rackTile.classList.add("scrap-fixed");
        rackTile.removeAttribute("data-bs-toggle");
        rackTile.removeAttribute("data-bs-target");
      }
    });
    modalContent.appendChild(div);
  });


}
ompleModalWithLetters();
// Quan es desselecciona un escarràs (al click del botó de paraula):
const rackTiles = document.querySelectorAll(".rack-tile");
rackTiles.forEach((tile) => {
  if (tile.classList.contains("scrap-fixed")) {
    tile.classList.remove("scrap-fixed");
    tile.setAttribute("data-bs-toggle", "modal");
    tile.setAttribute("data-bs-target", "#lettersModal");
  }
});

/* rackTilesDiv.addEventListener("click", function (e) {
  const tile = e.target.closest(".rack-tile");
  if (!tile) return;

  // Comprova que hi ha coordenades i direcció
  const coords = coordsInput.value.trim().toUpperCase();
  const direction = directionInput.value;
  if (!coords || !direction) {
    alert("Has de seleccionar primer la casella inicial i la direcció!");
    return;
  }

  // Calcula la posició inicial
  const letter = coords.match(/[A-Z]/)?.[0];
  const number = parseInt(coords.match(/[0-9]+/)?.[0]);
  let row = letter ? letter.charCodeAt(0) - 65 : -1;
  let col = number ? number - 1 : -1;
  if (row < 0 || col < 0) return;

  // Obté la paraula ja escrita (potser dels tileButtons o del wordInput)
  let word = wordInput.value || "";
  let wordArr = word.split("");
  let idx = wordArr.length;

  // Busca la primera casella buida a partir de la longitud de la paraula
  let found = false;
  let maxTries = 15; // Evita bucles infinits
  while (!found && idx < 15 && maxTries-- > 0) {
    let r = row, c = col;
    if (direction === "horizontal") c += idx;
    else r += idx;

    const tileInfo = getTileAt(r, c);
    if (!tileInfo) {
      // Fora de límits, atura
      break;
    }
    if (!tileInfo.letter) {
      // Casella buida: posa la fitxa seleccionada
      const rackLetter = tile.dataset.letter || tile.textContent.trim().charAt(0);
      wordArr[idx] = rackLetter;
      // Si és escarràs, afegeix a scrapsInput
      if (tile.classList.contains("scrap")) {
        let scraps = JSON.parse(scrapsInput.value || "[]");
        scraps.push(idx);
        scrapsInput.value = JSON.stringify(scraps);
      }
      found = true;
    } else {
      // Casella ocupada: afegeix la lletra de la casella
      wordArr[idx] = tileInfo.letter;
      // Si la casella és escarràs, afegeix a scrapsInput
      if (tileInfo.isScrap) {
        let scraps = JSON.parse(scrapsInput.value || "[]");
        scraps.push(idx);
        scrapsInput.value = JSON.stringify(scraps);
      }
      idx++;
    }
  } 

  // Actualitza el wordInput i la vista
  wordInput.value = wordArr.join("");
  wordInput.dispatchEvent(new Event("input"));
  updateRackTilesPreview(wordInput.value, JSON.parse(scrapsInput.value || "[]"));
});*/

export { renderRackTiles, updateRackTilesPreview, renderSacTiles };
