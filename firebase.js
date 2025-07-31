// Inicialització de Firebase i exportació de referències útils

// Assegura't d'afegir el teu objecte de configuració de Firebase aquí:
/* const firebaseConfig = {
    apiKey: "AIzaSyAwsV6cBafAt6OQRNUEFXCoRT-D5Fzvqbk",
    authDomain: "duplicadascrabble.firebaseapp.com",
    databaseURL: "https://duplicadascrabble-default-rtdb.europe-west1.firebasedatabase.app", // Keep Realtime DB URL for now, but won't be used directly here
    projectId: "duplicadascrabble",
    storageBucket: "duplicadascrabble.firebasestorage.app",
    messagingSenderId: "115691804214",
    appId: "1:115691804214:web:dd923cf73c46146c0b2a97"
}; */
const firebaseConfig = {

    apiKey: "AIzaSyBbWqeWhQgK5C0Ioj7-uSNx9q0i8VZmIJM",
  
    authDomain: "duplicadaporreres.firebaseapp.com",
  
    projectId: "duplicadaporreres",
  
    storageBucket: "duplicadaporreres.firebasestorage.app",
  
    messagingSenderId: "835862262761",
  
    appId: "1:835862262761:web:4465dadd41f0f31edd1178"
  
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


async function exportData() {
 try {
 const data = {};

 // Fetch gameInfo
 const gameInfoDoc = await gameInfoRef.get();
 data.gameInfo = gameInfoDoc.exists ? gameInfoDoc.data() : null;

 // Fetch rounds
 const roundsSnapshot = await roundsCollectionRef.get();
 data.rounds = roundsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

 // Fetch jugadors
 const jugadorsSnapshot = await jugadorsCollectionRef.get();
 data.jugadors = jugadorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

 // Fetch appStatus
 const formEnabledDoc = await formEnabledRef.get();
 const clockDoc = await clockRef.get();
 data.appStatus = {
 formEnabled: formEnabledDoc.exists ? formEnabledDoc.data() : null,
 clock: clockDoc.exists ? clockDoc.data() : null
 };

      // Convert data to JSON string
      const jsonData = JSON.stringify(data, null, 2);

      // Create a Blob from the JSON string
      const blob = new Blob([jsonData], { type: 'application/json' });

      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database_export.json';
      a.click();
 } catch (error) {
 console.error("Error exporting data:", error);
 throw error; // Re-throw the error for handling by the caller
 }
}

export { firestore, gameInfoRef, roundsCollectionRef, jugadorsCollectionRef, formEnabledRef, clockRef };
export { exportData };
