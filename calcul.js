/**
 * Calcula la puntuació d'una paraula col·locada al tauler.
 *
 * @param {Array<Array<string>>} board - El tauler de joc (matriu 2D).
 * @param {Array<{word: string, startRow: number, startCol: number, direction: string}>} newWordsInfo - Array d'objectes amb info de les paraules noves.
 * @param {object} letterValues - Objecte amb el valor de cada lletra (ex: { A: 1, B: 3, ... }).
 * @param {Array<Array<string>>} multiplierBoard - Tauler amb els multiplicadors de cada casella (ex: [['TW', '', 'DL', ...], ...]).  Pot ser null si no hi ha multiplicadors
 * @returns {number} - La puntuació total de la jugada.
 */
function calculateScore(board, newWordsInfo, letterValues, multiplierBoard = null) {
    console.log('[calculateScore] IN:', { board, newWordsInfo, letterValues, multiplierBoard });
    let totalScore = 0;

    newWordsInfo.forEach(wordInfo => {
        let { word, startRow, startCol, direction } = wordInfo;
        // NO convertir a majúscules aquí, ja que volem conservar minúscules per escarrassos
        let wordScore = 0;
        let wordMultiplier = 1;

        // Comptar lletres noves abans de modificar el tauler
        let newLettersPlaced = countNewLetters(board, wordInfo);

        for (let i = 0; i < word.length; i++) {
            const row = startRow + (direction === 'vertical' ? i : 0);
            const col = startCol + (direction === 'horizontal' ? i : 0);
            const letter = word[i];

            let letterScore;
            let multiplierType = null;
            let multiplierValue = 1;

            if (multiplierBoard && multiplierBoard[row][col]) {
                const mult = multiplierBoard[row][col];
                if (mult === 'DL') { multiplierType = 'L'; multiplierValue = 2; }
                else if (mult === 'TL') { multiplierType = 'L'; multiplierValue = 3; }
                else if (mult === 'DW') { multiplierType = 'W'; multiplierValue = 2; }
                else if (mult === 'TW') { multiplierType = 'W'; multiplierValue = 3; }
            }

            // Si la lletra és minúscula, és un escarràs (valor 0)
            if (board[row][col] === '') {
                if (letter === letter.toLowerCase()) {
                    letterScore = 0;
                } else {
                    letterScore = letterValues[letter] || 0;
                }
                if (multiplierBoard) {
                    if (multiplierType === 'L') {
                        letterScore *= multiplierValue;
                    } else if (multiplierType === 'W') {
                        wordMultiplier *= multiplierValue;
                    }
                }
            } else {
                if (letter === letter.toLowerCase()) {
                    letterScore = 0;
                } else {
                    letterScore = letterValues[letter] || 0;
                }
            }
            wordScore += letterScore;
        }
        wordScore *= wordMultiplier;
        console.log("total lletres noves:" + newLettersPlaced);
        // Bonificació: si s'han col·locat 7 o més lletres noves en aquesta jugada
        if (newLettersPlaced >= 7) {
            wordScore += 50;
            console.log('[calculateScore] BONUS 50 punts per 7 o més lletres noves!');
        }
        totalScore += wordScore;
        console.log(`[calculateScore] Paraula principal "${word}" puntuació:`, wordScore);
    });

    let additionalWordsScore = calculateAdditionalWordsScore(board, newWordsInfo, letterValues, multiplierBoard);
    totalScore += additionalWordsScore;

    console.log('[calculateScore] OUT: totalScore =', totalScore);
    return totalScore;
}

/**
 * Calcula la puntuació de les paraules addicionals formades per la nova jugada.
 *
 * @param {Array<Array<string>>} board - El tauler de joc.
 * @param {Array<{word: string, startRow: number, startCol: number, direction: string}>} newWordsInfo - Informació de les paraules noves col·locades.
 * @param {object} letterValues - Valors de les lletres.
 * @param {Array<Array<string>>} multiplierBoard - Tauler de multiplicadors.
 * @returns {number} - Puntuació total de les paraules addicionals.
 */
function calculateAdditionalWordsScore(board, newWordsInfo, letterValues, multiplierBoard) {
    console.log('[calculateAdditionalWordsScore] IN:', { board, newWordsInfo });
    let totalAdditionalScore = 0;
    const seen = new Set();

    newWordsInfo.forEach(wordInfo => {
        const { word, startRow, startCol, direction } = wordInfo;
        // No convertir a majúscules aquí, volem conservar minúscules per escarrassos
        const letters = word.split('');

        for (let i = 0; i < letters.length; i++) {
            const row = startRow + (direction === 'vertical' ? i : 0);
            const col = startCol + (direction === 'horizontal' ? i : 0);

            // Només busca paraula perpendicular
            const perpDir = direction === 'horizontal' ? 'vertical' : 'horizontal';
            const perpWord = findWordFromLetter(board, row, col, perpDir);

            if (perpWord && perpWord.word.length > 1) {
                const key = `${perpDir}:${perpWord.startRow},${perpWord.startCol},${perpWord.word}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    const score = calculateWordScore(perpWord.word, perpWord.startRow, perpWord.startCol, perpDir, board, letterValues, multiplierBoard);
                    totalAdditionalScore += score;
                    console.log(`[calculateAdditionalWordsScore] Paraula perpendicular "${perpWord.word}" (${perpDir}) puntuació:`, score);
                }
            }
        }
    });

    console.log('[calculateAdditionalWordsScore] OUT: totalAdditionalScore =', totalAdditionalScore);
    return totalAdditionalScore;
}

/**
 * Troba una paraula a partir d'una lletra donada en una direcció específica.
 *
 * @param {Array<Array<string>>} board - El tauler de joc.
 * @param {number} row - La fila de la lletra.
 * @param {number} col - La columna de la lletra.
 * @param {string} direction - La direcció a buscar ('horizontal' o 'vertical').
 * @returns {{word: string, startRow: number, startCol: number} | null} - La paraula trobada i la seva posició, o null si no es troba cap paraula.
 */
function findWordFromLetter(board, row, col, direction) {
    let word = '';
    let startRow = row;
    let startCol = col;

    if (direction === 'horizontal') {
        while (startCol > 0 && board[row][startCol - 1] !== '') {
            startCol--;
        }
        let currentCol = startCol;
        while (currentCol < board[row].length && board[row][currentCol] !== '') {
            word += board[row][currentCol];
            currentCol++;
        }
    } else if (direction === 'vertical') {
        while (startRow > 0 && board[startRow - 1][col] !== '') {
            startRow--;
        }
        let currentRow = startRow;
        while (currentRow < board.length && board[currentRow][col] !== '') {
            word += board[currentRow][col];
            currentRow++;
        }
    }

    if (word.length > 0) {
        console.log(`[findWordFromLetter] OUT: { word: "${word}", startRow: ${startRow}, startCol: ${startCol}, direction: ${direction} }`);
        return { word: word, startRow: startRow, startCol: startCol };
    }
    return null;
}

/**
 * Calcula la puntuació d'una sola paraula.
 *
 * @param {string} word - La paraula a puntuar.
 * @param {number} startRow - La fila on comença la paraula.
 * @param {number} startCol - La columna on comença la paraula.
 * @param {string} direction - La direcció de la paraula ('horizontal' o 'vertical').
 * @param {Array<Array<string>>} board - El tauler de joc.
 * @param {object} letterValues - Els valors de les lletres.
 * @param {Array<Array<string>>} multiplierBoard - El tauler de multiplicadors.
 * @returns {number} - La puntuació de la paraula.
 */
function calculateWordScore(word, startRow, startCol, direction, board, letterValues, multiplierBoard) {
    console.log('[calculateWordScore] IN:', { word, startRow, startCol, direction });
    let wordScore = 0;
    let wordMultiplier = 1;

    for (let i = 0; i < word.length; i++) {
        const row = startRow + (direction === 'vertical' ? i : 0);
        const col = startCol + (direction === 'horizontal' ? i : 0);
        const letter = word[i];
        let letterScore;

        // Si la lletra és minúscula, és un escarràs (valor 0)
        if (letter === letter.toLowerCase()) {
            letterScore = 0;
        } else {
            letterScore = letterValues[letter] || 0;
        }

        if (multiplierBoard && multiplierBoard[row] && multiplierBoard[row][col]) {
            const mult = multiplierBoard[row][col];
            let multiplierType = null;
            let multiplierValue = 1;
            if (mult === 'DL') { multiplierType = 'L'; multiplierValue = 2; }
            else if (mult === 'TL') { multiplierType = 'L'; multiplierValue = 3; }
            else if (mult === 'DW') { multiplierType = 'W'; multiplierValue = 2; }
            else if (mult === 'TW') { multiplierType = 'W'; multiplierValue = 3; }

            // Només aplicar multiplicadors si la lletra és nova (casella buida abans de la jugada)
            if (board[row][col] === '') {
                if (multiplierType === 'L') letterScore *= multiplierValue;
                else if (multiplierType === 'W') wordMultiplier *= multiplierValue;
            }
        }
        wordScore += letterScore;
    }
    wordScore *= wordMultiplier;
    console.log('[calculateWordScore] OUT:', wordScore);
    return wordScore;
}

/**
 * Guarda les paraules noves al tauler.
 *
 * @param {Array<Array<string>>} board - El tauler de joc (matriu 2D).
 * @param {Array<{word: string, startRow: number, startCol: number, direction: string}>} newWords - Array d'objectes amb info de les paraules noves a afegir.
 */
function saveWordsToBoard(board, newWords) {
    newWords.forEach(wordInfo => {
      const { word, startRow, startCol, direction } = wordInfo;
      const letters = word.split('');

      for (let i = 0; i < letters.length; i++) {
        let row = startRow;
        let col = startCol;
        if (direction === 'horizontal') {
          col += i;
        } else { // vertical
          row += i;
        }
        // Assegurem-nos que la posició és dins dels límits del tauler abans de guardar
        if (row >= 0 && row < board.length && col >= 0 && col < board[row].length) {
            board[row][col] = letters[i]; // Manté majúscules/minúscules segons entrada
        }
      }
    });
  }

function countNewLetters(board, wordInfo) {
    let { word, startRow, startCol, direction } = wordInfo;
    // No convertir a majúscules aquí, volem conservar minúscules per escarrassos
    let count = 0;
    for (let i = 0; i < word.length; i++) {
        const row = startRow + (direction === 'vertical' ? i : 0);
        const col = startCol + (direction === 'horizontal' ? i : 0);
        if (board[row][col] === '') count++;
    }
    return count;
}

