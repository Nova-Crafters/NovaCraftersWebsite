// Form validation and submission with actual Formspree integration
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Clear previous errors
    clearErrors();
    
    // Get form data
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    // Validate form
    let isValid = true;
    
    // Full name validation
    if (!data.fullName || !data.fullName.trim()) {
        showError('fullNameError', 'Full name is required');
        isValid = false;
    } else if (data.fullName.trim().length < 2) {
        showError('fullNameError', 'Please enter a valid full name');
        isValid = false;
    }
    
    // Email validation
    if (!data.email || !data.email.trim()) {
        showError('emailError', 'Email is required');
        isValid = false;
    } else if (!isValidEmail(data.email)) {
        showError('emailError', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Organization validation
    if (!data.organization || !data.organization.trim()) {
        showError('organizationError', 'Organization is required');
        isValid = false;
    }
    
    // Message validation
    if (!data.message || !data.message.trim()) {
        showError('messageError', 'Message is required');
        isValid = false;
    } else if (data.message.trim().length < 10) {
        showError('messageError', 'Please provide a more detailed message (minimum 10 characters)');
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Submit to Formspree
    submitToFormspree(formData);
});

async function submitToFormspree(formData) {
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    // Show loading state
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('https://formspree.io/f/xnnvpkgg', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            // Success
            showSuccessMessage();
            document.getElementById('contactForm').reset();
            updateCharacterCount();
        } else {
            // Handle Formspree validation errors
            const data = await response.json();
            if (data.errors) {
                handleFormspreeErrors(data.errors);
            } else {
                throw new Error('Form submission failed');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Sorry, there was an error sending your message. Please try again or contact us directly at help.novacrafters@gmail.com');
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function handleFormspreeErrors(errors) {
    errors.forEach(error => {
        if (error.field) {
            const errorElementId = error.field + 'Error';
            const errorElement = document.getElementById(errorElementId);
            if (errorElement) {
                showError(errorElementId, error.message);
            }
        }
    });
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff6b6b, #ee5a52);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(255, 107, 107, 0.3);
        z-index: 10000;
        font-weight: 600;
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Remove error message after 6 seconds
    setTimeout(() => {
        errorDiv.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 300);
    }, 6000);
}

// Character counter for message field
const messageField = document.getElementById('message');
const characterCount = document.getElementById('characterCount');

messageField.addEventListener('input', updateCharacterCount);

function updateCharacterCount() {
    const remaining = 1000 - messageField.value.length;
    characterCount.textContent = `${remaining} characters remaining`;
    
    if (remaining < 100) {
        characterCount.style.color = '#ff6b6b';
    } else if (remaining < 200) {
        characterCount.style.color = '#ffd43b';
    } else {
        characterCount.style.color = 'rgba(255, 255, 255, 0.7)';
    }
}

// Real-time validation for form inputs
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('blur', function() {
        validateField(this);
    });
    
    input.addEventListener('input', function() {
        // Clear error state when user starts typing
        if (this.classList.contains('error')) {
            this.classList.remove('error');
            const errorElement = this.parentNode.querySelector('.error-message');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
        
        // Real-time validation for non-empty fields
        if (this.value.trim()) {
            validateField(this);
        }
    });
});

// Checkbox validation
document.getElementById('certification').addEventListener('change', function() {
    const errorElement = document.getElementById('certificationError');
    if (this.checked) {
        errorElement.style.display = 'none';
    }
});

function validateField(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    
    // Clear previous state
    field.classList.remove('error', 'success');
    
    switch (fieldName) {
        case 'fullName':
            if (value && value.length >= 2) {
                field.classList.add('success');
            } else if (value) {
                field.classList.add('error');
            }
            break;
            
        case 'email':
            if (value && isValidEmail(value)) {
                field.classList.add('success');
            } else if (value) {
                field.classList.add('error');
            }
            break;
            
        case 'organization':
            if (value) {
                field.classList.add('success');
            }
            break;
            
        case 'message':
            if (value && value.length >= 10) {
                field.classList.add('success');
            } else if (value) {
                field.classList.add('error');
            }
            break;
    }
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    const inputElement = errorElement.previousElementSibling;
    
    // Add error class to input field
    if (inputElement && (inputElement.classList.contains('form-input') || inputElement.classList.contains('checkbox-input'))) {
        inputElement.classList.add('error');
        inputElement.classList.remove('success');
    }
    
    // Show error message
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Add accessibility attributes
    if (inputElement) {
        inputElement.setAttribute('aria-invalid', 'true');
        inputElement.setAttribute('aria-describedby', elementId);
    }
}

function clearErrors() {
    // Hide all error messages
    document.querySelectorAll('.error-message').forEach(error => {
        error.style.display = 'none';
        error.textContent = '';
    });
    
    // Remove error classes from inputs
    document.querySelectorAll('.form-input, .checkbox-input').forEach(input => {
        input.classList.remove('error');
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
    });
}

function isValidEmail(email) {
    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
}

function showSuccessMessage() {
    // Create and show a success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #51cf66, #40c057);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(81, 207, 102, 0.3);
        z-index: 10000;
        font-weight: 600;
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add CSS animation if not already present
    if (!document.getElementById('successAnimation')) {
        const style = document.createElement('style');
        style.id = 'successAnimation';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    successDiv.textContent = '✓ Thank you! Your message has been sent successfully.';
    document.body.appendChild(successDiv);
    
    // Remove success message after 4 seconds
    setTimeout(() => {
        successDiv.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 300);
    }, 4000);
}

// Initialize character count on page load
document.addEventListener('DOMContentLoaded', function() {
    updateCharacterCount();
});