import {clockRef, db} from './firebase.js';



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
clockRef.set(`${displayMinutes}:${displaySeconds}`)
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
    clearInterval(timer);
    timer = null;
    db.ref('formEnabled').set(false);
}

function resetTimer() {
    stopTimer();
    timeLeft = 300; // Reset to 5 minutes
    updateTimerDisplay();
     countdownElement.classList.remove('warning'); // Remove warning class on reset
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);

// Initial display
updateTimerDisplay();