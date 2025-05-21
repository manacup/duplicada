import {
  historyRef
} from './firebase.js'; // Assuming firebase.js is in the same directory or adjust path
function displayRanking(numRondesToShow) {
  console.log("roundid", numRondesToShow);
  generateRankingTable(numRondesToShow, (rankingTable) => {
    document.getElementById('rankingContainer').innerHTML = rankingTable; // Replace 'rankingContainer' with the ID of the element where you want to display the table
  });
}

function generateRankingTable(numRondes, callback) {
  historyRef.on('value', (snapshot) => {
    const historyData = snapshot.val();
    console.log(historyData);

    if (!historyData) {
      console.log('No ranking data available yet.');
      callback(''); // Provide empty string or handle no data case in displayRanking
      return;
    }

    const roundsData = historyData;
    console.log("rondes", roundsData);
    const numRondesAvailable = Object.keys(roundsData).length;
    console.log("rondes available", numRondesAvailable);

    // Use the minimum of numRondesToShow and numRondesAvailable
    const roundsToProcess = Math.min(numRondes, numRondesAvailable);


    // Calculate total points for each player up to the specified round
    const playerTotals = {};
    const playerRoundScores = {}; // To store individual round scores
    for (let i = 0; i < roundsToProcess; i++) {
      const roundKey = i + 1;
      const roundResults = roundsData[roundKey] ? roundsData[roundKey].results : {};
      for (const playerId in roundResults) {
        const score = roundResults[playerId].score || 0;
        playerTotals[playerId] = (playerTotals[playerId] || 0) + score;
        playerRoundScores[playerId] = playerRoundScores[playerId] || {};
        playerRoundScores[playerId][i] = score;
      }
    }

    // Find the highest total score
    let highestScore = 0;
    for (const player in playerTotals) {
      console.log(player);
      if (playerTotals[player] > highestScore) {
        highestScore = playerTotals[player];
      }
    }

    // Generate the table HTML
    let tableHtml = '<table class="table">';
    tableHtml += '<thead><tr><th class="sticky-col">Jugador</th>';
    

    // Add headers for each round
    for (let i = 1; i <= roundsToProcess; i++) {
      tableHtml += `<th>Ronda ${i}</th>`;
    }

    tableHtml += '<th>Total</th><th>% Max Punts</th></tr></thead>';
    tableHtml += '<tbody>';

    // Sort players by total score (descending)
    const sortedPlayers = Object.keys(playerTotals).sort((a, b) => playerTotals[b] - playerTotals[a]);

    // Add rows for each player
    for (const player of sortedPlayers) {
      tableHtml += '<tr>';
      tableHtml += `<td class="sticky-col">${player}</td>`;

      // Add scores for each round
      let playerTotalForDisplay = 0;
      for (let i = 0; i < roundsToProcess; i++) {
        const score = playerRoundScores[player] && playerRoundScores[player][i] !== undefined ? playerRoundScores[player][i] : 0; // Handle cases where a player didn't play a round
        tableHtml += `<td>${score}</td>`;
        playerTotalForDisplay += score;
      }

      tableHtml += `<td>${playerTotalForDisplay}</td>`;

      // Calculate and add percentage of highest score
      const percentage = (highestScore > 0) ? (playerTotalForDisplay / highestScore) * 100 : 0; // Handle division by zero
      tableHtml += `<td>${percentage.toFixed(2)}%</td>`;

      tableHtml += '</tr>';
    }

    tableHtml += '</tbody></table>';

    // Pass the generated table HTML to the callback
    callback(tableHtml);
  });
}

// Example usage:\n// const numRondesToShow = 3; // Or get this from user input or configuration
// displayRanking(numRondesToShow);
export {
  displayRanking,
  generateRankingTable
}
