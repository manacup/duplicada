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

export {
    gameInfoRef,
    roundsCollectionRef,
    jugadorsCollectionRef,
    formEnabledRef,
    clockRef,
    exportData
};


