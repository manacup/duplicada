import { jugadorsCollectionRef } from './firebase.js';
import {loadRoundsHistory} from "./gestioRondes.js"
import { assignClockListeners } from './rellotge.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginSection = document.getElementById('login-section');
  const mainContent = document.getElementById('main-content');
  const loginName = document.getElementById('loginName');
  const loginTable = document.getElementById('loginTable');
 const desaSessio = document.getElementById('desaSessio');
 
 const playerInput = document.getElementById('player');
 const tableInput = document.getElementById('taula');
 

  // Si ja hi ha playerName i playerTable al localStorage, carrega dades al formulari
  const storedName = localStorage.getItem('nomJugador');
  const storedTable = localStorage.getItem('playerTable');
  const storedDesaSessio = localStorage.getItem('desaSessio');
  //console.log(storedName,storedTable,storedDesaSessio);
  // Suggested code may be subject to a license. Learn more: ~LicenseLog:3360188146.
  if (storedDesaSessio) { 

   // Omple el camp player del formulari principal si existeix
   loginName.value = storedName;
   loginTable.value = storedTable;
  
   if (playerInput) playerInput.value = storedName; 
   if (tableInput) tableInput.value = storedTable;
   if(desaSessio) desaSessio.checked = storedDesaSessio;


 // Suggested code may be subject to a license. Learn more: ~LicenseLog:1392734631.
 /* if (storedTable.toLowerCase() !== 'administrador') {
   document.querySelectorAll('.master').forEach(el => el.style.display = 'none');
   document.getElementById('validateWords').checked = false;
   document.getElementById('countdown').id = 'countdownSlave';
  }
  return; */
  }

  if (loginForm) {
   loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('loginName').value.trim();
    const table = document.getElementById('loginTable').value.trim();
    const desaSessioValue = document.getElementById('desaSessio').checked;

    if (name === '' || table === '') {
     alert('Si us plau, introduïu el nom i la taula.');
     return;
    }

    // Desa al localStorage (opcional)
    if(desaSessioValue){
      localStorage.setItem('nomJugador', name);
      localStorage.setItem('playerTable', table);
      localStorage.setItem('desaSessio', desaSessioValue);
    }else{
     localStorage.removeItem('nomJugador');
     localStorage.removeItem('playerTable');
     localStorage.removeItem('desaSessio');
    }


    // Check if the player already exists
    const snapshot = await jugadorsCollectionRef.where('name', '==', name).get();

    if (snapshot.empty) {
     // If the player doesn't exist, add them to the database
     await jugadorsCollectionRef.add({ name: name, table: table });
     //console.log(`Player ${name} added to the database.`);
    } else {
     //console.log(`Player ${name} already exists in the database.`);
    }
   

    // Amaga la secció de login i mostra el contingut principal
    loginSection.style.display = 'none';
    mainContent.style.display = 'block';
    mainContent.classList.remove('d-none')
    
    if(table.toLowerCase() === 'pantalla'){
      document.querySelector('.main-grid').classList.add("mode-pantalla")
      loadRoundsHistory()
      return
     }

    if(table.toLowerCase() !== 'administrador'){
     document.querySelectorAll('.master').forEach(el => el.style.display = 'none');
     document.getElementById('validateWords').checked = false;
     //document.getElementById('countdown').id = 'countdownSlave';
    }
    
    

    // Omple el camp player del formulari principal si existeix
    if (playerInput) playerInput.value = name;    
    if (tableInput) tableInput.value = table;

    loadRoundsHistory();
   });
  }

  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const taula = document.getElementById('loginTable').value.trim().toLowerCase();
    window.isAdmin = (taula === 'administrador');
    // ...segueix amb el login...
    if (window.isAdmin) {
      if (typeof assignClockListeners === "function") assignClockListeners();
    }
  });
});
