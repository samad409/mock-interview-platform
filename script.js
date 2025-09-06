// Import Firebase SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, onSnapshot, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Firebase Configuration (Replace with your config)
const firebaseConfig = {
    apiKey: "AIzaSyBGTUC5uYEpRy1C4glzvNBGtAfiU94f8h4",
  authDomain: "ai-mock-interview-platfo-99047.firebaseapp.com",
  projectId: "ai-mock-interview-platfo-99047",
  storageBucket: "ai-mock-interview-platfo-99047.firebasestorage.app",
  messagingSenderId: "771106895900",
  appId: "1:771106895900:web:838dbdbd24b33ad47947d9",
  measurementId: "G-PHKGVH4BS8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global Variables
let currentUser = null;
let resumeText = '';
let currentJobTitle = '';
let currentQuestions = [];
let currentQuestionIndex = 0;
let isRecording = false;
let recognition = null;
let synthesis = window.speechSynthesis;
let unsubscribeHistory = null;

// Gemini API Configuration
const GEMINI_API_KEY = 'AIzaSyDKqqn-VPnvcxB_COmutj0UkmOj1cjar2w'; // Replace with your actual Gemini API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// PDF.js Configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const authView = document.getElementById('auth-view');
const setupView = document.getElementById('setup-view');
const interviewView = document.getElementById('interview-view');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalClose = document.getElementById('modal-close');
const modalOk = document.getElementById('modal-ok');
const loadingSpinner = document.getElementById('loading-spinner');

// Authentication Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');

// Setup Elements
const resumeUpload = document.getElementById('resume-upload');
const resumeStatus = document.getElementById('resume-status');
const jobTitle = document.getElementById('job-title');
const startInterviewBtn = document.getElementById('start-interview-btn');
const userIdDisplay = document.getElementById('user-id-display');
const interviewHistory = document.getElementById('interview-history');

// Interview Elements
const currentJobTitleSpan = document.getElementById('current-job-title');
const currentQuestion = document.getElementById('current-question');
const replayQuestionBtn = document.getElementById('replay-question-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const endInterviewBtn = document.getElementById('end-interview-btn');
const toggleRecordingBtn = document.getElementById('toggle-recording-btn');
const liveTranscript = document.getElementById('live-transcript');
const recordingStatus = document.getElementById('recording-status');
const questionHistory = document.getElementById('question-history');

// Modal Functions
function showModal(title, message, showLoading = false) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalMessage.style.display = showLoading ? 'none' : 'block';
    loadingSpinner.style.display = showLoading ? 'block' : 'none';
    modal.classList.add('show');
}

function hideModal() {
    modal.classList.remove('show');
    setTimeout(() => {
        loadingSpinner.style.display = 'none';
        modalMessage.style.display = 'block';
    }, 300);
}

// View Management
function showView(view) {
    [authView, setupView, interviewView].forEach(v => {
        v.classList.add('hidden');
        v.classList.add('view-hidden');
    });
    
    setTimeout(() => {
        view.classList.remove('hidden');
        setTimeout(() => view.classList.remove('view-hidden'), 10);
    }, 150);
}

// Authentication Functions
async function registerUser(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        showModal('Success', 'Account created successfully!');
        return userCredential.user;
    } catch (error) {
        showModal('Registration Error', error.message);
        throw error;
    }
}

async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        showModal('Login Error', error.message);
        throw error;
    }
}

async function logoutUser() {
    try {
        if (unsubscribeHistory) {
            unsubscribeHistory();
            unsubscribeHistory = null;
        }
        await signOut(auth);
        currentUser = null;
        showView(authView);
    } catch (error) {
        showModal('Logout Error', error.message);
    }
}

// PDF Processing
async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + ' ';
        }

        return fullText.trim();
    } catch (error) {
        throw new Error('Failed to extract text from PDF: ' + error.message);
    }
}

// Gemini API Integration
async function generateInterviewQuestion(resumeText, jobTitle, previousQuestions = []) {
    const prompt = `You are a professional technical interviewer. Based on the following resume and job position, generate ONE thoughtful, open-ended interview question that assesses both technical skills and cultural fit.

Resume: ${resumeText}

Position: ${jobTitle}

Previous questions asked: ${previousQuestions.join(', ') || 'None'}

Guidelines:
- Ask about specific technologies, projects, or experiences mentioned in the resume
- Make the question relevant to the ${jobTitle} position
- Avoid yes/no questions
- Don't repeat previous questions
- Keep it conversational and professional
- Focus on problem-solving, experience, or technical depth

Generate only the question, no additional text:`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 200,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const question = data.candidates[0].content.parts[0].text.trim();
        return question;
    } catch (error) {
        console.error('Gemini API Error:', error);
        // Fallback questions if API fails
        const fallbackQuestions = [
            `Tell me about a challenging project you've worked on that's relevant to this ${jobTitle} position.`,
            `How do you approach problem-solving when faced with technical difficulties in your work?`,
            `Describe a time when you had to learn a new technology or skill quickly. How did you go about it?`,
            `What interests you most about this ${jobTitle} role, and how do your experiences prepare you for it?`,
            `Walk me through your thought process when designing or implementing a complex solution.`
        ];
        return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
    }
}

// Speech Functions
function speakText(text) {
    if (synthesis.speaking) {
        synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    // Try to use a professional-sounding voice
    const voices = synthesis.getVoices();
    const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Google') || voice.name.includes('Microsoft'))
    );
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    synthesis.speak(utterance);
}

function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
        recognition = new SpeechRecognition();
    } else {
        showModal('Error', 'Speech recognition is not supported in this browser.');
        return false;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isRecording = true;
        toggleRecordingBtn.textContent = '⏹️ Stop Recording';
        toggleRecordingBtn.classList.add('recording-pulse');
        recordingStatus.textContent = 'Recording... Speak now';
        liveTranscript.textContent = '';
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        liveTranscript.textContent = transcript;
        liveTranscript.scrollTop = liveTranscript.scrollHeight;
    };

    recognition.onend = () => {
        isRecording = false;
        toggleRecordingBtn.textContent = '🎤 Start Recording';
        toggleRecordingBtn.classList.remove('recording-pulse');
        recordingStatus.textContent = 'Recording stopped';
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        recordingStatus.textContent = `Error: ${event.error}`;
        isRecording = false;
        toggleRecordingBtn.textContent = '🎤 Start Recording';
        toggleRecordingBtn.classList.remove('recording-pulse');
    };

    return true;
}

// Interview Functions
async function startInterview() {
    currentJobTitle = jobTitle.value.trim();
    currentJobTitleSpan.textContent = currentJobTitle;
    currentQuestions = [];
    currentQuestionIndex = 0;
    
    showView(interviewView);
    
    // Clear previous content
    liveTranscript.textContent = 'Click "Start Recording" to begin speaking your answer...';
    questionHistory.innerHTML = '';
    
    // Generate and display first question
    await loadNextQuestion();
}

async function loadNextQuestion() {
    showModal('Generating Question', '', true);
    
    try {
        const previousQuestions = currentQuestions.map(q => q.question);
        const question = await generateInterviewQuestion(resumeText, currentJobTitle, previousQuestions);
        
        currentQuestions.push({
            question: question,
            answer: '',
            timestamp: new Date().toISOString()
        });
        
        currentQuestion.textContent = question;
        speakText(question);
        
        // Clear the current answer area
        liveTranscript.textContent = 'Click "Start Recording" to begin speaking your answer...';
        
        hideModal();
    } catch (error) {
        hideModal();
        showModal('Error', 'Failed to generate question: ' + error.message);
    }
}

function saveCurrentAnswer() {
    const answer = liveTranscript.textContent.trim();
    if (currentQuestions.length > 0 && answer && answer !== 'Click "Start Recording" to begin speaking your answer...') {
        currentQuestions[currentQuestions.length - 1].answer = answer;
        
        // Add to question history display
        const historyItem = document.createElement('div');
        historyItem.className = 'question-item p-4 border border-gray-200 rounded-lg bg-gray-50';
        historyItem.innerHTML = `
            <div class="mb-2">
                <strong class="text-gray-800">Q${currentQuestions.length}:</strong>
                <span class="text-gray-700">${currentQuestions[currentQuestions.length - 1].question}</span>
            </div>
            <div>
                <strong class="text-gray-800">A:</strong>
                <span class="text-gray-600">${answer}</span>
            </div>
        `;
        questionHistory.appendChild(historyItem);
        questionHistory.scrollTop = questionHistory.scrollHeight;
    }
}

async function endInterview() {
    // Save current answer if exists
    saveCurrentAnswer();
    
    if (currentQuestions.length === 0) {
        showModal('Error', 'No questions were asked during this interview.');
        return;
    }

    showModal('Saving Interview', '', true);
    
    try {
        // Save to Firestore
        const interviewData = {
            jobTitle: currentJobTitle,
            timestamp: new Date(),
            questions: currentQuestions,
            userId: currentUser.uid
        };

        await addDoc(collection(db, 'artifacts', '__app_id', 'users', currentUser.uid, 'interview_sessions'), interviewData);
        
        hideModal();
        showModal('Success', 'Interview saved successfully!');
        
        // Return to setup view
        setTimeout(() => {
            hideModal();
            showView(setupView);
        }, 2000);
        
    } catch (error) {
        hideModal();
        showModal('Error', 'Failed to save interview: ' + error.message);
    }
}

// Interview History
function loadInterviewHistory() {
    if (!currentUser || unsubscribeHistory) return;

    const q = query(
        collection(db, 'artifacts', '__app_id', 'users', currentUser.uid, 'interview_sessions'),
        orderBy('timestamp', 'desc')
    );

    unsubscribeHistory = onSnapshot(q, (querySnapshot) => {
        interviewHistory.innerHTML = '';
        
        if (querySnapshot.empty) {
            interviewHistory.innerHTML = '<p class="text-gray-500 italic">No previous interviews found.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp.toDate();
            const historyItem = document.createElement('div');
            historyItem.className = 'interview-history-item p-4 border border-gray-200 rounded-lg bg-white shadow-sm';
            historyItem.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-semibold text-gray-800">${data.jobTitle}</h3>
                        <p class="text-sm text-gray-600">${date.toLocaleDateString()} at ${date.toLocaleTimeString()}</p>
                        <p class="text-sm text-gray-500">${data.questions.length} questions asked</p>
                    </div>
                    <div class="text-xs text-gray-400">
                        ID: ${doc.id}
                    </div>
                </div>
            `;
            interviewHistory.appendChild(historyItem);
        });
    });
}

// Setup Validation
function validateSetup() {
    const hasResume = resumeText.length > 0;
    const hasJobTitle = jobTitle.value.trim().length > 0;
    startInterviewBtn.disabled = !(hasResume && hasJobTitle);
}

// Event Listeners
modalClose.addEventListener('click', hideModal);
modalOk.addEventListener('click', hideModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
});

// Authentication Events
showRegister.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLogin.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

registerBtn.addEventListener('click', async () => {
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    
    if (!email || !password) {
        showModal('Error', 'Please fill in all fields.');
        return;
    }
    
    if (password.length < 6) {
        showModal('Error', 'Password must be at least 6 characters long.');
        return;
    }
    
    try {
        await registerUser(email, password);
        setTimeout(hideModal, 2000);
    } catch (error) {
        // Error already handled in registerUser function
    }
});

loginBtn.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    
    if (!email || !password) {
        showModal('Error', 'Please fill in all fields.');
        return;
    }
    
    try {
        await loginUser(email, password);
    } catch (error) {
        // Error already handled in loginUser function
    }
});

logoutBtn.addEventListener('click', logoutUser);

// Setup Events
resumeUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
        showModal('Error', 'Please upload a PDF file only.');
        resumeUpload.value = '';
        return;
    }
    
    resumeStatus.textContent = 'Processing PDF...';
    
    try {
        resumeText = await extractTextFromPDF(file);
        resumeStatus.textContent = `✅ Resume processed (${resumeText.length} characters extracted)`;
        validateSetup();
    } catch (error) {
        resumeStatus.textContent = '❌ Failed to process PDF';
        showModal('Error', error.message);
        resumeText = '';
        validateSetup();
    }
});

jobTitle.addEventListener('input', validateSetup);
startInterviewBtn.addEventListener('click', startInterview);

// Interview Events
replayQuestionBtn.addEventListener('click', () => {
    if (currentQuestions.length > 0) {
        speakText(currentQuestions[currentQuestions.length - 1].question);
    }
});

nextQuestionBtn.addEventListener('click', async () => {
    saveCurrentAnswer();
    await loadNextQuestion();
});

endInterviewBtn.addEventListener('click', endInterview);

toggleRecordingBtn.addEventListener('click', () => {
    if (!recognition) {
        if (!initializeSpeechRecognition()) return;
    }
    
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
});

// Authentication State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userIdDisplay.textContent = user.uid;
        showView(setupView);
        loadInterviewHistory();
        
        // Initialize speech recognition
        initializeSpeechRecognition();
    } else {
        currentUser = null;
        showView(authView);
        if (unsubscribeHistory) {
            unsubscribeHistory();
            unsubscribeHistory = null;
        }
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Check if we have all required APIs
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showModal('Browser Support', 'Speech recognition is not supported in this browser. Please use Chrome or Safari for the best experience.');
    }
    
    if (!('speechSynthesis' in window)) {
        showModal('Browser Support', 'Text-to-speech is not supported in this browser.');
    }
});

console.log('AI Interview Platform initialized successfully!');