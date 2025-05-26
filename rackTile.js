import { gameInfoRef, historyRef } from "./firebase.js";
import {
  splitWordToTiles,
  displayLetter,
  letterValues,
  tileDistribution,
  getNextCell,
  normalizeWordInput
} from "./utilitats.js";
import { updateTileButtonsFromForm ,boardBeforeMasterPlay,renderScrapTileButtons} from "./formulariRespostes.js";
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
          !t.used /* &&
          t.el.style.opacity !== "50%" */
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
    if(coordsInput.value.trim() === "") {
      alert("Si us plau, omple les coordenades abans de seleccionar una fitxa del rack.");
      return;
    }
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

    escriuSeguentFitxa()
    renderScrapTileButtons()

  });

 
}

function shuffleRackTiles() {
  const tiles = Array.from(rackTilesDiv.children);
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    rackTilesDiv.insertBefore(tiles[j], tiles[i]);
  }
}
document.getElementById("shuffleFaristolBtn").addEventListener("click", shuffleRackTiles);

// Crida la funció després de renderitzar el rack
enableRackTileInput();

function escriuSeguentFitxa(){
      const coordValue = document.getElementById("coords").value.trim().toUpperCase();
    let selectedRow = -1,
      selectedCol = -1;
    if (coordValue) {
      const letter = coordValue.match(/[A-Z]/)?.[0];
      const number = parseInt(coordValue.match(/[0-9]+/)?.[0]);
      if (letter && number) {
        if (directionInput.value === "horizontal") {
          selectedRow = letter.charCodeAt(0) - 65;
          selectedCol = number - 1;
        } else if (directionInput.value === "vertical") {
          selectedRow = letter.charCodeAt(0) - 65;
          selectedCol = number - 1;
        }
      }
      const nextCell = getNextCell(selectedRow, selectedCol, directionInput.value, normalizeWordInput(wordInput.value));
      console.log("nextCell", nextCell)
      if (nextCell) {
        const tileAt = getTileAt(nextCell.row, nextCell.col, boardBeforeMasterPlay);
        if (tileAt) {
          console.log( "tileAt", tileAt);
          wordInput.value += displayLetter(tileAt.letter); // Afegeix la lletra de la cel·la al camp de coordenades
          

          //si la cel·la és una fitxa escarràs, afegeix a scraps
          const currentScraps = JSON.parse(scrapsInput.value || "[]");
          if (tileAt.isScrap) {
            currentScraps.push(wordInput.value.length - 1); // Afegeix la posició de la fitxa escarràs
            scrapsInput.value = JSON.stringify(currentScraps);
          } 
        wordInput.dispatchEvent(new Event("input")); // Per si hi ha listeners
        scrapsInput.dispatchEvent(new Event("input")); // Per si hi ha listeners
        
        }
      } else {
        console.warn("No s'ha pogut trobar la següent cel·la per a les coordenades.");
      }
    }
}

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
      //const totalLetres = normalizeWordInput(wordInput.value).length;
      const currentScraps = JSON.parse(scrapsInput.value || "[]");
      wordInput.value += displayLetter(letter.toLowerCase()); // Afegeix la lletra al camp de paraula
      

      currentScraps.push(normalizeWordInput(wordInput.value).length-1); // Afegeix la posició de la fitxa escarràs
      console.log("currentScraps", currentScraps,normalizeWordInput(wordInput.value).length);
      scrapsInput.value = JSON.stringify(currentScraps);
      wordInput.dispatchEvent(new Event("input"));

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


      //updateRackTilesPreview(wordInput.value || "", currentScraps);   
      //escriuSeguentFitxa()
      renderScrapTileButtons()
    });
    modalContent.appendChild(div);
  });


}
ompleModalWithLetters();


//listener al racktilesdiv que si un escarràs té el .seleccionada, elimina el data-bs-toggle i data-bs-target, si no té .seleccionada i no te data-bs-toggle i data-bs-target, afegeix-los
rackTilesDiv.addEventListener("change", function (e) {
  this.querySelectorAll(".rack-tile").forEach((tile) => {
    
  if (!tile) return;
  if (tile.classList.contains("seleccionada")) {
    tile.removeAttribute("data-bs-toggle");
    tile.removeAttribute("data-bs-target");
  } else {
    tile.dataset.bsToggle = "modal";
    tile.dataset.bsTarget = "#lettersModal";
  }
});
}
);



export { renderRackTiles, updateRackTilesPreview, renderSacTiles };
