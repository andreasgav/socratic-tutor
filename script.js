const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUsSBSkwWhlEezKQ7hKvu8iYThwqasmTNg2trN_zzKuvtkLsgVjhsQPFccEkZoPAkXfQ/exec';

let currentUsername = '';
let sessionId = '';
let partner = '';
let myUserNumber = 1;
let pollInterval = null;
let lastMessageTime = null;
let chatStarted = false;

async function handleLogin() {
    const email = document.getElementById('emailInput').value;
    const errorMessage = document.getElementById('errorMessage');
    
    if (!email.includes('@csd.auth.gr')) {
        errorMessage.textContent = 'Please enter a valid @csd.auth.gr email.';
        return;
    }
    
    const username = email.split('@')[0].toLowerCase();
    currentUsername = username;
    
    try {
        const userExists = await jsonpRequest(SCRIPT_URL, {
            action: "checkUser",
            username: username
        });
        
        if (!userExists.exists) {
            errorMessage.textContent = 'User not found in system.';
            return;
        }
        
        const sessionRes = await jsonpRequest(SCRIPT_URL, {
            action: "findSession",
            username: username
        });
        
        if (sessionRes.status !== "success") {
            throw new Error("Session creation failed");
        }
        
        document.getElementById('loginScreen').style.display = 'none';
        
        if (sessionRes.sessionId) {
            sessionId = sessionRes.sessionId;
            partner = sessionRes.partner;
            
            // FIXED: Correct user number calculation
            const sessionUsers = sessionId.split('_');
            myUserNumber = (sessionUsers[0] === username) ? 1 : 2;
            
            startChatSession();
        } else {
            document.getElementById('waitingScreen').style.display = 'flex';
            pollInterval = setInterval(async () => {
                try {
                    const status = await jsonpRequest(SCRIPT_URL, {
                        action: "sessionStatus",
                        username: username
                    });
                    
                    if (status.sessionId) {
                        clearInterval(pollInterval);
                        sessionId = status.sessionId;
                        partner = status.partner;
                        
                        // FIXED HERE TOO
                        const sessionUsers = sessionId.split('_');
                        myUserNumber = (sessionUsers[0] === username) ? 1 : 2;
                        
                        document.getElementById('waitingScreen').style.display = 'none';
                        startChatSession();
                    }
                } catch (error) {
                    console.error('Polling error:', error);
                }
            }, 3000);
        }
        
    } catch (error) {
        errorMessage.textContent = 'Login failed. Please try again.';
        console.error('Login error:', error);
    }
}

function cancelWaiting() {
    if (pollInterval) clearInterval(pollInterval);
    document.getElementById('waitingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

function startChatSession() {
    if (chatStarted) return; // Prevent multiple calls
    chatStarted = true;
    
    document.getElementById('chatScreen').style.display = 'flex';
    document.getElementById('partnerName').textContent = partner;
    document.getElementById('sessionId').textContent = sessionId;
    
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(pollForMessages, 2000);
    
        const assignment = `πρέπει να σχεδιάσετε ένα προγνωστικό μοντέλο για την κατανομή μιας περιορισμένης παρέμβασης (μόνο το 10% των περιπτώσεων μπορεί να επιλεγεί) σε έναν πραγματικό τομέα της επιλογής σας.

    Δεν σας παρέχονται δεδομένα.

    Ως ομάδα, αποφασίστε και τεκμηριώστε:
    1. Ποιο αποτέλεσμα προβλέπετε
    2. Ποιο σφάλμα είναι πιο κοστοβόρο (ψευδώς θετικό ή ψευδώς αρνητικό) και γιατί
    3. Ποιες μεταβλητές θα αποκλείατε σκόπιμα, ακόμη κι αν αυξάνουν την ακρίβεια
    4. Ποια μετρική αξιολόγησης θα βελτιστοποιούσατε και ποια κοινή μετρική θα αρνιόσασταν να χρησιμοποιήσετε
    5. Με βάση ποια συγκεκριμένα στοιχεία θα διακόπτατε τη λειτουργία του συστήματος μετά την εφαρμογή του

    Απαιτείται:
    - να διαφωνήσετε τουλάχιστον σε δύο από τα παραπάνω σημεία,
    - να επιλύσετε τις διαφωνίες μέσω συζήτησης,
    - και να παρουσιάσετε μια κοινή, τεκμηριωμένη τελική απόφαση.`;

    addMessage(`Χαίρεται! Συζητάτε με την/τον χρήστη ${partner}.\n\n${assignment}`, 'system');
    
    setTimeout(() => {
        document.getElementById('submitArea').style.display = 'flex';
    }, 1000);
}

function addMessage(text, sender) {
    const container = document.getElementById('messagesContainer');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    
    if (sender === 'system') {
        msgDiv.style.cssText = 'background-color: #e9ecef; color: #212529; margin-right: auto; margin-left: 0; border-radius: 20px 20px 20px 5px; border-left: 4px solid #ffc107;';
        msgDiv.textContent = text;
    } else if (sender === 'user') {
        msgDiv.style.cssText = 'background-color: #006a60; color: white; margin-left: auto; margin-right: 0; border-radius: 20px 20px 5px 20px;';
        msgDiv.textContent = `You: ${text}`;
    } else if (sender === 'partner') {
        msgDiv.style.cssText = 'background-color: #8B4513; color: white; margin-right: auto; margin-left: 0; border-radius: 20px 20px 20px 5px;';
        msgDiv.textContent = `${partner}: ${text}`;
    } else if (sender === 'bot') {
        msgDiv.style.cssText = 'background-color: #e9ecef; color: #212529; margin-right: auto; margin-left: 0; border-radius: 20px 20px 20px 5px; border-left: 4px solid #ffc107;';
        msgDiv.textContent = `Tutor: ${text}`;
    }
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

async function pollForMessages() {
    try {
        const response = await jsonpRequest(SCRIPT_URL, {
            action: "getHistory",
            sessionId: sessionId,
            username: currentUsername
        });
        
        if (response.status === "success" && response.messages) {
            response.messages.forEach(msg => {
                if (!lastMessageTime || new Date(msg.timestamp) > lastMessageTime) {
                    lastMessageTime = new Date(msg.timestamp);
                    
                    if (msg.speaker === partner) {
                        addMessage(msg.message, 'partner');
                    } else if (msg.speaker === "BOT") {
                        addMessage(msg.message, 'bot');
                    }
                }
            });
        }
    } catch (error) {
        console.error("Polling error:", error);
    }
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    
    if (!text || !sessionId) return;
    
    addMessage(text, 'user');
    
    await jsonpRequest(SCRIPT_URL, {
        action: "logMsg",
        sessionId: sessionId,
        speaker: currentUsername,
        message: text
    });
    
    input.value = '';
    
    // Trigger AI analysis AFTER a short delay
    setTimeout(async () => {
        try {
            await jsonpRequest(SCRIPT_URL, {
                action: "callGemini",
                prompt: `ANALYZE_CONVERSATION: New message from ${currentUsername}. Should I intervene as Socratic tutor?`,
                sessionId: sessionId
            });
        } catch (error) {
            console.error("AI analysis failed:", error);
        }
    }, 1500); // 1.5 second delay
}

async function submitFinalDecision() {
    const decision = document.getElementById('finalDecision').value.trim();
    if (!decision) {
        alert('Please enter your final decision.');
        return;
    }
    
    await jsonpRequest(SCRIPT_URL, {
        action: "logMsg",
        sessionId: sessionId,
        speaker: 'FINAL',
        message: decision
    });
    
    alert('Final decision submitted!');
    document.getElementById('finalDecision').disabled = true;
    document.querySelector('.submit-area button').disabled = true;
}

function jsonpRequest(url, data) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        const timeoutId = setTimeout(() => {
            delete window[callbackName];
            const script = document.querySelector(`script[src*="${callbackName}"]`);
            if (script) document.body.removeChild(script);
            reject(new Error('Request timeout'));
        }, 30000);

        window[callbackName] = function(response) {
            clearTimeout(timeoutId);
            delete window[callbackName];
            const script = document.querySelector(`script[src*="${callbackName}"]`);
            if (script) document.body.removeChild(script);
            resolve(response);
        };

        const params = new URLSearchParams({
            ...data,
            callback: callbackName
        });

        const script = document.createElement('script');
        script.src = url + '?' + params.toString();
        script.onerror = (err) => {
            clearTimeout(timeoutId);
            reject(err);
        };
        document.body.appendChild(script);
    });
}

document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});




