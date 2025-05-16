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
    let totalScore = 0;

    newWordsInfo.forEach(wordInfo => {
        let { word, startRow, startCol, direction } = wordInfo;
        word = word.toUpperCase();
        let wordScore = 0;
        let wordMultiplier = 1; // Per als multiplicadors de paraula
        let newLettersPlaced = 0; // Comptador de lletres noves col·locades

        for (let i = 0; i < word.length; i++) {
            const row = startRow + (direction === 'vertical' ? i : 0);
            const col = startCol + (direction === 'horizontal' ? i : 0);
            const letter = word[i];

            let letterScore;
            let multiplierType = null;
            let multiplierValue = 1;

            // Comprovar si la casella té un multiplicador
            if (multiplierBoard && multiplierBoard[row][col]) {
                multiplierType = multiplierBoard[row][col].substring(1); // "L" o "W"
                multiplierValue = parseInt(multiplierBoard[row][col].substring(0, 1));
                multiplierValue == 'D' ? multiplierValue = 2 : multiplierValue = 3;// D o T
                console.log(multiplierType, multiplierValue)
            }

            if (board[row][col] === '') {
                // Casella buida: nova lletra col·locada
                letterScore = letterValues[letter];
                newLettersPlaced++;

                if (multiplierBoard) {
                    if (multiplierType === 'L') {
                        letterScore *= multiplierValue;
                    } else if (multiplierType === 'W') {
                        wordMultiplier *= multiplierValue;
                    }
                }
            } else {
                // Casella ocupada: lletra existent
                letterScore = letterValues[letter]; // Agafem el valor de la lletra (ja no apliquem multiplicadors)
            }
            wordScore += letterScore;
        }
        wordScore *= wordMultiplier; // Apliquem el multiplicador de la paraula si n'hi ha

        // Bonificació per usar totes les lletres (opcional)
        if (newLettersPlaced === 7) {
            wordScore += 50; // O la bonificació que vulguis
        }

        totalScore += wordScore;
    });

    // Calcular les paraules addicionals que s'han format
    let additionalWordsScore = calculateAdditionalWordsScore(board, newWordsInfo, letterValues, multiplierBoard);
    totalScore += additionalWordsScore;

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
    let totalAdditionalScore = 0;

    newWordsInfo.forEach(wordInfo => {
        const { word, startRow, startCol, direction } = wordInfo;
        const letters = word.toUpperCase().split('');

        for (let i = 0; i < letters.length; i++) {
            const row = startRow + (direction === 'vertical' ? i : 0);
            const col = startCol + (direction === 'horizontal' ? i : 0);

            // Comprovem si la lletra actual forma part d'alguna altra paraula
            // Hem de buscar tant horitzontalment com verticalment des d'aquesta lletra
            const horizontalWord = findWordFromLetter(board, row, col, 'horizontal');
            const verticalWord = findWordFromLetter(board, row, col, 'vertical');

            if (horizontalWord && horizontalWord.word.length > 1) {
                totalAdditionalScore += calculateWordScore(horizontalWord.word, horizontalWord.startRow, horizontalWord.startCol, 'horizontal', board, letterValues, multiplierBoard);
            }
            if (verticalWord && verticalWord.word.length > 1) {
                totalAdditionalScore += calculateWordScore(verticalWord.word, verticalWord.startRow, verticalWord.startCol, 'vertical', board, letterValues, multiplierBoard);
            }
        }
    });

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
        // Anar cap a l'esquerra fins al principi de la paraula
        while (col > 0 && board[row][col - 1] !== '') {
            startCol--;
        }

        // Construir la paraula cap a la dreta
        let currentCol = startCol;
        while (currentCol < board[row].length && board[row][currentCol] !== '') {
            word += board[row][currentCol];
            currentCol++;
        }
    } else if (direction === 'vertical') {
        // Anar cap amunt fins al principi de la paraula
        while (row > 0 && board[row - 1][col] !== '') {
            startRow--;
        }

        // Construir la paraula cap avall
        let currentRow = startRow;
        while (currentRow < board.length && board[currentRow][col] !== '') {
            word += board[currentRow][col];
            currentRow++;
        }
    }

    if (word.length > 0) {
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
    let wordScore = 0;
    let wordMultiplier = 1;

    for (let i = 0; i < word.length; i++) {
        const row = startRow + (direction === 'vertical' ? i : 0);
        const col = startCol + (direction === 'horizontal' ? i : 0);
        const letter = word[i];
        let letterScore = letterValues[letter];

        if (multiplierBoard && multiplierBoard[row] && multiplierBoard[row][col]) {
            const multiplierType = multiplierBoard[row][col][0];
            const multiplierValue = parseInt(multiplierBoard[row][col].slice(1));

            if (multiplierType === 'L') {
                letterScore *= multiplierValue;
            } else if (multiplierType === 'W') {
                wordMultiplier *= multiplierValue;
            }
        }
        wordScore += letterScore;
    }
    wordScore *= wordMultiplier;
    return wordScore;
}



