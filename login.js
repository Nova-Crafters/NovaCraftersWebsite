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
    }

    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupLoginForm();
            this.checkExistingSession();
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
        google.accounts.id.initialize({
            client_id: "YOUR_CLIENT_ID.apps.googleusercontent.com",
            callback: this.handleCredentialResponse.bind(this)
        });

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
        if (!user) {
            // Create a new user record with verified = true (since from Google)
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
        this.showSuccessMessage('Google login successful! Redirecting...');

        setTimeout(() => {
            this.redirectToDashboard();
        }, 1500);
    }
}

// ================================
// INITIALIZE APPLICATION
// ================================
const authService = new AuthService();

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
