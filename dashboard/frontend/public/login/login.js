document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');

    showRegister.addEventListener('click', function(e) {
        e.preventDefault();
        loginCard.style.display = 'none';
        registerCard.style.display = 'block';
    });

    showLogin.addEventListener('click', function(e) {
        e.preventDefault();
        registerCard.style.display = 'none';
        loginCard.style.display = 'block';
    });

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = '';
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                sessionStorage.setItem('role', data.role);
                window.location.href = '/dashboard/';
            } else {
                errorMessage.textContent = data.error || 'Credenziali non valide';
            }
        } catch (error) {
            errorMessage.textContent = 'Errore di connessione';
        }
    });

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const errorMessage = document.getElementById('regErrorMessage');
        
        errorMessage.textContent = '';
        errorMessage.className = 'error-message';
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                errorMessage.textContent = 'Registrazione completata! Ora puoi accedere.';
                errorMessage.classList.add('success');
                setTimeout(() => {
                    registerCard.style.display = 'none';
                    loginCard.style.display = 'block';
                    document.getElementById('username').value = username;
                    errorMessage.textContent = '';
                    errorMessage.className = 'error-message';
                }, 2000);
            } else {
                errorMessage.textContent = data.error || 'Errore durante la registrazione';
            }
        } catch (error) {
            errorMessage.textContent = 'Errore di connessione';
        }
    });
});