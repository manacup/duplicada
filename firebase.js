/* import firebase from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import "firebase/firestore";
 */
const firebaseConfig = {

    apiKey: "AIzaSyBbWqeWhQgK5C0Ioj7-uSNx9q0i8VZmIJM",

    authDomain: "duplicadaporreres.firebaseapp.com",

    projectId: "duplicadaporreres",

    storageBucket: "duplicadaporreres.firebasestorage.app",

    messagingSenderId: "835862262761",

    appId: "1:835862262761:web:4465dadd41f0f31edd1178"

};
/*   const firebaseConfig = {

    apiKey: "AIzaSyBbWqeWhQgK5C0Ioj7-uSNx9q0i8VZmIJM",

    authDomain: "duplicadaporreres.firebaseapp.com",

    projectId: "duplicadaporreres",

    storageBucket: "duplicadaporreres.firebasestorage.app",

    messagingSenderId: "835862262761",

    appId: "1:835862262761:web:4465dadd41f0f31edd1178"

  }; */


// Inicialitza Firebase només si no està inicialitzat
if (!window.firebase?.apps?.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Cloud Firestore
const firestore = firebase.firestore();

// Define Firestore references (using collection/doc structure)
const gameInfoRef = firestore.collection('gameInfo').doc('info'); // Assuming 'gameInfo' is a collection with a single document 'info'
const roundsCollectionRef = firestore.collection('rounds'); // Collection for rounds
const jugadorsCollectionRef = firestore.collection('jugadors'); // Collection for players
const formEnabledRef = firestore.collection('appStatus').doc('form'); // Assuming 'formEnabled' is a document in 'appStatus'
const clockRef = firestore.collection('appStatus').doc('clock');


async function exportData() {
    try {
        const data = {};

        // Get gameInfo
        const gameInfoDoc = await gameInfoRef.get();
        if (gameInfoDoc.exists) {
            data.gameInfo = gameInfoDoc.data();
        }

        // Get all rounds
        const roundsSnapshot = await roundsCollectionRef.get();
        data.rounds = roundsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Get all jugadors
        const jugadorsSnapshot = await jugadorsCollectionRef.get();
        data.jugadors = jugadorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Get appStatus/form
        const formDoc = await formEnabledRef.get();
        if (formDoc.exists) {
            data.appStatusForm = formDoc.data();
        }


        // Get appStatus/clock
        const clockDoc = await clockRef.get();
        if (clockDoc.exists) {
            data.appStatusClock = clockDoc.data();
        }

        // Convert to JSON
        const jsonData = JSON.stringify(data, null, 2);

        // Create a blob and a download link
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'firestore_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('Data exported successfully.');
    } catch (error) {
        console.error('Error exporting data:', error);
    }
}

// Function to initialize the database structure if it's empty or critical elements are missing
async function initializeDatabase() {
    try {
        // Check if gameInfo document exists, if not, create it
        const gameInfoDoc = await gameInfoRef.get();
        if (!gameInfoDoc.exists) {
            await gameInfoRef.set({ currentRound: '', lastRound: '' });
            console.log('gameInfo document created.');
        }

        // Check if appStatus/form document exists, if not, create it
        const formDoc = await formEnabledRef.get();
        if (!formDoc.exists) {
            await formEnabledRef.set({ enabled: true });
            console.log('appStatus/form document created.');
        }

        // Check if appStatus/clock document exists, if not, create it
        const clockDoc = await clockRef.get();
        if (!clockDoc.exists) {
             await clockRef.set({ running: false, startTime: null, duration: 300, timeLeft: 300 });
            console.log('appStatus/clock document created.');
        }

        // Note: We don't explicitly create the 'rounds' or 'jugadors' collections here,
        // as they will be created automatically when the first document is added to them.
        // The addNewRound function handles adding the first round.
        // The login logic handles adding the first player.

        console.log('Database initialization check complete.');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Call the initialization function when the script loads
initializeDatabase();

document.getElementById('exportDataBtn').addEventListener('click', exportEliotGameXML);


import { toHumanDigraphs } from './utilitats.js';

async function exportEliotGameXML() {
    const roundsSnapshot = await roundsCollectionRef.orderBy('roundNumber').get();
    const jugadorsSnapshot = await jugadorsCollectionRef.get();

    // Prepara dades de jugadors
    let jugadors = jugadorsSnapshot.docs.map((doc, idx) => ({
        id: idx,
        name: doc.data().name || doc.id,
        table: doc.data().table || '',
    }));

    // Troba i tracta "Jugada mestra" com a "Eliot"
    let eliotIdx = jugadors.findIndex(j => j.name.trim().toLowerCase() === "jugada mestra");
    if (eliotIdx !== -1) {
        jugadors[eliotIdx].name = "Eliot";
        jugadors[eliotIdx].type = "computer";
        jugadors[eliotIdx].level = 100;
    }

    const rounds = roundsSnapshot.docs.map(doc => doc.data());

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<EliotGame format="2">\n`;

    // Diccionari
    xml += `    <Dictionary>\n`;
    xml += `        <Name>DISC 2.17.24</Name>\n`;
    xml += `        <Type>dawg</Type>\n`;
    xml += `        <Letters>A B C Ç D E F G H I J L L·L M N NY O P QU R S T U V X Z ?</Letters>\n`;
    xml += `        <WordNb>583405</WordNb>\n`;
    xml += `    </Dictionary>\n`;

    // Jugadors
    xml += `    <Game>\n`;
    xml += `        <Mode>arbitration</Mode>\n`;
    jugadors.forEach((jug, idx) => {
        xml += `        <Player id="${idx}">\n`;
        xml += `            <Name>${jug.name}</Name>\n`;
        if (jug.name === "Eliot") {
            xml += `            <Type>computer</Type>\n`;
            xml += `            <Level>100</Level>\n`;
        } else {
            xml += `            <Type>human</Type>\n`;
        }
        xml += `            <TableNb>${jug.table}</TableNb>\n`;
        xml += `        </Player>\n`;
    });
    xml += `        <Turns>${rounds.length}</Turns>\n`;
    xml += `    </Game>\n`;

    // Historial de jugades
    xml += `    <History>\n`;
    rounds.forEach((round, roundIdx) => {
        xml += `        <Turn>\n`;

        // Troba la jugada mestra (Eliot)
        let masterResult = null;
        if (round.results) {
            masterResult = Object.entries(round.results).find(
                ([playerName]) => playerName.trim().toLowerCase() === "jugada mestra"
            );
        }

          xml += `            <MasterMove points="0" type="none" />\n`;
       
        // GameRack
        if (round.rack) {
            xml += `            <GameRack>${toHumanDigraphs(round.rack)}</GameRack>\n`;
        }
         
        // PlayerRack per a cada jugador
        jugadors.forEach((jug, idx) => {
            let playerRack = '';
            if (round.playerRacks && round.playerRacks[jug.name]) {
                playerRack = toHumanDigraphs(round.playerRacks[jug.name]);
            } else if (round.rack) {
                playerRack = toHumanDigraphs(round.rack);
            }
            xml += `            <PlayerRack playerId="${idx}">${playerRack}</PlayerRack>\n`;
        });

         


        // PlayerMove per a cada jugador (encara que no hagi jugat)
        jugadors.forEach((jug, idx) => {
            let data = null;
            if (round.results && round.results[jug.name]) {
                data = round.results[jug.name];
            } else if (jug.name === "Eliot" && round.results) {
                // Si el jugador és Eliot, busca per "Jugada mestra"
                const master = Object.entries(round.results).find(
                    ([playerName]) => playerName.trim().toLowerCase() === "jugada mestra"
                );
                if (master) data = master[1];
            }
            if (data) {
                xml += `            <PlayerMove playerId="${idx}" points="${data.score || 0}" type="${data.score === 0 ? 'none' : 'valid'}"${data.word ? ` word="${toHumanDigraphs(data.word)}"` : ''}${data.coordinates ? ` coord="${data.coordinates}"` : ''} />\n`;
            } else {
                xml += `            <PlayerMove playerId="${idx}" points="0" type="none" />\n`;
            }
        });

   

        // Només afegeix MasterMove i GameMove finals si la ronda està tancada
        if (round.closed) {
            if (masterResult) {
                const data = masterResult[1];
                xml += `            <MasterMove points="${data.score || 0}" type="${data.score === 0 ? 'none' : 'valid'}"${data.word ? ` word="${toHumanDigraphs(data.word)}"` : ''}${data.coordinates ? ` coord="${data.coordinates}"` : ''} />\n`;
                xml += `            <GameMove points="${data.score || 0}" type="${data.score === 0 ? 'none' : 'valid'}"${data.word ? ` word="${toHumanDigraphs(data.word)}"` : ''}${data.coordinates ? ` coord="${data.coordinates}"` : ''} />\n`;
            } else {
                xml += `            <MasterMove points="0" type="none" />\n`;
                xml += `            <GameMove points="0" type="none" />\n`;
            }
        }

        xml += `        </Turn>\n`;
    });
    xml += `    </History>\n`;

    xml += `</EliotGame>\n`;

    // Descarrega el fitxer
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultats_eliot.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


export {
    gameInfoRef,
    roundsCollectionRef,
    jugadorsCollectionRef,
    formEnabledRef,
    clockRef,
    exportData,
    exportEliotGameXML
};


