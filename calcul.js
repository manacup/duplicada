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
    //console.log('[calculateScore] IN:', { board, newWordsInfo, letterValues, multiplierBoard });
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
        //console.log("total lletres noves:" + newLettersPlaced);
        // Bonificació: si s'han col·locat 7 o més lletres noves en aquesta jugada
        if (newLettersPlaced >= 7) {
            wordScore += 50;
            //console.log('[calculateScore] BONUS 50 punts per 7 o més lletres noves!');
        }
        totalScore += wordScore;
        //console.log(`[calculateScore] Paraula principal "${word}" puntuació:`, wordScore);
    });

    let additionalWordsScore = calculateAdditionalWordsScore(board, newWordsInfo, letterValues, multiplierBoard);
    totalScore += additionalWordsScore;

    //console.log('[calculateScore] OUT: totalScore =', totalScore);
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
    //console.log('[calculateAdditionalWordsScore] IN:', { board, newWordsInfo });
    let totalAdditionalScore = 0;
    const seen = new Set();

    newWordsInfo.forEach(wordInfo => {
        const { word, startRow, startCol, direction } = wordInfo;
        // No convertir a majúscules aquí, volem conservar minúscules per escarrassos
        const letters = word.split('');

        for (let i = 0; i < letters.length; i++) {
            const row = startRow + (direction === 'vertical' ? i : 0);
            const col = startCol + (direction === 'horizontal' ? i : 0);

            // NOMÉS si la casella estava buida abans de la jugada
            if (board[row][col] === '') {
                const perpDir = direction === 'horizontal' ? 'vertical' : 'horizontal';
                const perpWord = findWordFromLetter(board, row, col, perpDir);

                if (perpWord && perpWord.word.length > 1) {
                    const key = `${perpDir}:${perpWord.startRow},${perpWord.startCol},${perpWord.word}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        const score = calculateWordScore(perpWord.word, perpWord.startRow, perpWord.startCol, perpDir, board, letterValues, multiplierBoard);
                        totalAdditionalScore += score;
                        //console.log(`[calculateAdditionalWordsScore] Paraula perpendicular "${perpWord.word}" (${perpDir}) puntuació:`, score);
                    }
                }
            }
        }
    });

    //console.log('[calculateAdditionalWordsScore] OUT: totalAdditionalScore =', totalAdditionalScore);
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
        //console.log(`[findWordFromLetter] OUT: { word: "${word}", startRow: ${startRow}, startCol: ${startCol}, direction: ${direction} }`);
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
    //console.log('[calculateWordScore] IN:', { word, startRow, startCol, direction });
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
    //console.log('[calculateWordScore] OUT:', wordScore);
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

/**
 * Troba totes les paraules noves formades per una jugada.
 * @param {Array<Array<string>>} board - El tauler abans de la jugada.
 * @param {object} wordInfo - {word, startRow, startCol, direction}
 * @returns {Array<{word, startRow, startCol, direction, newTiles: Array<{row, col, letter}>}>}
 */
function findAllNewWords(board, wordInfo) {
    //console.log('[findAllNewWords] IN:', { board, wordInfo });
    const { word, startRow, startCol, direction } = wordInfo;
    const newWords = [];
    const mainTiles = [];

    // Marca les posicions de les fitxes noves
    for (let i = 0; i < word.length; i++) {
        const row = startRow + (direction === 'vertical' ? i : 0);
        const col = startCol + (direction === 'horizontal' ? i : 0);
        if (board[row][col] === '') {
            mainTiles.push({ row, col, letter: word[i] });
        }
    }

    // Si no hi ha cap fitxa nova, no és una jugada vàlida
    if (mainTiles.length === 0) {
        //console.log('[findAllNewWords] OUT: No new tiles placed');
        return [];
    }

    // Troba la paraula principal (pot ser més llarga si connecta amb fitxes existents)
    let mainStart = { row: startRow, col: startCol };
    let mainWord = '';
    let r = startRow, c = startCol;
    while (true) {
        const prevR = r - (direction === 'vertical' ? 1 : 0);
        const prevC = c - (direction === 'horizontal' ? 1 : 0);
        if (prevR < 0 || prevC < 0 || board[prevR]?.[prevC] === '' || board[prevR]?.[prevC] == null) break;
        r = prevR; c = prevC;
    }
    mainStart = { row: r, col: c };

    // Construeix la paraula principal
    let tempR = r, tempC = c;
    for (let i = 0; i < 100; i++) { // límit de seguretat
        let boardLetter = board[tempR][tempC];
        let placedLetter = null;
        // Comprova si aquesta posició forma part de la jugada
        for (let j = 0; j < word.length; j++) {
            const jugadaR = startRow + (direction === 'vertical' ? j : 0);
            const jugadaC = startCol + (direction === 'horizontal' ? j : 0);
            if (jugadaR === tempR && jugadaC === tempC) {
                placedLetter = word[j];
                break;
            }
        }
        mainWord += placedLetter || boardLetter;
        tempR += (direction === 'vertical' ? 1 : 0);
        tempC += (direction === 'horizontal' ? 1 : 0);
        if ((board[tempR]?.[tempC] === '' || board[tempR]?.[tempC] == null) &&
            !mainTiles.some(t => t.row === tempR && t.col === tempC)) break;
        if (tempR >= board.length || tempC >= board.length) break;
    }
    if (mainWord.length > 1) {
        // Marca quines fitxes són noves dins la paraula principal
        const mainNewTiles = [];
        for (let i = 0; i < mainWord.length; i++) {
            const row = mainStart.row + (direction === 'vertical' ? i : 0);
            const col = mainStart.col + (direction === 'horizontal' ? i : 0);
            if (board[row][col] === '') {
                mainNewTiles.push({ row, col, letter: mainWord[i] });
            }
        }
        newWords.push({
            word: mainWord,
            startRow: mainStart.row,
            startCol: mainStart.col,
            direction,
            newTiles: mainNewTiles
        });
    }

    // Troba paraules perpendiculars formades per cada fitxa nova
    const perpDir = direction === 'horizontal' ? 'vertical' : 'horizontal';
    for (const tile of mainTiles) {
        let word = '';
        let r = tile.row, c = tile.col;
        // Busca l'inici de la paraula perpendicular
        while (true) {
            const prevR = r - (perpDir === 'vertical' ? 1 : 0);
            const prevC = c - (perpDir === 'horizontal' ? 1 : 0);
            if (prevR < 0 || prevC < 0 || board[prevR]?.[prevC] === '' || board[prevR]?.[prevC] == null) break;
            r = prevR; c = prevC;
        }
        // Construeix la paraula perpendicular
        let tempR = r, tempC = c;
        let found = false;
        let newTiles = [];
        for (let i = 0; i < 100; i++) {
            let letter;
            if (tempR === tile.row && tempC === tile.col) {
                letter = tile.letter;
                found = true;
                newTiles.push({ row: tempR, col: tempC, letter });
            } else {
                letter = board[tempR][tempC];
            }
            word += letter;
            tempR += (perpDir === 'vertical' ? 1 : 0);
            tempC += (perpDir === 'horizontal' ? 1 : 0);
            if ((board[tempR]?.[tempC] === '' || board[tempR]?.[tempC] == null) &&
                !(tempR === tile.row && tempC === tile.col)) break;
            if (tempR >= board.length || tempC >= board.length) break;
        }
        if (word.length > 1 && found) {
            newWords.push({
                word,
                startRow: r,
                startCol: c,
                direction: perpDir,
                newTiles
            });
        }
    }

    // Mostra per consola totes les paraules noves trobades (>2 fitxes)
    /* newWords.filter(w => w.word.length > 1).forEach(w =>
        console.log(`[findAllNewWords] Nova paraula: "${w.word}" a (${w.startRow},${w.startCol}) ${w.direction}`)
    );
    console.log('[findAllNewWords] OUT:', newWords); */
    return newWords;
}

/**
 * Calcula la puntuació d'una paraula, aplicant multiplicadors només a les fitxes noves.
 * @param {string} word
 * @param {number} startRow
 * @param {number} startCol
 * @param {string} direction
 * @param {Array<Array<string>>} board - Tauler abans de la jugada
 * @param {object} letterValues
 * @param {Array<Array<string>>} multiplierBoard
 * @param {Array<{row, col, letter}>} newTiles - Posicions de les fitxes noves
 * @returns {number}
 */
function calculateWordScoreWithNewTiles(word, startRow, startCol, direction, board, letterValues, multiplierBoard, newTiles) {
    //console.log('[calculateWordScoreWithNewTiles] IN:', { word, startRow, startCol, direction, newTiles });
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

        // Només aplica multiplicadors si aquesta posició és una fitxa nova
        const isNew = newTiles.some(t => t.row === row && t.col === col);
        if (isNew && multiplierBoard && multiplierBoard[row] && multiplierBoard[row][col]) {
            const mult = multiplierBoard[row][col];
            let multiplierType = null;
            let multiplierValue = 1;
            if (mult === 'DL') { multiplierType = 'L'; multiplierValue = 2; }
            else if (mult === 'TL') { multiplierType = 'L'; multiplierValue = 3; }
            else if (mult === 'DW') { multiplierType = 'W'; multiplierValue = 2; }
            else if (mult === 'TW') { multiplierType = 'W'; multiplierValue = 3; }

            if (multiplierType === 'L') letterScore *= multiplierValue;
            else if (multiplierType === 'W') wordMultiplier *= multiplierValue;
        }
        wordScore += letterScore;
    }
    wordScore *= wordMultiplier;
    //console.log('[calculateWordScoreWithNewTiles] OUT:', wordScore);
    return wordScore;
}

/**
 * Calcula la puntuació total d'una jugada, trobant totes les paraules noves i aplicant la puntuació correcta.
 * @param {Array<Array<string>>} board - Tauler abans de la jugada
 * @param {object} wordInfo - {word, startRow, startCol, direction}
 * @param {object} letterValues
 * @param {Array<Array<string>>} multiplierBoard
 * @returns {number}
 */
function calculateFullPlayScore(board, wordInfo, letterValues, multiplierBoard) {
    //console.log('[calculateFullPlayScore] IN:', { board, wordInfo, letterValues, multiplierBoard });
    const newWords = findAllNewWords(board, wordInfo);
    let totalScore = 0;
    let mainWordNewTiles = [];
    newWords.forEach((w, idx) => {
        const score = calculateWordScoreWithNewTiles(w.word, w.startRow, w.startCol, w.direction, board, letterValues, multiplierBoard, w.newTiles);
        totalScore += score;
        if (idx === 0) mainWordNewTiles = w.newTiles;
        //console.log(`[calculateFullPlayScore] Paraula "${w.word}" (${w.direction}) puntuació:`, score);
    });

    // Bonus de 50 punts si la paraula principal col·loca 7 fitxes noves
    if (mainWordNewTiles.length >= 7) {
        totalScore += 50;
        //console.log('[calculateFullPlayScore] BONUS 50 punts per 7 o més fitxes noves!');
    }

    //console.log('[calculateFullPlayScore] OUT: totalScore =', totalScore);
    return totalScore;
}

/**
 * Troba la informació de la paraula (wordInfo) a partir de les seves propietats bàsiques.
 *
 * @param {string} word - La paraula.
 * @param {string} coordinates - Les coordenades d'inici (ex: "A1").
 * @param {string} direction - La direcció ('horizontal' o 'vertical').
 * @returns {{word: string, startRow: number, startCol: number, direction: string} | null} - L'objecte wordInfo, o null si les coordenades són invàlides.
 */
function findWordInfo(word, coordinates, direction) {
    // Convertir coordenades (ex: A1 -> [0, 0], B2 -> [1, 1])
    const rowLetter = coordinates.match(/[A-Za-z]/)?.[0];
    const colNumber = parseInt(coordinates.match(/[0-9]+/)?.[0]) - 1;
    const startCol = colNumber;
    const startRow = rowLetter ? rowLetter.charCodeAt(0) - 65 : -1;
    

    // Validar que les coordenades siguin vàlides (pots afegir més validacions si cal, com els límits del tauler)
    if (startRow < 0 || startCol < 0) {
        return null; // Coordenades invàlides
    }

    return {
        word: word, 
        startRow: startRow,
        startCol: startCol,
        direction: direction
    };
}
// Exporta les funcions si cal (per a mòduls)
export { findWordInfo,findAllNewWords, calculateWordScoreWithNewTiles, calculateFullPlayScore ,saveWordsToBoard};

