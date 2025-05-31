// Inicialització de Firebase i exportació de referències útils

// Assegura't d'afegir el teu objecte de configuració de Firebase aquí:
const firebaseConfig = {
    apiKey: "AIzaSyAwsV6cBafAt6OQRNUEFXCoRT-D5Fzvqbk",
    authDomain: "duplicadascrabble.firebaseapp.com",
    databaseURL: "https://duplicadascrabble-default-rtdb.europe-west1.firebasedatabase.app", // Keep Realtime DB URL for now, but won't be used directly here
    projectId: "duplicadascrabble",
    storageBucket: "duplicadascrabble.firebasestorage.app",
    messagingSenderId: "115691804214",
    appId: "1:115691804214:web:dd923cf73c46146c0b2a97"
};

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


export { firestore, gameInfoRef, roundsCollectionRef, jugadorsCollectionRef, formEnabledRef, clockRef };
