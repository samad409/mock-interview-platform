// Global state
let currentUser = {
    name: '',
    email: '',
    resume: null
};

let interviewState = {
    currentQuestion: 1,
    totalQuestions: 8,
    timeRemaining: 30 * 60, // 30 minutes in seconds
    questions: [
        "Hello! I'm excited to conduct this mock interview with you for the Software Engineer position. I've reviewed your resume and I'm impressed with your background. Let's start with a simple question: Can you tell me about yourself and why you're interested in this role?",
        "I see you have experience with JavaScript. Can you walk me through a challenging project you worked on and how you overcame any technical obstacles?",
        "How do you stay updated with the latest technologies and programming trends?",
        "Describe a time when you had to work with a difficult team member. How did you handle the situation?",
        "What's your approach to debugging complex issues in your code?",
        "How do you prioritize tasks when working on multiple projects simultaneously?",
        "Can you explain a technical concept to someone without a technical background?",
        "Do you have any questions about our company or the role we're discussing?"
    ]
};

// Page navigation
function showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        
        // Add fade-in animation
        const content = targetPage.querySelector('.fade-in');
        if (content) {
            content.style.animation = 'none';
            setTimeout(() => {
                content.style.animation = 'fadeIn 0.5s ease-in';
            }, 10);
        }
    }
}

// Password visibility toggle
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('svg');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l4.242 4.242M12 12l3.878 3.878"></path>
        `;
    } else {
        input.type = 'password';
        icon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        `;
    }
}

// Form handling
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    
    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<div class="loading-spinner"></div>Signing in...';
    
    // Simulate login process
    setTimeout(() => {
        currentUser.email = email;
        currentUser.name = email.split('@')[0]; // Simple name extraction
        
        // Reset button
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Sign in';
        
        // Navigate to interview page
        updateInterviewPage();
        showPage('interviewPage');
        startTimer();
    }, 1500);
}

function handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const resume = formData.get('resume');
    const registerBtn = document.getElementById('registerBtn');
    
    // Show loading state
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<div class="loading-spinner"></div>Creating account...';
    
    // Simulate registration process
    setTimeout(() => {
        currentUser.name = name;
        currentUser.email = email;
        currentUser.resume = resume;
        
        // Reset button
        registerBtn.disabled = false;
        registerBtn.innerHTML = 'Create account';
        
        // Navigate to interview page
        updateInterviewPage();
        showPage('interviewPage');
        startTimer();
    }, 1500);
}

// File upload handling
function handleFileUpload() {
    const fileInput = document.getElementById('resume');
    const fileName = document.getElementById('fileName');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            fileName.textContent = `✓ ${file.name}`;
            fileName.classList.remove('hidden');
            currentUser.resume = file;
        }
    });
}

// Interview functionality
function updateInterviewPage() {
    // Update welcome message
    const welcomeUser = document.getElementById('welcomeUser');
    welcomeUser.textContent = `Welcome, ${currentUser.name}`;
    
    // Update resume name
    const resumeName = document.getElementById('resumeName');
    if (currentUser.resume) {
        resumeName.textContent = currentUser.resume.name;
    }
    
    // Reset interview state
    interviewState.currentQuestion = 1;
    updateQuestionDisplay();
    updateProgress();
}

function updateQuestionDisplay() {
    const questionElement = document.getElementById('currentQuestion');
    const counterElement = document.getElementById('questionCounter');
    
    questionElement.textContent = `"${interviewState.questions[interviewState.currentQuestion - 1]}"`;
    counterElement.textContent = `Question ${interviewState.currentQuestion} of ${interviewState.totalQuestions}`;
}

function updateProgress() {
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');
    
    const answered = interviewState.currentQuestion - 1;
    const percentage = (answered / interviewState.totalQuestions) * 100;
    
    progressText.textContent = `${answered}/${interviewState.totalQuestions}`;
    progressBar.style.width = `${percentage}%`;
}

function submitAnswer() {
    const answerInput = document.getElementById('answerInput');
    const answer = answerInput.value.trim();
    
    if (!answer) {
        alert('Please provide an answer before submitting.');
        return;
    }
    
    // Clear the input
    answerInput.value = '';
    
    // Move to next question
    nextQuestion();
}

function skipQuestion() {
    nextQuestion();
}

function nextQuestion() {
    if (interviewState.currentQuestion < interviewState.totalQuestions) {
        interviewState.currentQuestion++;
        updateQuestionDisplay();
        updateProgress();
        
        // Add a small delay for better UX
        setTimeout(() => {
            const questionArea = document.getElementById('currentQuestion').parentElement.parentElement;
            questionArea.style.animation = 'slideIn 0.3s ease-out';
        }, 100);
    } else {
        // Interview completed
        alert('Congratulations! You have completed the mock interview. In the full version, you would receive detailed feedback and analysis.');
    }
}

function startTimer() {
    const timerElement = document.getElementById('timeRemaining');
    
    const timer = setInterval(() => {
        interviewState.timeRemaining--;
        
        const minutes = Math.floor(interviewState.timeRemaining / 60);
        const seconds = interviewState.timeRemaining % 60;
        
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (interviewState.timeRemaining <= 0) {
            clearInterval(timer);
            alert('Time is up! The interview session has ended.');
        }
    }, 1000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Form event listeners
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // File upload handling
    handleFileUpload();
    
    // Show home page by default
    showPage('homePage');
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Enter key to submit answer when in interview page
    if (e.key === 'Enter' && e.ctrlKey && !document.getElementById('interviewPage').classList.contains('hidden')) {
        submitAnswer();
    }
});

// Responsive navigation for mobile
function toggleMobileMenu() {
    // This would be implemented for mobile navigation if needed
    console.log('Mobile menu toggle');
}