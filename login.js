// ================================
// USER DATABASE (In-Memory Storage)
// ================================
class UserDatabase {
    constructor() {
        this.users = new Map();
        this.sessions = new Map();
        this.initializeTestUsers();
    }

    initializeTestUsers() {
        this.users.set('admin@novacrafters.com', {
            id: '1',
            email: 'admin@novacrafters.com',
            password: this.hashPassword('admin123'),
            name: 'Admin User',
            createdAt: new Date(),
            verified: true
        });

        this.users.set('user@example.com', {
            id: '2',
            email: 'user@example.com',
            password: this.hashPassword('password123'),
            name: 'Test User',
            createdAt: new Date(),
            verified: true
        });
    }

    hashPassword(password) {
        return btoa(password + 'salt_key_novacrafters');
    }

    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }

    createUser(email, password, name) {
        if (this.users.has(email)) throw new Error('User already exists');

        const user = {
            id: Date.now().toString(),
            email,
            password: this.hashPassword(password),
            name,
            createdAt: new Date(),
            verified: false
        };

        this.users.set(email, user);
        return { ...user, password: undefined };
    }

    getUserByEmail(email) {
        return this.users.get(email);
    }

    createSession(userId) {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            userId,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };

        this.sessions.set(sessionId, session);
        return session;
    }

    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.expiresAt < new Date()) {
            this.sessions.delete(sessionId);
            return null;
        }
        return session;
    }

    deleteSession(sessionId) {
        this.sessions.delete(sessionId);
    }

    generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}

// ================================
// AUTHENTICATION SERVICE
// ================================
class AuthService {
    constructor() {
        this.db = new UserDatabase();
        this.initializeEventListeners();
        this.initGoogleSignIn();
        this.updateNavBar(); // Update nav bar on load
    }

    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupLoginForm();
            this.checkExistingSession();
            this.updateNavBar(); // Update nav bar on DOM load
        });
    }

    setupLoginForm() {
        const form = document.querySelector('form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(e);
        });
    }

    async handleLogin(event) {
        const form = event.target;
        const email = form.querySelector('input[type="email"]').value.trim();
        const password = form.querySelector('input[type="password"]').value;

        this.clearErrorMessages();

        try {
            if (!this.validateEmail(email)) throw new Error('Please enter a valid email address');
            if (!password) throw new Error('Please enter your password');

            this.setLoadingState(true);
            await this.delay(1000);

            const user = this.db.getUserByEmail(email);
            if (!user || !this.db.verifyPassword(password, user.password)) {
                throw new Error('Invalid email or password');
            }

            const session = this.db.createSession(user.id);
            this.setSession(session.id);
            localStorage.setItem('username', user.name || 'User');
            this.updateNavBar();
            this.showSuccessMessage('Login successful! Redirecting...');

            setTimeout(() => {
                this.redirectToDashboard();
            }, 1500);

        } catch (error) {
            this.showErrorMessage(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    checkExistingSession() {
        const sessionId = this.getSession();
        if (sessionId) {
            const session = this.db.getSession(sessionId);
            if (session) {
                this.showInfoMessage('You are already logged in. Redirecting...');
                setTimeout(() => {
                    this.redirectToIndexPage();
                }, 1500);
            }
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setSession(sessionId) {
        localStorage.setItem('session_id', sessionId);
        localStorage.setItem('login_time', new Date().toISOString());
    }

    getSession() {
        return localStorage.getItem('session_id');
    }

    clearSession() {
        localStorage.removeItem('session_id');
        localStorage.removeItem('login_time');
        localStorage.removeItem('username');
        this.updateNavBar();
    }

    redirectToIndexPage() {
        window.location.href = 'index.html';
    }

    redirectToDashboard() {
        window.location.href = 'index.html?logged_in=true';
    }

    setLoadingState(isLoading) {
        const loginBtn = document.querySelector('.login-btn');
        const googleBtn = document.querySelector('.google-btn');

        if (loginBtn) {
            loginBtn.disabled = isLoading;
            loginBtn.textContent = isLoading ? 'Logging in...' : 'Login';
        }
        if (googleBtn) googleBtn.disabled = isLoading;
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showInfoMessage(message) {
        this.showMessage(message, 'info');
    }

    showMessage(message, type) {
        this.clearErrorMessages();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = message;

        Object.assign(messageDiv.style, {
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'center',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        switch (type) {
            case 'error':
                Object.assign(messageDiv.style, {
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#dc2626',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                });
                break;
            case 'success':
                Object.assign(messageDiv.style, {
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: '#16a34a',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                });
                break;
            case 'info':
                Object.assign(messageDiv.style, {
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#2563eb',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                });
                break;
        }

        const form = document.querySelector('form');
        form.parentNode.insertBefore(messageDiv, form);

        setTimeout(() => {
            messageDiv.style.opacity = '1';
        }, 10);

        if (type !== 'error') {
            setTimeout(() => {
                this.fadeOutMessage(messageDiv);
            }, 5000);
        }
    }

    fadeOutMessage(messageDiv) {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }

    clearErrorMessages() {
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => {
            this.fadeOutMessage(msg);
        });
    }

    // ================================
    // GOOGLE SIGN-IN SETUP
    // ================================
    initGoogleSignIn() {
        google.accounts.id.renderButton(
            document.querySelector('.google-btn'),
            {
              theme: "outline",
              size: "large",
              width: "100%"
            }
          );          

        // Render the Google Sign-In button inside the existing .google-btn container
        google.accounts.id.renderButton(
            document.querySelector('.google-btn'),
            { theme: "outline", size: "large" }
        );

        // Optionally enable One Tap prompt
        // google.accounts.id.prompt();
    }

    handleCredentialResponse(response) {
        // JWT ID token from Google
        const jwt = response.credential;

        // Decode JWT token payload (user info)
        const base64Url = jwt.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        const payload = JSON.parse(jsonPayload);

        // Here you could create or validate user in your db
        // For this example, we just create a session with Google user id
        let user = this.db.getUserByEmail(payload.email);
        let isNewUser = false;
        if (!user) {
            isNewUser = true;
            user = {
                id: payload.sub,
                email: payload.email,
                password: null,
                name: payload.name,
                createdAt: new Date(),
                verified: true
            };
            this.db.users.set(payload.email, user);
        }

        const session = this.db.createSession(user.id);
        this.setSession(session.id);
        // Prompt for username if new Google user
        if (isNewUser) {
            this.promptForUsername(user.name || '');
        } else {
            localStorage.setItem('username', user.name || 'User');
            this.updateNavBar();
            this.showSuccessMessage('Google login successful! Redirecting...');
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1500);
        }
    }

    promptForUsername(defaultName) {
        let username = '';
        while (!username || username.length < 2) {
            username = prompt('Welcome! Please choose a username to display:', defaultName || '');
            if (username === null) return; // Cancelled
            username = username.trim();
        }
        localStorage.setItem('username', username);
        this.saveUsernameToUser(username);
        this.updateNavBar();
        this.showSuccessMessage('Username set! Redirecting...');
        setTimeout(() => {
            this.redirectToDashboard();
        }, 1200);
    }

    saveUsernameToUser(username) {
        // Save username to user in DB (for Google users)
        const sessionId = this.getSession();
        if (!sessionId) return;
        const session = this.db.getSession(sessionId);
        if (!session) return;
        for (let [email, user] of this.db.users.entries()) {
            if (user.id === session.userId) {
                user.name = username;
                this.db.users.set(email, user);
                break;
            }
        }
    }

    updateNavBar() {
        const userNav = document.getElementById('user-nav');
        const loginLink = document.getElementById('login-link');
        const usernameDisplay = document.getElementById('username-display');
        const sessionId = this.getSession();
        const username = localStorage.getItem('username');
        if (sessionId && username) {
            if (userNav) userNav.style.display = 'flex';
            if (loginLink) loginLink.style.display = 'none';
            if (usernameDisplay) usernameDisplay.textContent = username;
        } else {
            if (userNav) userNav.style.display = 'none';
            if (loginLink) loginLink.style.display = '';
            if (usernameDisplay) usernameDisplay.textContent = '';
        }
    }
}

// ================================
// MODAL & UI LOGIC
// ================================
function setupModalsAndToggles(authService) {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(() => {
    // Modal elements
    const signupModal = document.getElementById('signup-modal');
    const forgotModal = document.getElementById('forgot-modal');
    const openSignup = document.getElementById('open-signup');
    const openForgot = document.getElementById('open-forgot');
    const closeSignup = document.getElementById('close-signup');
    const closeForgot = document.getElementById('close-forgot');
    // Show/hide password
    const loginPassword = document.getElementById('login-password');
    const togglePassword = document.getElementById('toggle-password');
    const eyeIcon = document.getElementById('eye-icon');
    const signupPassword = document.getElementById('signup-password');
    const toggleSignupPassword = document.getElementById('toggle-signup-password');
    const eyeSignup = document.getElementById('eye-signup');

    // Open/close modals
    if (openSignup && signupModal) {
      openSignup.onclick = (e) => {
        e.preventDefault();
        signupModal.style.display = 'flex';
        console.log('[Signup Modal] Opened');
      };
    } else {
      console.warn('[Signup Modal] openSignup or signupModal missing');
    }
    if (closeSignup && signupModal) {
      closeSignup.onclick = () => {
        signupModal.style.display = 'none';
        document.getElementById('signup-message').textContent = '';
        console.log('[Signup Modal] Closed');
      };
    } else {
      console.warn('[Signup Modal] closeSignup or signupModal missing');
    }
    if (openForgot && forgotModal) {
      openForgot.onclick = (e) => { e.preventDefault(); forgotModal.style.display = 'flex'; };
    }
    if (closeForgot && forgotModal) {
      closeForgot.onclick = () => { forgotModal.style.display = 'none'; document.getElementById('forgot-message').textContent = ''; };
    }
    window.onclick = function(event) {
      if (event.target === signupModal) { signupModal.style.display = 'none'; document.getElementById('signup-message').textContent = ''; }
      if (event.target === forgotModal) { forgotModal.style.display = 'none'; document.getElementById('forgot-message').textContent = ''; }
    };

    // Show/hide password (login)
    if (togglePassword && loginPassword && eyeIcon) {
      togglePassword.onclick = () => {
        if (loginPassword.type === 'password') {
          loginPassword.type = 'text';
          eyeIcon.innerHTML = '<circle cx="12" cy="12" r="10" stroke="#667eea" stroke-width="2" fill="none"/><line x1="4" y1="4" x2="20" y2="20" stroke="#667eea" stroke-width="2"/>';
        } else {
          loginPassword.type = 'password';
          eyeIcon.innerHTML = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
        }
      };
    }
    // Show/hide password (signup)
    if (toggleSignupPassword && signupPassword && eyeSignup) {
      toggleSignupPassword.onclick = () => {
        if (signupPassword.type === 'password') {
          signupPassword.type = 'text';
          eyeSignup.innerHTML = '<circle cx="12" cy="12" r="10" stroke="#667eea" stroke-width="2" fill="none"/><line x1="4" y1="4" x2="20" y2="20" stroke="#667eea" stroke-width="2"/>';
        } else {
          signupPassword.type = 'password';
          eyeSignup.innerHTML = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
        }
      };
    }
    // Show/hide password (signup confirm)
    const signupConfirmPassword = document.getElementById('signup-confirm-password');
    const toggleSignupConfirmPassword = document.getElementById('toggle-signup-confirm-password');
    const eyeSignupConfirm = document.getElementById('eye-signup-confirm');
    if (toggleSignupConfirmPassword && signupConfirmPassword && eyeSignupConfirm) {
      toggleSignupConfirmPassword.onclick = () => {
        if (signupConfirmPassword.type === 'password') {
          signupConfirmPassword.type = 'text';
          eyeSignupConfirm.innerHTML = '<circle cx="12" cy="12" r="10" stroke="#667eea" stroke-width="2" fill="none"/><line x1="4" y1="4" x2="20" y2="20" stroke="#667eea" stroke-width="2"/>';
        } else {
          signupConfirmPassword.type = 'password';
          eyeSignupConfirm.innerHTML = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
        }
      };
    }

    // Sign up logic
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.onsubmit = function(e) {
        e.preventDefault();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const rememberMe = document.getElementById('signup-remember-me').checked;
        const msg = document.getElementById('signup-message');
        msg.style.color = '#dc2626';
        if (!email || !password || !confirmPassword) {
          msg.textContent = 'All fields are required.';
          console.log('[Signup] Missing fields');
          return;
        }
        if (!authService.validateEmail(email)) {
          msg.textContent = 'Please enter a valid email address.';
          console.log('[Signup] Invalid email');
          return;
        }
        if (password.length < 6) {
          msg.textContent = 'Password must be at least 6 characters.';
          console.log('[Signup] Password too short');
          return;
        }
        if (password !== confirmPassword) {
          msg.textContent = 'Passwords do not match.';
          console.log('[Signup] Passwords do not match');
          return;
        }
        try {
          authService.db.createUser(email, password, email.split('@')[0]);
          msg.style.color = '#16a34a';
          msg.textContent = 'Account created! You can now log in.';
          console.log('[Signup] Success:', email);
          // If remember me, set cookie for session persistence
          if (rememberMe) {
            document.cookie = `remember_email=${encodeURIComponent(email)}; path=/; max-age=2592000`;
          }
          setTimeout(() => {
            document.getElementById('signup-modal').style.display = 'none';
            msg.textContent = '';
          }, 1200);
        } catch (err) {
          msg.textContent = err.message || 'Account creation failed.';
          console.error('[Signup] Error:', err);
        }
      };
    } else {
      console.warn('[Signup] signupForm missing');
    }

    // Forgot password logic (simulated)
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
      forgotForm.onsubmit = function(e) {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value.trim();
        const msg = document.getElementById('forgot-message');
        msg.style.color = '#dc2626';
        if (!email) {
          msg.textContent = 'Please enter your email.';
          return;
        }
        if (!authService.validateEmail(email)) {
          msg.textContent = 'Please enter a valid email address.';
          return;
        }
        const user = authService.db.getUserByEmail(email);
        if (!user) {
          msg.textContent = 'No account found with that email.';
          return;
        }
        msg.style.color = '#16a34a';
        msg.textContent = 'A password reset link would be sent to your email (simulated).';
        setTimeout(() => {
          document.getElementById('forgot-modal').style.display = 'none';
          msg.textContent = '';
        }, 1800);
      };
    }
  });
}
// ================================
// END MODAL & UI LOGIC
// ================================

// ================================
// INITIALIZE APPLICATION
// ================================
const authService = new AuthService();
setupModalsAndToggles(authService);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, UserDatabase };
}

// Dev Helpers
console.log('NovaCrafters Login System Initialized');
console.log('Test Accounts:');
console.log('Email: admin@novacrafters.com, Password: admin123');
console.log('Email: user@example.com, Password: password123');

window.logout = function () {
    authService.clearSession();
    window.location.reload();
};

console.log('Type logout() in console to clear session');
