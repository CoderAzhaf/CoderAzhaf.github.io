
        let allUsers = [];
        function avatarFor(user) { return user.profilePic || 'azha-logo.png'; }
        const pendingAdminPics = {};
        function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char])); }
        
        async function loadUsers(searchTerm = '') {
            const list = document.getElementById('usersList');
            try {
                const actor = localStorage.getItem('currentUsername');
                let users = await getAllUsers();
                const actorUser = users.find((user) => user.username === actor);
                if (actorUser?.profilePic) {
                    document.getElementById('adminTopAvatar').src = actorUser.profilePic;
                }
                document.getElementById('adminTopName').textContent = actorUser?.fullName || actor || 'Admin';
                document.getElementById('adminTopRole').textContent = actor === 'AZHA' ? 'Founder access: every account visible' : 'Admin access: AZHA stays hidden';
                if (actor !== 'AZHA') users = users.filter((user) => user.username !== 'AZHA');
                
                // Filter by search term
                if (searchTerm) {
                    users = users.filter((user) => user.username.toLowerCase().includes(searchTerm.toLowerCase()) || user.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
                }
                
                allUsers = users;
                renderUsers(users);
            } catch (error) {
                list.innerHTML = '<p>Unable to load users right now.</p>';
            }
        }
        
        function renderUsers(users) {
            const list = document.getElementById('usersList');
            const isCeo = localStorage.getItem('currentUsername') === 'AZHA';
            list.innerHTML = users.map((user, index) => {
                    const canDelete = user.username !== 'AZHA';
                    const balance = user.balance === undefined ? 0 : user.balance;
                    const banAction = user.status === 'banned' ? 'unban' : 'ban';
                    const profilePic = escapeHtml(avatarFor(user));
                    return `
                        <article class="user-card">
                            <div class="user-layout">
                                <div class="avatar-column">
                                    <img id="avatar-${index}" class="avatar" src="${profilePic}" alt="${user.username} profile picture">
                                    <span class="avatar-caption">Profile picture</span>
                                </div>
                                <div>
                                    <div class="user-head">
                                        <div>
                                            <h3>${user.username}</h3>
                                            <p>${user.fullName}</p>
                                        </div>
                                        <strong>${user.isAdmin ? 'Admin' : 'User'}</strong>
                                    </div>
                                    <div class="meta">
                                        <span>Status: ${user.status}</span>
                                        <span>Warnings: ${user.warnings || 0}</span>
                                        <span>AZHA: ${balance}</span>
                                        <span>Membership: ${user.membership?.active ? `${user.membership.label} until ${new Date(user.membership.expiresAt).toLocaleDateString()}` : 'None'}</span>
                                        <span>Password: ${user.password || 'No password'}</span>
                                    </div>
                                      <div class="edit-grid">
                                          <input id="edit-username-${index}" value="${user.username}" placeholder="Username">
                                          <input id="edit-fullname-${index}" value="${user.fullName}" placeholder="Full name">
                                          <input id="edit-password-${index}" value="${user.password || ''}" placeholder="Password">
                                          <input id="edit-pic-${index}" type="file" accept="image/*" onchange="previewAdminPic('${user.username}', ${index}, this.files[0])">
                                          <input id="edit-org-name-${index}" value="${escapeHtml(user.browserProfile?.organization?.name || '')}" placeholder="Org name">
                                          <select id="edit-org-type-${index}">
                                              <option value="personal" ${user.browserProfile?.organization?.type === 'personal' ? 'selected' : ''}>Personal</option>
                                              <option value="school" ${user.browserProfile?.organization?.type === 'school' ? 'selected' : ''}>School</option>
                                              <option value="work" ${user.browserProfile?.organization?.type === 'work' ? 'selected' : ''}>Work</option>
                                          </select>
                                          <input id="edit-org-domain-${index}" value="${escapeHtml(user.browserProfile?.organization?.emailDomain || '')}" placeholder="Org domain">
                                          <input id="edit-org-logo-${index}" value="${escapeHtml(user.browserProfile?.organization?.logoText || 'AZHA')}" placeholder="Org badge text">
                                          <textarea id="edit-org-blocked-${index}" placeholder="Blocked domains">${escapeHtml((user.browserProfile?.controls?.blockedDomains || []).join('\n'))}</textarea>
                                          <textarea id="edit-org-allowed-${index}" placeholder="Allowed domains">${escapeHtml((user.browserProfile?.controls?.allowedDomains || []).join('\n'))}</textarea>
                                      </div>
                                      <div class="actions">
                                          <button type="button" onclick="saveUserEdits('${user.username}', ${index})">Save Edit</button>
                                          <button type="button" class="secondary" onclick="applyBrowserOrg('${user.username}', ${index}, true)">Apply Org Browser</button>
                                          <button type="button" class="secondary" onclick="applyBrowserOrg('${user.username}', ${index}, false)">Remove Org Browser</button>
                                          ${isCeo && !user.isAdmin ? `<button type="button" onclick="promoteUser('${user.username}')">Make Admin</button>` : ''}
                                          ${user.isAdmin && user.username !== 'AZHA' ? `<button type="button" class="secondary" onclick="demoteUser('${user.username}')">Remove Admin</button>` : ''}
                                          <button type="button" class="secondary" onclick="warnSelectedUser('${user.username}')">Warn</button>
                                        <button type="button" class="secondary" onclick="resetSelectedBalance('${user.username}')">Reset AZHA</button>
                                        ${localStorage.getItem('currentUsername') === 'AZHA' ? `<button type="button" class="secondary" onclick="setSelectedBalanceFromCard('${user.username}', '${balance}')">Set AZHA</button>` : ''}
                                        ${user.username !== 'AZHA' ? `<button type="button" class="secondary" onclick="toggleUserBan('${user.username}', '${banAction}')">${banAction === 'ban' ? 'Ban' : 'Unban'}</button>` : ''}
                                        ${localStorage.getItem('currentUsername') === 'AZHA' ? `<button type="button" class="secondary" onclick="grantPlan('${user.username}', 'PLUS')">Free Plus</button><button type="button" class="secondary" onclick="grantPlan('${user.username}', 'PRO')">Free Pro</button><button type="button" class="secondary" onclick="grantPlan('${user.username}', 'AZHA')">Free AZHA</button><button type="button" class="secondary" onclick="removePlan('${user.username}')">Remove Membership</button>` : ''}
                                        ${canDelete ? `<button type="button" class="danger" onclick="deleteSelectedUser('${user.username}')">Delete</button>` : ''}
                                    </div>
                                </div>
                            </div>
                        </article>
                    `;
                }).join('');
        }
        async function saveUserEdits(originalUsername, index) {
            const blockedDomains = document.getElementById(`edit-org-blocked-${index}`).value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
            const allowedDomains = document.getElementById(`edit-org-allowed-${index}`).value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
            const payload = {
                username: document.getElementById(`edit-username-${index}`).value.trim(),
                fullName: document.getElementById(`edit-fullname-${index}`).value.trim(),
                password: document.getElementById(`edit-password-${index}`).value.trim(),
                profilePic: pendingAdminPics[originalUsername],
                browserProfile: {
                    ...(allUsers[index]?.browserProfile || {}),
                    organization: {
                        ...(allUsers[index]?.browserProfile?.organization || {}),
                        name: document.getElementById(`edit-org-name-${index}`).value.trim(),
                        type: document.getElementById(`edit-org-type-${index}`).value,
                        emailDomain: document.getElementById(`edit-org-domain-${index}`).value.trim(),
                        logoText: document.getElementById(`edit-org-logo-${index}`).value.trim() || 'AZHA',
                        managed: { ...(allUsers[index]?.browserProfile?.organization?.managed || {}) }
                    },
                    controls: {
                        ...(allUsers[index]?.browserProfile?.controls || {}),
                        blockedDomains,
                        allowedDomains
                    }
                }
            };
            if (await updateUserFromAdmin(originalUsername, payload)) loadUsers();
        }
        async function applyBrowserOrg(username, index, enabled) {
            const blockedDomains = document.getElementById(`edit-org-blocked-${index}`).value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
            const allowedDomains = document.getElementById(`edit-org-allowed-${index}`).value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
            const actor = localStorage.getItem('currentUsername') || 'Admin';
            const payload = {
                username: document.getElementById(`edit-username-${index}`).value.trim(),
                fullName: document.getElementById(`edit-fullname-${index}`).value.trim(),
                password: document.getElementById(`edit-password-${index}`).value.trim(),
                profilePic: pendingAdminPics[username],
                browserProfile: {
                    ...(allUsers[index]?.browserProfile || {}),
                    organization: {
                        ...(allUsers[index]?.browserProfile?.organization || {}),
                        name: document.getElementById(`edit-org-name-${index}`).value.trim(),
                        type: document.getElementById(`edit-org-type-${index}`).value,
                        emailDomain: document.getElementById(`edit-org-domain-${index}`).value.trim(),
                        logoText: document.getElementById(`edit-org-logo-${index}`).value.trim() || 'AZHA',
                        managed: {
                            enabled,
                            by: enabled ? actor : ''
                        }
                    },
                    controls: {
                        ...(allUsers[index]?.browserProfile?.controls || {}),
                        blockedDomains,
                        allowedDomains
                    }
                }
            };
            if (await updateUserFromAdmin(username, payload)) loadUsers();
        }
        async function previewAdminPic(username, index, file) {
            if (!file) return;
            try {
                const dataUrl = await readFileAsDataUrl(file);
                pendingAdminPics[username] = dataUrl;
                document.getElementById(`avatar-${index}`).src = dataUrl;
            } catch (error) { showMessage(error.message, false); }
        }
        async function promoteUser(username) { if (await makeAdmin(username)) loadUsers(); }
        async function demoteUser(username) { if (await removeAdmin(username)) loadUsers(); }
        async function warnSelectedUser(username) { if (await warnUser(username)) loadUsers(); }
        async function resetSelectedBalance(username) { if (await resetAZINC(username)) loadUsers(); }
        async function setSelectedBalanceFromCard(username, currentBalance) {
            const value = prompt(`Set ${username}'s AZHA balance`, String(currentBalance ?? 0));
            if (value === null) return;
            const amount = Number(value);
            if (Number.isNaN(amount) || amount < 0) { showMessage('Enter a valid AZHA amount.', false); return; }
            if (await setExactAZHABalance(username, amount)) loadUsers();
        }
        async function toggleUserBan(username, action) { if (await toggleBan(username, action)) loadUsers(); }
        async function deleteSelectedUser(username) { if (!confirm(`Delete ${username}? This removes account data and messages.`)) return; if (await deleteUserAccount(username)) loadUsers(); }
        async function grantPlan(username, planKey) { if (await grantFreeMembership(username, planKey)) loadUsers(); }
        async function removePlan(username) { if (await clearMembership(username)) loadUsers(); }
        document.getElementById('createManagedButton').addEventListener('click', async () => {
            const payload = {
                username: document.getElementById('managed-username').value.trim(),
                password: document.getElementById('managed-password').value.trim(),
                fullName: document.getElementById('managed-fullname').value.trim(),
                accountType: document.getElementById('managed-type').value,
                orgName: document.getElementById('managed-org-name').value.trim(),
                orgDomain: document.getElementById('managed-org-domain').value.trim(),
                orgLogoText: document.getElementById('managed-org-logo').value.trim()
            };
            if (await createManagedAccount(payload)) {
                document.getElementById('managed-username').value = '';
                document.getElementById('managed-password').value = '';
                document.getElementById('managed-fullname').value = '';
                document.getElementById('managed-org-name').value = '';
                document.getElementById('managed-org-domain').value = '';
                document.getElementById('managed-org-logo').value = '';
                loadUsers();
            }
        });
        document.getElementById('azincButton').addEventListener('click', async () => {
            const username = document.getElementById('azincUser').value.trim();
            const amount = Number(document.getElementById('azincAmount').value);
            if (!username || Number.isNaN(amount)) { showMessage('Enter a username and amount.', false); return; }
            if (await giveAZINC(username, amount)) { document.getElementById('azincAmount').value = ''; loadUsers(); }
        });
        document.getElementById('setBalanceButton').addEventListener('click', async () => {
            const username = document.getElementById('azincUser').value.trim();
            const amount = Number(document.getElementById('setBalanceAmount').value);
            if (!username || Number.isNaN(amount) || amount < 0) { showMessage('Enter a username and exact AZHA amount.', false); return; }
            if (await setExactAZHABalance(username, amount)) { document.getElementById('setBalanceAmount').value = ''; loadUsers(); }
        });
        async function init() {
            if (!checkLogin()) return;
            if (localStorage.getItem('isAdmin') !== 'true') { showMessage('You are not an admin.', false); window.location.href = 'index.html'; return; }
            const backend = await hasBackend();
            document.getElementById('statusText').textContent = backend ? 'Admin access confirmed. AZHA can leave a password blank to keep the current one. Only AZHA can give admin access.' : 'Admin access confirmed in local fallback mode.';
            if (localStorage.getItem('currentUsername') !== 'AZHA') {
                document.getElementById('setBalanceAmount').style.display = 'none';
                document.getElementById('setBalanceButton').style.display = 'none';
            }
            loadUsers();
            document.getElementById('searchUsers').addEventListener('input', (e) => {
                loadUsers(e.target.value);
            });
        }
        window.saveUserEdits = saveUserEdits;
        window.previewAdminPic = previewAdminPic;
        window.applyBrowserOrg = applyBrowserOrg;
        window.promoteUser = promoteUser;
        window.demoteUser = demoteUser;
        window.warnSelectedUser = warnSelectedUser;
        window.resetSelectedBalance = resetSelectedBalance;
        window.setSelectedBalanceFromCard = setSelectedBalanceFromCard;
        window.toggleUserBan = toggleUserBan;
        window.deleteSelectedUser = deleteSelectedUser;
        window.grantPlan = grantPlan;
        window.removePlan = removePlan;
        init();
    
