document.getElementById('logoutBtn').addEventListener('click', async function() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    window.location.href = '/login.html';
});

fetch('/api/check-auth')
    .then(res => res.json())
    .then(data => {
        if (!data.authenticated) {
            window.location.href = '/login.html';
        }
    })
    .catch(() => {
        window.location.href = '/login.html';
    });
