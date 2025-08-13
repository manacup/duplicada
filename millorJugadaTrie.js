// millorJugadaTrie.js
import { findAllNewWords, calculateWordScoreWithNewTiles } from './calcul.js';

let trie = null;

async function loadTrie(url) {
    const response = await fetch(url);
    trie = await response.json();
}

// Cerca recursiva de paraules vàlides al trie, encaixant amb el tauler i rack
function searchWithAnchor(
    board, rack, trieNode, row, col, direction, prefix, usedRack, results,
    minRow, minCol, offset, maxLen, depth = 0, scraps = []
) {
    const size = board.length;
    if (prefix.length === maxLen) {
        if (trieNode._end && isValidPlacement(board, prefix, minRow, minCol, direction, trie)) {
            results.push({
                word: prefix,
                startRow: minRow,
                startCol: minCol,
                direction,
                scraps: [...scraps]
            });
        }
        return;
    }
    if (row < 0 || col < 0 || row >= size || col >= size) return;

    const boardLetter = board[row][col];
    if (prefix.length === offset && boardLetter) {
        // L'anchor ha de ser una lletra del tauler en aquesta posició
        if (trieNode[boardLetter.toUpperCase()]) {
            const nextRow = direction === 'horizontal' ? row : row + 1;
            const nextCol = direction === 'horizontal' ? col + 1 : col;
            searchWithAnchor(
                board,
                rack,
                trieNode[boardLetter.toUpperCase()],
                nextRow,
                nextCol,
                direction,
                prefix + boardLetter.toUpperCase(),
                usedRack.concat([boardLetter.toUpperCase()]),
                results,
                minRow,
                minCol,
                offset,
                maxLen,
                depth + 1,
                scraps
            );
        }
        return;
    }

    if (boardLetter) {
        // Si la casella està ocupada, només pots seguir si la lletra coincideix
        if (trieNode[boardLetter.toUpperCase()]) {
            const nextRow = direction === 'horizontal' ? row : row + 1;
            const nextCol = direction === 'horizontal' ? col + 1 : col;
            searchWithAnchor(
                board,
                rack,
                trieNode[boardLetter.toUpperCase()],
                nextRow,
                nextCol,
                direction,
                prefix + boardLetter.toUpperCase(),
                usedRack.concat([boardLetter.toUpperCase()]),
                results,
                minRow,
                minCol,
                offset,
                maxLen,
                depth + 1,
                scraps
            );
        }
        return;
    }

    // Si la casella està buida, prova totes les lletres del rack
    for (let i = 0; i < rack.length; i++) {
        const letter = rack[i].toUpperCase();
        if (trieNode[letter]) {
            const newRack = rack.slice(0, i).concat(rack.slice(i + 1));
            const nextRow = direction === 'horizontal' ? row : row + 1;
            const nextCol = direction === 'horizontal' ? col + 1 : col;
            searchWithAnchor(
                board,
                newRack,
                trieNode[letter],
                nextRow,
                nextCol,
                direction,
                prefix + letter,
                usedRack.concat([letter]),
                results,
                minRow,
                minCol,
                offset,
                maxLen,
                depth + 1,
                scraps
            );
        }
    }
    // Prova amb escarràs '?'
    if (rack.includes('?')) {
        for (const l in trieNode) {
            if (l !== '_end') {
                const idx = rack.indexOf('?');
                const newRack = rack.slice(0, idx).concat(rack.slice(idx + 1));
                const nextRow = direction === 'horizontal' ? row : row + 1;
                const nextCol = direction === 'horizontal' ? col + 1 : col;
                // Marca l'ús de l'escarràs: afegeix l'índex a scraps
                searchWithAnchor(
                    board,
                    newRack,
                    trieNode[l],
                    nextRow,
                    nextCol,
                    direction,
                    prefix + l.toLowerCase(), // <-- minúscula!
                    usedRack.concat(['?' + l]),
                    results,
                    minRow,
                    minCol,
                    offset,
                    maxLen,
                    depth + 1,
                    scraps.concat([prefix.length])
                );
            }
        }
    }
}

// Troba les millors jugades possibles segons les regles de Scrabble, usant trie
async function findBestPlaysTrie(board, rack, letterValues, multiplierBoard, trieUrl, maxResults = 10) {
    if (!trie) await loadTrie(trieUrl);

    const size = board.length;
    const plays = [];
    const directions = ['horizontal', 'vertical'];

    // Troba totes les caselles buides adjacents a fitxes ja col·locades (anchors)
    const anchors = [];
    let isBoardEmpty = true;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] !== '') {
                isBoardEmpty = false;
                // Busca buides adjacents
                if (r > 0 && board[r - 1][c] === '') anchors.push({ row: r - 1, col: c });
                if (r < size - 1 && board[r + 1][c] === '') anchors.push({ row: r + 1, col: c });
                if (c > 0 && board[r][c - 1] === '') anchors.push({ row: r, col: c - 1 });
                if (c < size - 1 && board[r][c + 1] === '') anchors.push({ row: r, col: c + 1 });
            }
        }
    }
    // Si el tauler està buit (primera jugada), l'únic anchor és el centre
    if (isBoardEmpty) {
        const mid = Math.floor(size / 2);
        anchors.push({ row: mid, col: mid });
    }

    // Elimina duplicats d'anchors
    const anchorSet = new Set();
    const uniqueAnchors = [];
    for (const a of anchors) {
        const key = `${a.row},${a.col}`;
        if (!anchorSet.has(key)) {
            anchorSet.add(key);
            uniqueAnchors.push(a);
        }
    }

    // Per cada direcció i anchor, prova totes les posicions de la paraula on la lletra del tauler pot encaixar
    for (const direction of directions) {
        for (const anchor of uniqueAnchors) {
            for (let maxLen = 2; maxLen <= size; maxLen++) { // longitud de paraula
                for (let offset = 0; offset < maxLen; offset++) { // posició de l'anchor dins la paraula
                    // Calcula la posició inicial
                    const startRow = direction === 'horizontal' ? anchor.row : anchor.row - offset;
                    const startCol = direction === 'horizontal' ? anchor.col - offset : anchor.col;
                    if (startRow < 0 || startCol < 0) continue;
                    if (
                        (direction === 'horizontal' && startCol + maxLen > size) ||
                        (direction === 'vertical' && startRow + maxLen > size)
                    ) continue;

                    searchWithAnchor(
                        board,
                        rack.toUpperCase().split(''),
                        trie,
                        startRow,
                        startCol,
                        direction,
                        '',
                        [],
                        plays,
                        startRow,
                        startCol,
                        offset,
                        maxLen,
                        0,
                        []
                    );
                }
            }
        }
    }

    // Elimina duplicats
    const seen = new Set();
    const uniquePlays = [];
    for (const play of plays) {
        const key = `${play.word}|${play.startRow}|${play.startCol}|${play.direction}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniquePlays.push(play);
        }
    }

    // Calcula la puntuació real de la jugada
    for (const play of uniquePlays) {
        // Si hi ha escarrassos, posa la lletra corresponent en minúscula
        if (play.scraps && play.scraps.length > 0) {
            let wordArr = play.word.split('');
            for (const idx of play.scraps) {
                wordArr[idx] = wordArr[idx].toLowerCase();
            }
            play.word = wordArr.join('');
        }
        const placement = {
            word: play.word,
            startRow: play.startRow,
            startCol: play.startCol,
            direction: play.direction
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
        // BONUS: Si s'han utilitzat 7 fitxes del rack (no del tauler), suma 50 punts
        let rackTilesUsed = 0;
        for (let idx = 0; idx < play.word.length; idx++) {
            const r = play.direction === 'horizontal' ? play.startRow : play.startRow + idx;
            const c = play.direction === 'horizontal' ? play.startCol + idx : play.startCol;
            if (board[r][c] === '') rackTilesUsed++;
        }
        if (rackTilesUsed === 7) score += 50;
        play.score = score;
    }

    uniquePlays.sort((a, b) => b.score - a.score);
    // Retorna també l'array scraps per a cada jugada
    return uniquePlays.slice(0, maxResults).map(play => ({
        word: play.word,
        startRow: play.startRow,
        startCol: play.startCol,
        direction: play.direction,
        score: play.score,
        scraps: play.scraps // array d'índexs de lletres que són escarrassos
    }));
}

// Cerca una paraula al trie
function trieHas(trie, word) {
    let node = trie;
    for (const char of word) {
        if (!node[char]) return false;
        node = node[char];
    }
    return !!node._end;
}

// Cerca jugades possibles tenint en compte els escarrassos (?)
async function findBestPlaysWithBlanks(board, rack, letterValues, multiplierBoard, trieUrl, maxResults = 10) {
    const blankCount = (rack.match(/\?/g) || []).length;
    if (blankCount === 0) {
        // Cerca normal
        return await findBestPlaysTrie(board, rack, letterValues, multiplierBoard, trieUrl, maxResults);
    }

    const alphabet = 'abcçdefghijlłmnopûrstuvýxz';
    let results = [];
    if (blankCount === 1) {
        for (const l of alphabet) {
            // Substitueix el primer escarràs per la lletra l
            const rackSub = rack.replace('?', l);
            const jugades = await findBestPlaysTrie(board, rackSub, letterValues, multiplierBoard, trieUrl, maxResults * 2);
            // Marca a scraps la posició de la lletra substituïda
            jugades.forEach(j => {
                // Busca la lletra l a la paraula, a una casella buida
                let scraps = [];
                for (let idx = 0; idx < j.word.length; idx++) {
                    const r = j.direction === 'horizontal' ? j.startRow : j.startRow + idx;
                    const c = j.direction === 'horizontal' ? j.startCol + idx : j.startCol;
                    if (board[r][c] === '' && j.word[idx].toUpperCase() === l) {
                        scraps.push(idx);
                        // Posa la lletra en minúscula a la paraula
                        j.word = j.word.substring(0, idx) + j.word[idx].toLowerCase() + j.word.substring(idx + 1);
                        break; // Només una lletra per escarràs
                    }
                }
                j.scraps = scraps;
            });
            results = results.concat(jugades);
        }
    } else if (blankCount === 2) {
        for (const l1 of alphabet) {
            for (const l2 of alphabet) {
                const rackSub = rack.replace('?', l1).replace('?', l2);
                const jugades = await findBestPlaysTrie(board, rackSub, letterValues, multiplierBoard, trieUrl, maxResults * 2);
                jugades.forEach(j => {
                    let scraps = [];
                    let found1 = false, found2 = false;
                    for (let idx = 0; idx < j.word.length; idx++) {
                        const r = j.direction === 'horizontal' ? j.startRow : j.startRow + idx;
                        const c = j.direction === 'horizontal' ? j.startCol + idx : j.startCol;
                        if (board[r][c] === '' && !found1 && j.word[idx].toUpperCase() === l1) {
                            scraps.push(idx);
                            j.word = j.word.substring(0, idx) + j.word[idx].toLowerCase() + j.word.substring(idx + 1);
                            found1 = true;
                        } else if (board[r][c] === '' && !found2 && j.word[idx].toUpperCase() === l2) {
                            scraps.push(idx);
                            j.word = j.word.substring(0, idx) + j.word[idx].toLowerCase() + j.word.substring(idx + 1);
                            found2 = true;
                        }
                        if (found1 && found2) break;
                    }
                    j.scraps = scraps;
                });
                results = results.concat(jugades);
            }
        }
    }
    // Elimina duplicats (mateixa paraula, posició i direcció)
    const seen = new Set();
    const unique = [];
    for (const j of results) {
        const key = `${j.word}|${j.startRow}|${j.startCol}|${j.direction}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(j);
        }
    }
    unique.sort((a, b) => b.score - a.score);
    return unique.slice(0, maxResults);
}

function isValidPlacement(board, word, startRow, startCol, direction, trie) {
    const size = board.length;
    const wordLen = word.length;
    let touchesExisting = false;

    // Comprova si la paraula allarga una paraula existent (no pot)
    if (direction === 'horizontal') {
        if (startCol > 0 && board[startRow][startCol - 1] !== '') return false;
        if (startCol + wordLen < size && board[startRow][startCol + wordLen] !== '') return false;
    } else {
        if (startRow > 0 && board[startRow - 1][startCol] !== '') return false;
        if (startRow + wordLen < size && board[startRow + wordLen][startCol] !== '') return false;
    }

    for (let i = 0; i < wordLen; i++) {
        const r = direction === 'horizontal' ? startRow : startRow + i;
        const c = direction === 'horizontal' ? startCol + i : startCol;
        if (r < 0 || c < 0 || r >= size || c >= size) return false;

        // Si la casella està ocupada, ha de coincidir
        if (board[r][c] !== '') {
            if (board[r][c].toUpperCase() !== word[i]) return false;
            touchesExisting = true;
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

    // Si el tauler no està buit, ha de tocar alguna lletra existent
    const isBoardEmpty = board.flat().every(cell => cell === '');
    if (!isBoardEmpty && !touchesExisting) return false;

    // Comprova paraules secundàries creades
    for (let i = 0; i < wordLen; i++) {
        const r = direction === 'horizontal' ? startRow : startRow + i;
        const c = direction === 'horizontal' ? startCol + i : startCol;
        if (board[r][c] === '') {
            let crossWord = word[i];
            let before = 1, after = 1;
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
            if (crossWord.length > 1 && !trieHas(trie, crossWord)) {
                return false;
            }
        }
    }
    return true;
}

export { findBestPlaysTrie, loadTrie, findBestPlaysWithBlanks };