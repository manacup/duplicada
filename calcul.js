// Suggested code may be subject to a license. Learn more: ~LicenseLog:1049140213.

const scrabbleBoard = {
  board: [
    ['3W', '.', '.', '2L', '.', '.', '.', '3W', '.', '.', '.', '2L', '.', '.', '3W'],
    ['.', '2W', '.', '.', '.', '3L', '.', '.', '.', '3L', '.', '.', '.', '2W', '.'],
    ['.', '.', '2W', '.', '.', '.', '2L', '.', '2L', '.', '.', '.', '2W', '.', '.'],
    ['2L', '.', '.', '2W', '.', '.', '.', '2L', '.', '.', '.', '2W', '.', '.', '2L'],
    ['.', '.', '.', '.', '2W', '.', '.', '.', '.', '.', '2W', '.', '.', '.', '.'],
    ['.', '3L', '.', '.', '.', '3L', '.', '.', '.', '3L', '.', '.', '.', '3L', '.'],
    ['.', '.', '2L', '.', '.', '.', '2L', '.', '2L', '.', '.', '.', '2L', '.', '.'],
    ['3W', '.', '.', '2L', '.', '.', '.', 'STAR', '.', '.', '.', '2L', '.', '.', '3W'],
    ['.', '.', '2L', '.', '.', '.', '2L', '.', '2L', '.', '.', '.', '2L', '.', '.'],
    ['.', '3L', '.', '.', '.', '3L', '.', '.', '.', '3L', '.', '.', '.', '3L', '.'],
    ['.', '.', '.', '.', '2W', '.', '.', '.', '.', '.', '2W', '.', '.', '.', '.'],
    ['2L', '.', '.', '2W', '.', '.', '.', '2L', '.', '.', '.', '2W', '.', '.', '2L'],
    ['.', '.', '2W', '.', '.', '.', '2L', '.', '2L', '.', '.', '.', '2W', '.', '.'],
    ['.', '2W', '.', '.', '.', '3L', '.', '.', '.', '3L', '.', '.', '.', '2W', '.'],
    ['3W', '.', '.', '2L', '.', '.', '.', '3W', '.', '.', '.', '2L', '.', '.', '3W']
  ],

  getSquareType: function(row, col) {
    if (row < 0 || row >= this.board.length || col < 0 || col >= this.board[0].length) {
      return null; // Out of bounds
    }
    return this.board[row][col];
  },

  getLetterMultiplier: function(row, col) {
    const type = this.getSquareType(row, col);
    if (type === '2L') return 2;
    if (type === '3L') return 3;
    return 1;
  },

  getWordMultiplier: function(row, col) {
    const type = this.getSquareType(row, col);
    if (type === '2W') return 2;
    if (type === '3W') return 3;
    if (type === 'STAR') return 2; // Star square is a double word score
    return 1;
  }
};

const catalanLetterValues = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1, 'J': 8,
  'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 8, 'R': 1, 'S': 1, 'T': 1, 'U': 1,
  'V': 4, 'X': 8, 'Y': 10, 'Z': 10, 'K': 8, 'W': 10
};

function calculateWordScoreCatalan(word, startRow, startCol, direction) {
  let score = 0;
  let wordMultiplier = 1;
  const letters = word.toUpperCase().split('');

  for (let i = 0; i < letters.length; i++) {
    let currentRow, currentCol;
    if (direction === 'horizontal') {
      currentRow = startRow;
      currentCol = startCol + i;
    } else if (direction === 'vertical') {
      currentRow = startRow + i;
      currentCol = startCol;
    } else {
      return 0; // Invalid direction
    }

    const letter = letters[i];
    const letterValue = catalanLetterValues[letter] || 0; // 0 if letter not in map
    const letterMultiplier = scrabbleBoard.getLetterMultiplier(currentRow, currentCol);
    const squareWordMultiplier = scrabbleBoard.getWordMultiplier(currentRow, currentCol);

    score += letterValue * letterMultiplier;
    wordMultiplier *= squareWordMultiplier;
  }

  return score * wordMultiplier;
}

function findNewWords(playedWord, startRow, startCol, direction, existingLetters) {
  const newWords = [];
  const playedLetters = playedWord.toUpperCase().split('');

  for (let i = 0; i < playedLetters.length; i++) {
    let row, col;
    if (direction === 'horizontal') {
      row = startRow;
      col = startCol + i;
    } else { // vertical
      row = startRow + i;
      col = startCol;
    }

    // Check for forming new words perpendicular to the played word
    if (direction === 'horizontal') {
      // Check vertical contacts
      if (existingLetters.has(`${row - 1},${col}`) || existingLetters.has(`${row + 1},${col}`)) {
        let newWord = '';
        let startOfNewWordRow = row;
        while (existingLetters.has(`${startOfNewWordRow - 1},${col}`)) {
          startOfNewWordRow--;
        }
        let currentRow = startOfNewWordRow;
        while (existingLetters.has(`${currentRow},${col}`) || (currentRow === row && col >= startCol && col < startCol + playedLetters.length)) {
          if (currentRow === row) {
             newWord += playedLetters[col - startCol];
          } else {
            // Need a way to get the actual letter from the existingLetters map
            // This example assumes existingLetters stores the letter value as well
            // e.g., existingLetters.set(`${row},${col}`, 'A')
            // If existingLetters only stores existence, you'd need access to the full board state
             const existingLetterEntry = Array.from(existingLetters.entries()).find(([key, value]) => key === `${currentRow},${col}`);
             if (existingLetterEntry) {
                newWord += existingLetterEntry[1]; // Assumes existingLetters stores the letter as value
             }
          }
          currentRow++;
        }
        if (newWord.length > 1) {
          newWords.push({ word: newWord, startRow: startOfNewWordRow, startCol: col, direction: 'vertical' });
        }
      }
    } else { // vertical
      // Check horizontal contacts
       if (existingLetters.has(`${row},${col - 1}`) || existingLetters.has(`${row},${col + 1}`)) {
        let newWord = '';
        let startOfNewWordCol = col;
        while (existingLetters.has(`${row},${startOfNewWordCol - 1}`)) {
          startOfNewWordCol--;
        }
        let currentCol = startOfNewWordCol;
         while (existingLetters.has(`${row},${currentCol}`) || (currentCol === col && row >= startRow && row < startRow + playedLetters.length)) {
            if (currentCol === col) {
                 newWord += playedLetters[row - startRow];
            } else {
               const existingLetterEntry = Array.from(existingLetters.entries()).find(([key, value]) => key === `${row},${currentCol}`);
                if (existingLetterEntry) {
                    newWord += existingLetterEntry[1]; // Assumes existingLetters stores the letter as value
                }
            }
            currentCol++;
        }
        if (newWord.length > 1) {
          newWords.push({ word: newWord, startRow: row, startCol: startOfNewWordCol, direction: 'horizontal' });
        }
      }
    }
  }

  // Add the played word itself to the list of new words
  newWords.push({ word: playedWord, startRow, startCol, direction });

  return newWords;
}

async function saveWordsToBoard(board, newWords, currentRound) {
  // Create a mutable copy of the board
  const newBoard = board.map(row => [...row]);

  newWords.forEach(wordInfo => {
    const { word, startRow, startCol, direction } = wordInfo;
    const letters = word.toUpperCase().split('');

    let currentRow = startRow;
    let currentCol = startCol;

    for (let i = 0; i < letters.length; i++) {
      let row = startRow;
      let col = startCol;
      if (direction === 'horizontal') {
        col += i;
      } else { // vertical
        row += i;
      }
      newBoard[row][col] = letters[i]; // Place the letter on the new board
    }
  });

  // Save the new board state to the database
  try {
    await db.ref(`rounds/${currentRound}/boardState`).set(newBoard);
    console.log(`Board state for round ${currentRound} saved successfully.`);
  } catch (error) {
    console.error("Error saving board state:", error);
  }
}
