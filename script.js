const loginForm = document.querySelector('#login-form');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const passwordToggle = document.querySelector('.password-toggle');
const formMessage = document.querySelector('#form-message');

passwordToggle.addEventListener('click', () => {
  const isVisible = passwordInput.type === 'text';
  passwordInput.type = isVisible ? 'password' : 'text';
  passwordToggle.classList.toggle('is-visible', !isVisible);
  passwordToggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
  passwordToggle.setAttribute('aria-pressed', String(!isVisible));
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  formMessage.classList.remove('is-success');

  if (!emailInput.validity.valid) {
    formMessage.textContent = 'Please enter a valid email address.';
    emailInput.focus();
    return;
  }

  if (!passwordInput.validity.valid) {
    formMessage.textContent = 'Your password must be at least 6 characters.';
    passwordInput.focus();
    return;
  }

  sessionStorage.setItem('quranAdminAuthenticated', 'true');
  window.location.assign('admin.html');
});

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener('input', () => {
    formMessage.textContent = '';
    formMessage.classList.remove('is-success');
  });
});
