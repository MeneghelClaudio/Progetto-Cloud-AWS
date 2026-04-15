document.addEventListener('DOMContentLoaded', async function() {
    const logoutBtn = document.getElementById('logoutBtn');
    const userManagementBtn = document.getElementById('userManagementBtn');
    const userModal = document.getElementById('userModal');
    const closeModal = document.querySelector('.close');
    const usernameSpan = document.getElementById('username');

    let currentRole = null;

    async function checkAuth() {
        try {
            const response = await fetch('/api/check-auth');
            const data = await response.json();
            if (data.authenticated) {
                usernameSpan.textContent = data.username;
                currentRole = data.role;
                // Sia admin che superadmin vedono la gestione utenti
                if (data.role === 'admin' || data.role === 'root') {
                    userManagementBtn.style.display = 'flex';
                }
            } else {
                window.location.href = '/login/';
            }
        } catch (error) {
            window.location.href = '/login/';
        }
    }

    checkAuth();

    logoutBtn.addEventListener('click', async function() {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login/';
    });

    userManagementBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        userModal.style.display = 'block';
        loadUsers();
    });

    closeModal.addEventListener('click', function() { userModal.style.display = 'none'; });
    window.addEventListener('click', function(e) {
        if (e.target === userModal) userModal.style.display = 'none';
    });

    async function loadUsers() {
        try {
            const response = await fetch('/api/users');
            const users = await response.json();
            const isRoot = currentRole === 'root';

            const usersList = document.getElementById('usersList');
            usersList.innerHTML =
                '<table class="users-table">' +
                '<thead><tr><th>Username</th><th>Ruolo</th><th>Azioni</th></tr></thead><tbody>' +
                users.map(user => {
                    const isSelf = user.username === usernameSpan.textContent;
                    const isTargetRoot = user.role === 'root';
                    const selectDisabled = isSelf || isTargetRoot || (user.role === 'admin' && !isRoot);
                    const canDelete = !isSelf && !isTargetRoot && (user.role !== 'admin' || isRoot);
                    const roleLabel = { user: 'User', admin: 'Admin', root: 'Root' }[user.role] || user.role;

                    return `<tr>
                        <td>${user.username}</td>
                        <td>
                            ${selectDisabled
                                ? `<span class="role-badge role-${user.role}">${roleLabel}</span>`
                                : `<select onchange="changeRole(${user.id}, this.value)">
                                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                   </select>`
                            }
                        </td>
                        <td>
                            ${canDelete
                                ? `<button onclick="deleteUser(${user.id})" class="btn-delete">Elimina</button>`
                                : '-'}
                        </td>
                    </tr>`;
                }).join('') +
                '</tbody></table>';
        } catch (error) {
            console.error('Errore nel caricamento utenti:', error);
        }
    }

    window.changeRole = async function(userId, role) {
        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })
            });
            if (response.ok) {
                loadUsers();
            } else {
                const err = await response.json();
                alert(err.error || 'Errore aggiornamento ruolo');
                loadUsers(); // ripristina select
            }
        } catch (error) {
            console.error('Errore:', error);
        }
    };

    window.deleteUser = async function(userId) {
        if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;
        try {
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            if (response.ok) {
                loadUsers();
            } else {
                const err = await response.json();
                alert(err.error || 'Errore eliminazione utente');
            }
        } catch (error) {
            console.error('Errore:', error);
        }
    };
});
