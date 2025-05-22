import { jugadors } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginSection = document.getElementById('login-section');
  const mainContent = document.getElementById('main-content');

  // Si ja hi ha playerName i playerTable al localStorage, entra directament
  const storedName = localStorage.getItem('nomJugador');
  const storedTable = localStorage.getItem('playerTable');
  if (storedName && storedTable) {
    if (loginSection) loginSection.style.display = 'none';
    if (mainContent) mainContent.classList.remove('d-none');
    // Omple el camp player del formulari principal si existeix
    const playerInput = document.getElementById('player');
    if (playerInput) playerInput.value = storedName;
    // Amaga elements amb class="master" si la taula no
    const tableInput = document.getElementById('taula');
    if (tableInput) tableInput.value = storedTable;
    if (storedTable.toLowerCase() !== 'administrador') {
      document.querySelectorAll('.master').forEach(el => el.style.display = 'none');
      document.getElementById('validateWords').checked = false;
      document. getElementById('countdown').id = 'countdownSlave';
    }
    return;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('loginName').value.trim();
      const table = document.getElementById('loginTable').value.trim();
      const email = document.getElementById('email').value.trim();
      const playerInput = document.getElementById('player');
      const tableInput = document.getElementById('taula');
    
      if (!name || !table) return;
      // Desa al localStorage
      localStorage.setItem('nomJugador', name);
      localStorage.setItem('playerTable', table);
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
      }
    });
  }
});
