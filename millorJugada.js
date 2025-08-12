import { findAllNewWords, calculateWordScoreWithNewTiles } from './calcul.js';

let wordSet = null;

// Carrega el diccionari des d'un fitxer .txt (una paraula per línia)
async function loadWordList(url) {
    const response = await fetch(url);
    const text = await response.text();
    wordSet = new Set(text.split(/\r?\n/).map(w => w.trim().toUpperCase()).filter(Boolean));
}

// Comprova si la col·locació "aixafa" lletres existents (allarga paraules ja fetes)
function isOverwriting(board, word, startRow, startCol, direction) {
    const size = board.length;
    const wordLen = word.length;
    // Comprova si abans o després de la paraula hi ha lletres (allargament il·legal)
    if (direction === 'horizontal') {
        // Abans
        if (startCol > 0 && board[startRow][startCol - 1] !== '') return true;
        // Després
        if (startCol + wordLen < size && board[startRow][startCol + wordLen] !== '') return true;
    } else {
        // Abans
        if (startRow > 0 && board[startRow - 1][startCol] !== '') return true;
        // Després
        if (startRow + wordLen < size && board[startRow + wordLen][startCol] !== '') return true;
    }
    return false;
}

// Troba les millors jugades possibles segons les regles de Scrabble
async function findBestPlays(board, rack, letterValues, multiplierBoard, wordListUrl, maxResults = 10) {
    if (!wordSet) await loadWordList(wordListUrl);

    const size = board.length;
    const plays = [];
    const seen = new Set(); // Per eliminar resultats repetits
    const directions = ['horizontal', 'vertical'];

    // Troba totes les caselles buides adjacents a fitxes ja col·locades (anchors)
    const anchors = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] !== '') continue;
            if (
                (r > 0 && board[r - 1][c] !== '') ||
                (r < size - 1 && board[r + 1][c] !== '') ||
                (c > 0 && board[r][c - 1] !== '') ||
                (c < size - 1 && board[r][c + 1] !== '')
            ) {
                anchors.push({ row: r, col: c });
            }
        }
    }
    // Si el tauler està buit (primera jugada), l'únic anchor és el centre
    if (anchors.length === 0) {
        const mid = Math.floor(size / 2);
        anchors.push({ row: mid, col: mid });
    }

    // Per cada direcció i anchor, prova totes les paraules del diccionari
    for (const direction of directions) {
        for (const anchor of anchors) {
            for (const word of wordSet) {
                const wordLen = word.length;
                for (let offset = 0; offset < wordLen; offset++) {
                    const startRow = direction === 'horizontal' ? anchor.row : anchor.row - offset;
                    const startCol = direction === 'horizontal' ? anchor.col - offset : anchor.col;
                    if (startRow < 0 || startCol < 0) continue;
                    if (
                        (direction === 'horizontal' && startCol + wordLen > size) ||
                        (direction === 'vertical' && startRow + wordLen > size)
                    ) continue;

                    // Comprova si la col·locació allarga una paraula existent (il·legal)
                    if (isOverwriting(board, word, startRow, startCol, direction)) continue;

                    // Comprova si encaixa amb el tauler i el rack
                    const rackArr = rack.toUpperCase().split('');
                    let rackCopy = [...rackArr];
                    let fits = false;
                    let valid = true;
                    for (let i = 0; i < wordLen; i++) {
                        const r = direction === 'horizontal' ? startRow : startRow + i;
                        const c = direction === 'horizontal' ? startCol + i : startCol;
                        const boardLetter = board[r][c];
                        const wordLetter = word[i];
                        if (boardLetter === '') {
                            const idx = rackCopy.indexOf(wordLetter);
                            if (idx !== -1) {
                                rackCopy.splice(idx, 1);
                                fits = true;
                            } else if (rackCopy.includes('?')) {
                                rackCopy.splice(rackCopy.indexOf('?'), 1);
                                fits = true;
                            } else {
                                valid = false;
                                break;
                            }
                        } else {
                            if (boardLetter.toUpperCase() !== wordLetter) {
                                valid = false;
                                break;
                            }
                        }
                    }
                    if (!valid || !fits) continue;

                    // Comprova que la paraula toca una fitxa ja col·locada (excepte primera jugada)
                    if (anchors.length > 1) {
                        let touchesExisting = false;
                        for (let i = 0; i < wordLen; i++) {
                            const r = direction === 'horizontal' ? startRow : startRow + i;
                            const c = direction === 'horizontal' ? startCol + i : startCol;
                            if (board[r][c] !== '') {
                                touchesExisting = true; // ja estava cobert
                            } else {
                                // Comprova si la casella buida està adjacent a una lletra del tauler
                                if (
                                    (r > 0 && board[r - 1][c] !== '') ||
                                    (r < size - 1 && board[r + 1][c] !== '') ||
                                    (c > 0 && board[r][c - 1] !== '') ||
                                    (c < size - 1 && board[r][c + 1] !== '')
                                ) {
                                    touchesExisting = true;
                                }
                            }
                        }
                        if (!touchesExisting) continue;
                    }

                    // Comprova que totes les paraules secundàries creades són vàlides
                    let allCrossWordsValid = true;
                    for (let i = 0; i < wordLen; i++) {
                        const r = direction === 'horizontal' ? startRow : startRow + i;
                        const c = direction === 'horizontal' ? startCol + i : startCol;
                        if (board[r][c] === '') {
                            // Mira si es crea una paraula secundària
                            let crossWord = word[i];
                            let before = 1;
                            let after = 1;
                            // Busca lletres abans
                            while (
                                (direction === 'horizontal' ? r - before : c - before) >= 0 &&
                                (direction === 'horizontal'
                                    ? board[r - before][c]
                                    : board[r][c - before]) !== ''
                            ) {
                                crossWord =
                                    (direction === 'horizontal'
                                        ? board[r - before][c]
                                        : board[r][c - before]) +
                                    crossWord;
                                before++;
                            }
                            // Busca lletres després
                            while (
                                (direction === 'horizontal'
                                    ? r + after
                                    : c + after) < size &&
                                (direction === 'horizontal'
                                    ? board[r + after][c]
                                    : board[r][c + after]) !== ''
                            ) {
                                crossWord +=
                                    direction === 'horizontal'
                                        ? board[r + after][c]
                                        : board[r][c + after];
                                after++;
                            }
                            if (crossWord.length > 1 && !wordSet.has(crossWord)) {
                                allCrossWordsValid = false;
                                break;
                            }
                        }
                    }
                    if (!allCrossWordsValid) continue;

                    // Elimina resultats repetits (mateixa paraula, posició i direcció)
                    const key = `${word}|${startRow}|${startCol}|${direction}`;
                    if (seen.has(key)) continue;
                    seen.add(key);

                    // Calcula la puntuació real de la jugada
                    const placement = {
                        word,
                        startRow,
                        startCol,
                        direction
                    };
                    const newWords = findAllNewWords(board, placement);
                    let score = 0;
                    newWords.forEach(w => {
                        score += calculateWordScoreWithNewTiles(
                            w.word,
                            w.startRow,
                            w.startCol,
                            w.direction,
                            board,
                            letterValues,
                            multiplierBoard,
                            w.newTiles
                        );
                    });
                    plays.push({ ...placement, score });
                }
            }
        }
    }

    // Ordena i mostra els millors resultats
    plays.sort((a, b) => b.score - a.score);
    const topPlays = plays.slice(0, maxResults);

   /*  topPlays.forEach(play => {
        // Si vertical: comença pel número, si horitzontal: per la lletra
        let pos;
        if (play.direction === 'vertical') {
            pos = `${play.startRow + 1}${String.fromCharCode(65 + play.startCol)}`;
        } else {
            pos = `${String.fromCharCode(65 + play.startRow)}${play.startCol + 1}`;
        }
        console.log(
            `Paraula: ${play.word} | Posició: ${pos} | Direcció: ${play.direction} | Punts: ${play.score}`
        );
    }); */

    return topPlays;
}

export { findBestPlays, loadWordList };