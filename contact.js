// Contact form: validation, Formspree submission, and inline status messages
const FORMSPREE_URL = 'https://formspree.io/f/xnnvpkgg';
const FALLBACK_EMAIL = 'service@nova-crafters.com';
const MAX_MESSAGE_LENGTH = 1000;

const form = document.getElementById('contactForm');
const submitBtn = form.querySelector('.submit-btn');
const formStatus = document.getElementById('formStatus');
const formSuccess = document.getElementById('formSuccess');
const messageField = document.getElementById('message');
const characterCount = document.getElementById('characterCount');
const fields = form.querySelectorAll('.form-input');

// Our inline field errors replace the browser's validation pop-ups.
// Without JavaScript the form still posts to Formspree, which validates on its side.
form.noValidate = true;

// Remember each field's own aria-describedby (e.g. the character counter)
// so error messages can be added to it and removed again.
fields.forEach(field => {
    field.dataset.describedby = field.getAttribute('aria-describedby') || '';
});

form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Clear previous errors
    clearErrors();
    clearStatus();

    // Validate every field
    let firstInvalid = null;
    fields.forEach(field => {
        const message = getFieldError(field);
        if (message) {
            showError(field, message);
            firstInvalid = firstInvalid || field;
        }
    });

    if (firstInvalid) {
        firstInvalid.focus();
        return;
    }

    submitToFormspree(new FormData(this));
});

// Returns an error message for the field, or '' if it is valid
function getFieldError(field) {
    const value = field.value.trim();

    switch (field.name) {
        case 'fullName':
            if (!value) return 'Full name is required';
            if (value.length < 2) return 'Please enter a valid full name';
            break;

        case 'email':
            if (!value) return 'Email is required';
            if (!isValidEmail(value)) return 'Please enter a valid email address';
            break;

        case 'organization':
            if (!value) return 'Organization is required';
            break;

        case 'message':
            if (!value) return 'Message is required';
            if (value.length < 10) return 'Please provide a more detailed message (minimum 10 characters)';
            break;
    }

    return '';
}

async function submitToFormspree(formData) {
    const originalText = submitBtn.textContent;

    // Loading state
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');
    form.setAttribute('aria-busy', 'true');
    setStatus('Sending your message…');

    try {
        const response = await fetch(FORMSPREE_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            showSuccess();
        } else {
            // Formspree explains rejected submissions in an "errors" array
            const data = await response.json().catch(() => ({}));
            const errors = Array.isArray(data.errors) ? data.errors : [];

            if (handleFormspreeErrors(errors)) {
                showErrorMessage('Your message was not sent: our form service rejected some of the fields. Fix the fields marked above and try again.');
            } else if (errors.length) {
                const details = errors.map(error => error.message).filter(Boolean).join(' ');
                showErrorMessage(`Your message was not sent: our form service rejected it (${details || 'status ' + response.status}). Try again in a few minutes.`);
            } else {
                showErrorMessage(`Your message was not sent: our form service returned an error (status ${response.status}). Try again in a few minutes.`);
            }
        }
    } catch (error) {
        showErrorMessage('Your message was not sent: we could not reach our form service. Check your internet connection and try again.');
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        form.removeAttribute('aria-busy');
    }
}

// Shows Formspree's field errors under the matching fields; returns true if any matched
function handleFormspreeErrors(errors) {
    let matched = false;
    errors.forEach(error => {
        const field = error.field && document.getElementById(error.field);
        if (field) {
            showError(field, error.message);
            matched = true;
        }
    });
    return matched;
}

function setStatus(text) {
    formStatus.classList.remove('is-error');
    formStatus.textContent = text;
}

function clearStatus() {
    setStatus('');
}

function showErrorMessage(reason) {
    const message = document.createElement('p');
    const link = document.createElement('a');
    link.className = 'email';
    link.href = 'mailto:' + FALLBACK_EMAIL;
    link.textContent = FALLBACK_EMAIL;
    message.append(reason + ' You can also email us directly at ', link, '.');

    formStatus.textContent = '';
    formStatus.classList.add('is-error');
    formStatus.append(message);
}

function showSuccess() {
    form.reset();
    updateCharacterCount();
    clearErrors();
    clearStatus();

    // Replace the form with the confirmation block and move focus to it
    form.hidden = true;
    formSuccess.hidden = false;
    formSuccess.focus();
}

// Character counter for message field
function updateCharacterCount() {
    const remaining = MAX_MESSAGE_LENGTH - messageField.value.length;
    characterCount.textContent = `${remaining} ${remaining === 1 ? 'character' : 'characters'} remaining`;
    characterCount.classList.toggle('is-low', remaining < 100);
}

messageField.addEventListener('input', updateCharacterCount);

// Real-time validation: clear an error as soon as the user edits the field,
// and check a filled-in field again when they leave it
fields.forEach(field => {
    field.addEventListener('input', function() {
        if (this.classList.contains('error')) clearError(this);
    });

    field.addEventListener('blur', function() {
        if (!this.value.trim()) return;
        const message = getFieldError(this);
        if (message) showError(this, message);
    });
});

// Checkbox: clear any Formspree error once it changes
const certification = document.getElementById('certification');
certification.addEventListener('change', function() {
    clearError(this);
});

function showError(field, message) {
    const errorElement = document.getElementById(field.id + 'Error');
    if (!errorElement) return;

    field.classList.add('error');
    field.setAttribute('aria-invalid', 'true');

    errorElement.textContent = message;
    errorElement.hidden = false;

    const describedBy = (field.dataset.describedby || '').split(' ').filter(Boolean);
    field.setAttribute('aria-describedby', describedBy.concat(errorElement.id).join(' '));
}

function clearError(field) {
    const errorElement = document.getElementById(field.id + 'Error');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.hidden = true;
    }

    field.classList.remove('error');
    field.removeAttribute('aria-invalid');

    if (field.dataset.describedby) {
        field.setAttribute('aria-describedby', field.dataset.describedby);
    } else {
        field.removeAttribute('aria-describedby');
    }
}

function clearErrors() {
    fields.forEach(clearError);
    clearError(certification);
}

function isValidEmail(email) {
    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
}

// Initialize character count on page load
updateCharacterCount();
