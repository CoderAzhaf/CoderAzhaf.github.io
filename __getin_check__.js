
        const loaderStartedAt = Date.now();
        window.__managedSignupLocked = false;
        async function updateAccountPreview() {
            const username = document.getElementById('login-username').value.trim() || document.getElementById('signup-username').value.trim();
            const preview = document.getElementById('accountUserPic');
            if (!username) { preview.hidden = true; preview.src = 'azha-logo.png'; return; }
            const users = await getAllUsers();
            const match = users.find((user) => user.username.toLowerCase() === username.toLowerCase());
            if (match?.profilePic) { preview.src = match.profilePic; preview.hidden = false; } else { preview.hidden = true; preview.src = 'azha-logo.png'; }
        }
        function showDevProvider(event, provider) {
            event.preventDefault();
            showMessage(`${provider} sign in is still being developed.`, false);
        }
        async function refreshManagedSignupState() {
            try {
                const current = await getCurrentAccountData();
                const locked = Boolean(current?.managedAccount);
                window.__managedSignupLocked = locked;
                const note = document.getElementById('managedSignupNote');
                const button = document.getElementById('signupButton');
                if (note) note.style.display = locked ? 'block' : 'none';
                if (button) button.disabled = locked;
            } catch (error) {
                window.__managedSignupLocked = false;
            }
        }
        document.getElementById('login-username').addEventListener('input', updateAccountPreview);
        document.getElementById('signup-username').addEventListener('input', updateAccountPreview);
        window.showDevProvider = showDevProvider;
        window.addEventListener('load', () => {
            refreshManagedSignupState();
            const loader = document.getElementById('appLoader');
            const elapsed = Date.now() - loaderStartedAt;
            const delay = Math.max(900 - elapsed, 0);
            window.setTimeout(() => {
                loader.classList.add('is-hidden');
                window.setTimeout(() => loader.remove(), 320);
            }, delay);
        });
    