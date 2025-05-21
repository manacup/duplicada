import { clockRef, db } from './firebase.js';



const countdownElement = document.getElementById('countdown');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const pipSound = document.getElementById('pipSound');

let timer;
let timeLeft = 300; // 5 minutes in seconds

function updateTimerDisplay() {
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const displayMinutes = String(minutes).padStart(2, '0');
    const displaySeconds = String(seconds).padStart(2, '0');
    countdownElement.textContent = `${displayMinutes}:${displaySeconds}`;

    clockRef.child('time').set(`${displayMinutes}:${displaySeconds}`)
    clockRef.child('timeLeft').set(timeLeft)
    

    if (timeLeft <= 30) {
        countdownElement.classList.add('warning');
        if (timeLeft > 0 && timeLeft <= 30 && timeLeft % 10 === 0) { // Play pip sound every 10 seconds in the last 30
            pipSound.play();
        } else if (timeLeft === 0) {
            pipSound.play(); // Final pip at 0
        }
    } else {
        countdownElement.classList.remove('warning');
    }
}

function startTimer() {
    if (!timer) {
        db.ref('formEnabled').set(true);
        clockRef.child('running').set(true)

        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timer);
                timer = null;
                // Optionally, add actions when the timer reaches zero
                db.ref('formEnabled').set(false);

            }
        }, 1000); // Update every 1 second
    }
}

function stopTimer() {
 if (timer) {
 clearInterval(timer);
 timer = null;
    db.ref('formEnabled').set(false); // Assuming form is disabled when timer stops
    clockRef.child('running').set(false); // Update running status in Firebase
 }
}

function resetTimer() {
    clockRef.child('running').set(false)
    stopTimer();
    timeLeft = 300; // Reset to 5 minutes
    updateTimerDisplay();
    countdownElement.classList.remove('warning'); // Remove warning class on reset
}

if(startBtn) startBtn.addEventListener('click', startTimer);
if(stopBtn) stopBtn.addEventListener('click', stopTimer);
if(resetBtn) resetBtn.addEventListener('click', resetTimer);

// Load saved time and state from Firebase on page load
clockRef.once('value', (snapshot) => {
 const savedData = snapshot.val();
 if (savedData && savedData.timeLeft !== undefined) {
        timeLeft = savedData.timeLeft;
        updateTimerDisplay();
 if (savedData.running) {
 startTimer();
 }
 } else {
 // If no data in Firebase, initialize with default time and update display
        updateTimerDisplay();
 }
});

const rellotgeEsclau = document.getElementById("countdownSlave")
function updateTimerDisplaySlave() {
    if (rellotgeEsclau) {

        clockRef.on('value', (snapshot) => {
            rellotgeEsclau.textContent = snapshot.val()
        })
    }
}
updateTimerDisplaySlave()