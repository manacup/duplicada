import { jugadors } from './firebase.js';
import {loadRoundsHistory} from "./gestioRondes.js"

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginSection = document.getElementById('login-section');
  const mainContent = document.getElementById('main-content');
  
  const playerInput = document.getElementById('player');
  const tableInput = document.getElementById('taula');
  const desaSessio = document.getElementById('desaSessio');

  // Si ja hi ha playerName i playerTable al localStorage, carrega dades al formulari
  const storedName = localStorage.getItem('nomJugador');
  const storedTable = localStorage.getItem('playerTable');
  const storedDesaSessio = localStorage.getItem('desaSessio');
  // Suggested code may be subject to a license. Learn more: ~LicenseLog:3360188146.
  if (storedName && storedTable && storedDesaSessio) {

    // Omple el camp player del formulari principal si existeix
   
    if (playerInput) playerInput.value = storedName;
    // Amaga elements amb class="master" si la taula no
   
    if (tableInput) tableInput.value = storedTable;
    if(desaSessio) desaSessio.checked = storedDesaSessio;


// Suggested code may be subject to a license. Learn more: ~LicenseLog:1392734631.
   /*  if (storedTable.toLowerCase() !== 'administrador') {
      document.querySelectorAll('.master').forEach(el => el.style.display = 'none');
      document.getElementById('validateWords').checked = false;
      document.getElementById('countdown').id = 'countdownSlave';
    }
    return; */
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('loginName').value.trim();
      const table = document.getElementById('loginTable').value.trim();
      const email = document.getElementById('email').value.trim();
      

      if (!name || !table) return;
      // Desa al localStorage
      if (desaSessio.checked) {
        localStorage.setItem('desaSessio', 'true');
        localStorage.setItem('nomJugador', name);
        localStorage.setItem('playerTable', table);
      } else {
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2796808651.
        if(localStorage.getItem('desaSessio')&&localStorage.getItem('nomJugador')&&localStorage.getItem('playerTable')){
          localStorage.removeItem('desaSessio');
        localStorage.removeItem('nomJugador');
        localStorage.removeItem('playerTable');}
      }
      // Desa a Firebase
      jugadors.child(`${table}-${name}`).set({ name, email, table, timestamp: Date.now() });
      // Omple el camp player del formulari principal si existeix
      if (playerInput) playerInput.value = name;
      if (tableInput) tableInput.value = storedTable;
      // Amaga login i mostra contingut principal
      if (loginSection) loginSection.style.display = 'none';
      if (mainContent) mainContent.classList.remove('d-none');
      // Amaga elements amb class="master" si la taula no és "administrador"
      if (table.toLowerCase() !== 'administrador') {
        document.querySelectorAll('.master').forEach(el => el.style.display = 'none');
        document.getElementById('validateWords').checked = false;
      //document.getElementById('countdown').id = 'countdownSlave';
      }
      loadRoundsHistory();
    });
  }
});
