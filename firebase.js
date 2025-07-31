// Inicialització de Firebase i exportació de referències útils

// Assegura't d'afegir el teu objecte de configuració de Firebase aquí:
/* const firebaseConfig = {
    apiKey: "AIzaSyAwsV6cBafAt6OQRNUEFXCoRT-D5Fzvqbk",
    authDomain: "duplicadascrabble.firebaseapp.com",
    databaseURL: "https://duplicadascrabble-default-rtdb.europe-west1.firebasedatabase.app", // Corrected URL            
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

// Referències a la base de dades
const db = firebase.database();
const gameInfoRef = db.ref('gameInfo');
const historyRef = db.ref('rounds');
const resultsRef = db.ref('results');
const clockRef = db.ref('clock');
const jugadorsRef = db.ref('jugadors');
const formEnabled = db.ref('formEnabled');


export { db, gameInfoRef, historyRef, clockRef, jugadorsRef,formEnabled,resultsRef };
