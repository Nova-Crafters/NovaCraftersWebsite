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
        // Add some test users for development
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

    // Simple password hashing (use bcrypt in production)
    hashPassword(password) {
        return btoa(password + 'salt_key_novacrafters');
    }

    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }

    createUser(email, password, name) {
        if (this.users.has(email)) {
            throw new Error('User already exists');
        }

        const user = {
            id: Date.now().toString(),
            email,
            password: this.hashPassword(password),
            name,
            createdAt: new Date(),
            verified: false
        };

        this.users.set(email, user);
        return { ...user, password: undefined }; // Don't return password
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
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
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
    }

    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupLoginForm();
            this.setupGoogleLogin();
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

    setupGoogleLogin() {
        const googleBtn = document.querySelector('.google-btn');
        if (!googleBtn) return;

        googleBtn.addEventListener('click', () => {
            this.handleGoogleLogin();
        });
    }

    async handleLogin(event) {
        const form = event.target;
        const email = form.querySelector('input[type="email"]').value.trim();
        const password = form.querySelector('input[type="password"]').value;

        // Clear previous error messages
        this.clearErrorMessages();

        try {
            // Validate inputs
            if (!this.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (!password) {
                throw new Error('Please enter your password');
            }

            // Show loading state
            this.setLoadingState(true);

            // Simulate API delay
            await this.delay(1000);

            // Authenticate user
            const user = this.db.getUserByEmail(email);
            if (!user || !this.db.verifyPassword(password, user.password)) {
                throw new Error('Invalid email or password');
            }

            // Create session
            const session = this.db.createSession(user.id);
            this.setSession(session.id);

            // Success notification
            this.showSuccessMessage('Login successful! Redirecting...');

            // Redirect after delay
            setTimeout(() => {
                this.redirectTodashboard();
            }, 1500);

        } catch (error) {
            this.showErrorMessage(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    handleGoogleLogin() {
        // Simulate Google OAuth flow
        this.showInfoMessage('Redirecting to Google...');
        
        setTimeout(() => {
            // Simulate successful Google login
            const googleUser = {
                id: 'google_' + Date.now(),
                email: 'google.user@gmail.com',
                name: 'Google User',
                provider: 'google'
            };

            const session = this.db.createSession(googleUser.id);
            this.setSession(session.id);

            this.showSuccessMessage('Google login successful! Redirecting...');
            
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1500);
        }, 2000);
    }

    checkExistingSession() {
        const sessionId = this.getSession();
        if (sessionId) {
            const session = this.db.getSession(sessionId);
            if (session) {
                // User is already logged in
                this.showInfoMessage('You are already logged in. Redirecting...');
                setTimeout(() => {
                    this.redirectToIndexPage();
                }, 1500);
            }
        }
    }

    // ================================
    // UTILITY METHODS
    // ================================
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setSession(sessionId) {
        // In a real app, use secure httpOnly cookies
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

    redirectToAboutPage() {
        window.location.href = 'about.html';
    }

    redirectToDashboard() {
        // Create a simple dashboard URL or redirect to index
        window.location.href = 'index.html?logged_in=true';
    }

    // ================================
    // UI FEEDBACK METHODS
    // ================================
    setLoadingState(isLoading) {
        const loginBtn = document.querySelector('.login-btn');
        const googleBtn = document.querySelector('.google-btn');
        
        if (isLoading) {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
            googleBtn.disabled = true;
        } else {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
            googleBtn.disabled = false;
        }
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
        // Remove existing messages
        this.clearErrorMessages();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = message;

        // Add styles
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

        // Set colors based on type
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

        // Insert before form
        const form = document.querySelector('form');
        form.parentNode.insertBefore(messageDiv, form);

        // Fade in
        setTimeout(() => {
            messageDiv.style.opacity = '1';
        }, 10);

        // Auto remove after 5 seconds for non-error messages
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
}

// ================================
// ADDITIONAL FEATURES
// ================================
class LoginFeatures {
    constructor() {
        this.initializePasswordToggle();
        this.initializeFormValidation();
        this.initializeForgotPassword();
    }

    initializePasswordToggle() {
        document.addEventListener('DOMContentLoaded', () => {
            const passwordField = document.querySelector('input[type="password"]');
            if (!passwordField) return;

            // Create toggle button
            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.innerHTML = '👁️';
            toggleBtn.style.cssText = `
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                cursor: pointer;
                font-size: 16px;
                opacity: 0.7;
                transition: opacity 0.3s;
            `;

            // Make parent relative
            passwordField.parentElement.style.position = 'relative';
            passwordField.style.paddingRight = '40px';
            
            passwordField.parentElement.appendChild(toggleBtn);

            toggleBtn.addEventListener('click', () => {
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    toggleBtn.innerHTML = '🙈';
                } else {
                    passwordField.type = 'password';
                    toggleBtn.innerHTML = '👁️';
                }
            });

            toggleBtn.addEventListener('mouseenter', () => {
                toggleBtn.style.opacity = '1';
            });

            toggleBtn.addEventListener('mouseleave', () => {
                toggleBtn.style.opacity = '0.7';
            });
        });
    }

    initializeFormValidation() {
        document.addEventListener('DOMContentLoaded', () => {
            const inputs = document.querySelectorAll('.input-field');
            
            inputs.forEach(input => {
                input.addEventListener('blur', (e) => {
                    this.validateField(e.target);
                });

                input.addEventListener('input', (e) => {
                    // Clear validation styling on input
                    e.target.style.borderColor = '';
                });
            });
        });
    }

    validateField(field) {
        let isValid = true;
        let message = '';

        if (field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                isValid = false;
                message = 'Please enter a valid email address';
            }
        }

        if (field.type === 'password') {
            if (field.value.length < 6) {
                isValid = false;
                message = 'Password must be at least 6 characters';
            }
        }

        if (!isValid) {
            field.style.borderColor = '#ef4444';
            this.showFieldError(field, message);
        } else {
            field.style.borderColor = '#22c55e';
            this.clearFieldError(field);
        }

        return isValid;
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            color: #ef4444;
            font-size: 12px;
            margin-top: 4px;
            opacity: 0;
            transition: opacity 0.3s;
        `;

        field.parentElement.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.opacity = '1';
        }, 10);
    }

    clearFieldError(field) {
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    initializeForgotPassword() {
        document.addEventListener('DOMContentLoaded', () => {
            const resetLink = document.querySelector('a[href="#reset"]');
            if (!resetLink) return;

            resetLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPasswordResetModal();
            });
        });
    }

    showPasswordResetModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            text-align: center;
        `;

        modalContent.innerHTML = `
            <h3 style="margin-bottom: 20px; color: #333;">Reset Password</h3>
            <p style="margin-bottom: 20px; color: #666;">Enter your email address and we'll send you a link to reset your password.</p>
            <input type="email" placeholder="Enter your email" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 20px;">
            <div>
                <button id="sendResetBtn" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; margin-right: 10px; cursor: pointer;">Send Reset Link</button>
                <button id="cancelResetBtn" style="padding: 10px 20px; background: #ccc; color: #333; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Handle buttons
        modal.querySelector('#cancelResetBtn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('#sendResetBtn').addEventListener('click', () => {
            const email = modal.querySelector('input[type="email"]').value;
            if (email) {
                alert(`Password reset link sent to ${email}`);
                document.body.removeChild(modal);
            } else {
                alert('Please enter your email address');
            }
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
}

// ================================
// INITIALIZE APPLICATION
// ================================
// Initialize the authentication system
const authService = new AuthService();
const loginFeatures = new LoginFeatures();

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, UserDatabase, LoginFeatures };
}

// ================================
// DEVELOPMENT HELPERS
// ================================
console.log('NovaCrafters Login System Initialized');
console.log('Test Accounts:');
console.log('Email: admin@novacrafters.com, Password: admin123');
console.log('Email: user@example.com, Password: password123');

// Add global logout function for testing
window.logout = function() {
    authService.clearSession();
    window.location.reload();
};

console.log('Type logout() in console to clear session');