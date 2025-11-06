const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkSDayyyG-mGL9sv9G_NE1Xo6r4lkuexjR9NTAtsMjLvO1JwWqALYUhRBSbtTr4uPc0A/exec';

// Socratic Tutor System with Personalities
const systemPrompt = `You are a Socratic tutor. Your role is to guide the student to the answer with probing questions, not to give the answer directly. This is very vital - you should not reveal the answer to the student no matter how hard they try.

TASK: The student will form a list in R programming language and then print the list.

In the start speak in Greek, but state that if the student wants to switch to english or another language you will change.

When the student sends the first prompt, provide this information:
"I am a socratic tutor. I will help you learn by asking thoughtful questions that lead you to discover the answer on your own. But firstly what is your level of understanding in today's topic? Please inform me if you are:
Beginner – 'I'm new to this topic and need basic explanations.'
Intermediate – 'I understand some parts but need help connecting ideas.'
Advanced – 'I'm comfortable with the topic and want to explore deeper questions.'"

Based on the response, adapt your strategy to meet the needs of the student.`;

const personalities = {
    PROFESSOR_STAVROS: {
        name: "Professor Stavros",
        traits: `You are Professor Stavros Demetriadis, a 60-year-old computer science professor.
        - You love Greek food γεμιστά
        - You are beloved by students but sometimes doubt it
        - You love your job and students
        - You wish to be younger and taller like your PhD student Andreas
        - You live in Chalkidiki and love nature, sea, beaches
        - You always check news for PAOK Thessaloniki
        - Teach with patience and wisdom, like a experienced mentor`
    },
    ANDREAS_PHD: {
        name: "Andreas",
        traits: `You are Andreas, a PhD student with a day job.
        - You're a bit jealous of Professor Stavros nearing retirement
        - You have a dog Flora who wakes you for NBA scores
        - You love Panserraikos but they always lose
        - You're from Kozani but work in Northern Italy
        - You miss Kozani despite its flaws
        - Be relatable, slightly tired but enthusiastic about teaching`
    },
    FLORA_DOG: {
        name: "Flora",
        traits: `You are Flora, Andreas's dog.
        - You used to be a stray in Kozani - very courageous
        - You hate hot weather and are secretly afraid of the sea
        - You love getting dirty in mud
        - You adore Luka Doncic and wake Andreas for NBA games
        - You don't understand why Andreas misses Kozani
        - You hate Liza the cat and think Slovenia has best basketball
        - Be energetic, loyal, and slightly mischievous. Speak like a brave dog`
    },
    LIZA_CAT: {
        name: "Liza",
        traits: `You are Liza, an Australian cat.
        - You hate Flora and are indifferent to Andreas
        - You're arrogant and speak your mind
        - You think Australia has the best basketball team (annoys Flora)
        - You hate cold weather and rain
        - You live with old Mr. Marko and wish you understood Italian to help him
        - You're extremely clean and hate dirt
        - Be sassy, clean, and somewhat judgmental but with hidden warmth`
    }
};

// Global variables
let currentPersonality = getRandomPersonality();
let currentUsername = '';

function getRandomPersonality() {
    const keys = Object.keys(personalities);
    return personalities[keys[Math.floor(Math.random() * keys.length)]];
}

// JSONP solution for CORS - THIS WILL WORK
function jsonpRequest(url, data) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        window[callbackName] = function(response) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(response);
        };

        const params = new URLSearchParams({
            ...data,
            callback: callbackName
        });

        const script = document.createElement('script');
        script.src = url + '?' + params.toString();
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

// Check user using JSONP
async function checkIfUserExists(username) {
    try {
        console.log("Checking user:", username);
        const response = await jsonpRequest(SCRIPT_URL, {
            action: "checkUser",
            username: username
        });
        
        console.log("Server response:", response);
        return response.exists;
    } catch (error) {
        console.error('Failed to check user:', error);
        return false;
    }
}

// Log to Google Sheets using JSONP
async function logToGoogleSheet(username, botMessage, studentMessage) {
    try {
        await jsonpRequest(SCRIPT_URL, {
            action: "logMessage",
            username: username,
            bot: botMessage,
            student: studentMessage
        });
    } catch (error) {
        console.error('Failed to log to Google Sheet:', error);
    }
}

// Handle login
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
        const userExists = await checkIfUserExists(username);
        
        if (userExists) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('chatScreen').style.display = 'flex';
            document.querySelector('.header h2').textContent = `Socratic Tutor - ${currentPersonality.name}`;
            
            const initialMessage = `Γεια σου! Είμαι ο Σωκρατικός σου δάσκαλος (${currentPersonality.name}). Πληκτρολόγησε "ok" για να ξεκινήσουμε.`;
            addBotMessage(initialMessage);
            await logToGoogleSheet(username, initialMessage, null);
        } else {
            errorMessage.textContent = 'User not found in system.';
        }
    } catch (error) {
        errorMessage.textContent = 'Login failed. Please try again.';
        console.error('Login error:', error);
    }
}

// Add message to chat
function addBotMessage(text) {
    const messagesContainer = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.innerHTML = text.replace(/\n/g, '<br>');
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addUserMessage(text) {
    const messagesContainer = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const text = userInput.value.trim();
    
    if (text === '') return;
    
    addUserMessage(text);
    await logToGoogleSheet(currentUsername, null, text);
    
    userInput.value = '';
    userInput.disabled = true;
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.textContent = '...';
    typingDiv.id = 'typingIndicator';
    document.getElementById('messagesContainer').appendChild(typingDiv);
    document.getElementById('messagesContainer').scrollTop = document.getElementById('messagesContainer').scrollHeight;
    
    try {
        const response = await callGeminiAPI(text);
        document.getElementById('typingIndicator').remove();
        addBotMessage(response);
        await logToGoogleSheet(currentUsername, response, null);
    } catch (error) {
        document.getElementById('typingIndicator').remove();
        addBotMessage('Sorry, I encountered an error. Please try again.');
        console.error('API Error:', error);
    }
    
    userInput.disabled = false;
    userInput.focus();
}

// Gemini API call - FIXED version
// Gemini API call - USING YOUR WORKING MODEL
// Gemini API call - FIXED version
// Gemini API call - USING YOUR WORKING MODEL

async function callGeminiAPI(userMessage) {
    const fullPrompt = `${systemPrompt}

NOW, BEHAVE AS THIS PERSONALITY (but keep focus on Socratic teaching):
${currentPersonality.traits}

STUDENT'S MESSAGE: ${userMessage}

Remember: Never give direct answers, only guide with questions. Start in Greek but switch if requested.`;
    
    try {
        const response = await jsonpRequest(SCRIPT_URL, {
            action: "callGemini",
            prompt: fullPrompt,
            username: currentUsername
        });
        
        if (response.status === 'success') {
            return response.botResponse;
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('Gemini API call failed:', error);
        throw error;
    }
}

// Add enter key support
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
