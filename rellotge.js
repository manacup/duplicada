import { clockRef,db } from './firebase.js';

const countdownElement = document.getElementById('countdown');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const pipSound = document.getElementById('pipSound');
const storedTable = localStorage.getItem('playerTable');
const TEMPS_TOTAL = 300; // segons

function isAdmin() {
  return storedTable && storedTable.toLowerCase() === 'administrador';
}
console.log("isAdmin",isAdmin());
// Si no és administrador, afegeix la classe countdownSlave
if(!isAdmin()) countdownElement.classList.add('countdownSlave');
// --- FUNCIONS MASTER (ADMIN) ---

function startTimer() {
  // Si ja estava pausat, calcula la nova startTime segons el temps restant
  clockRef.once('value', snap => {
    const data = snap.val();
    let duration = TEMPS_TOTAL;
    if (data && data.timeLeft !== undefined && data.timeLeft !== null) {
      duration = data.timeLeft;
    }
    clockRef.set({
      running: true,
      startTime: Date.now(),
      duration: duration,
      timeLeft: duration
    });
    db.ref('formEnabled').set(true); // Activa el formulari
    //if (pipSound) pipSound.play();
  });
}

function stopTimer() {
  // Desa el temps restant i posa running a false
  clockRef.once('value', snap => {
    const data = snap.val();
    if (!data || !data.running) return;
    const now = Date.now();
    const timeLeft = Math.max(0, data.duration - Math.floor((now - data.startTime) / 1000));
    clockRef.update({
      running: false,
      timeLeft: timeLeft
    });
    db.ref('formEnabled').set(false); // Activa el formulari
  });
}

function resetTimer() {
  clockRef.set({
    running: false,
    startTime: null,
    duration: TEMPS_TOTAL,
    timeLeft: TEMPS_TOTAL
  });
}

if (isAdmin()) {
  if (startBtn) startBtn.addEventListener('click', startTimer);
  if (stopBtn) stopBtn.addEventListener('click', stopTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);
}

// --- FUNCIONS ESCLAU I MASTER (VISUALITZACIÓ) ---

let interval;
clockRef.on('value', (snapshot) => {
  const data = snapshot.val();
  if (!data || (!data.startTime && !data.timeLeft)) return;

  clearInterval(interval);

  function updateDisplay() {
    let timeLeft;
    if (data.running && data.startTime) {
      const now = Date.now();
      timeLeft = Math.max(0, data.duration - Math.floor((now - data.startTime) / 1000));
    } else {
      timeLeft = data.timeLeft !== undefined ? data.timeLeft : TEMPS_TOTAL;
    }

    // Format
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const displayMinutes = String(minutes).padStart(2, '0');
    const displaySeconds = String(seconds).padStart(2, '0');
    countdownElement.textContent = `${displayMinutes}:${displaySeconds}`;

    // Estils i sons
    countdownElement.classList.toggle('paused', !data.running || timeLeft === 0);
    countdownElement.classList.toggle('warning', timeLeft <= 30 && timeLeft > 0);

    if (timeLeft <= 30 && timeLeft > 0 && timeLeft % 10 === 0) {
      pipSound?.play();
    }
    if (timeLeft === 0) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => { pipSound?.play(); }, i * 200);
      }
      clearInterval(interval);
      stopTimer()
    }
  }

  updateDisplay();
  if (data.running && data.startTime) {
    interval = setInterval(updateDisplay, 1000);
  }
});
