import { clockRef, db } from './firebase.js';



const countdownElement = document.getElementById('countdown');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const pipSound = document.getElementById('pipSound');
const storedTable = localStorage.getItem('playerTable');
function isAdmin() {
    return storedTable && storedTable.toLowerCase() === 'administrador';
}

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
        clockRef.child('warning').set(true)
        countdownElement.classList.add('warning');
        if (timeLeft > 0 && timeLeft <= 30 && timeLeft % 10 === 0) { // Play pip sound every 10 seconds in the last 30
            pipSound.play();
             
        } else if (timeLeft === 0) {
            
            //repeteix el so 3 vegades
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    pipSound.play();
                }, i * 200); // Play every second
            }
            countdownElement.classList.add('paused');
            clockRef.child('running').set(false)
        }
    } else {
        countdownElement.classList.remove('warning');
    }
}

function startTimer() {
    countdownElement.classList.remove('paused');
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
                clockRef.child('running').set(false)
                clockRef.child('timeLeft').set(300)

            }
        }, 1000); // Update every 1 second
    }
}

function stopTimer() {
    countdownElement.classList.add('paused');
 if (timer) {
 clearInterval(timer);
 timer = null;
    db.ref('formEnabled').set(false); // Assuming form is disabled when timer stops
    clockRef.child('running').set(false); // Update running status in Firebase
 }
}

function resetTimer() {
    countdownElement.classList.add('paused');
    clockRef.child('running').set(false)
    clockRef.child('warning').set(false)
    stopTimer();
    timeLeft = 300; // Reset to 5 minutes
    clockRef.child('timeLeft').set(timeLeft)
    updateTimerDisplay();
    countdownElement.classList.remove('warning'); // Remove warning class on reset
}

if(startBtn) startBtn.addEventListener('click', startTimer);
if(stopBtn) stopBtn.addEventListener('click', stopTimer);
if(resetBtn) resetBtn.addEventListener('click', resetTimer);

// Load saved time and state from Firebase on page load
if (isAdmin()) {
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
}

const rellotgeEsclau = document.getElementById("countdown")
function updateTimerDisplaySlave() {
    
    if (!isAdmin()) {
        rellotgeEsclau.id = "countdownSlave"
        clockRef.on('value', (snapshot) => {
            rellotgeEsclau.textContent = snapshot.val().time
            if (snapshot.val().warning) {
                rellotgeEsclau.classList.add('warning');
            }
            else {
                rellotgeEsclau.classList.remove('warning');
            }
            if (snapshot.val().running) {
                rellotgeEsclau.classList.remove('paused');
            } else {
                rellotgeEsclau.classList.add('paused');
            }
            if (snapshot.val().timeLeft <= 0) {
                rellotgeEsclau.classList.add('paused');
                //repeteix el so 3 vegades
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        pipSound.play();
                    }, i * 200); // Play every second
                }
            }

        })
    }
}
updateTimerDisplaySlave()