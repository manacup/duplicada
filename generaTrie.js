// generaTrie.js
const fs = require('fs');

function buildTrie(words) {
    const root = {};
    for (const word of words) {
        let node = root;
        for (const char of word) {
            if (!node[char]) node[char] = {};
            node = node[char];
        }
        node._end = true;
    }
    return root;
}

const words = fs.readFileSync('dicc/DISC2-Eliot.txt', 'utf8').split(/\r?\n/).filter(Boolean);
const trie = buildTrie(words);
fs.writeFileSync('dicc/DISC2-Eliot.trie.json', JSON.stringify(trie));
console.log('Trie JSON creat!');