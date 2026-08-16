
        let pendingProfilePic = '';
        function updatePreview() { document.getElementById('profilePreview').src = pendingProfilePic || 'azha-logo.png'; }
        function describePlanUnlocks(plan) {
            if (plan.key === 'AZHA') {
                return 'Unlocks: Messages, Meetings, and shared AZHA Upstash storage for the whole website';
            }
            if (plan.key === 'PRO') {
                return 'Unlocks: Messages';
            }
            return 'Unlocks: AZHA rewards only';
        }
        function renderMembershipPlans(plans, currentMembership) {
            const currentPlan = currentMembership?.planKey || '';
            document.getElementById('membershipPlans').innerHTML = plans.map((plan) => `
                <article class="membership-card">
                    <strong>${plan.label}</strong>
                    <p>${plan.azincCost} AZINC for 1 year</p>
                    <p>${plan.rewardAmount.toLocaleString()} AZHA every ${plan.rewardInterval}</p>
                    <p>${describePlanUnlocks(plan)}</p>
                    <button type="button" onclick="beginMembershipCheckout('${plan.key}')">${currentPlan === plan.key && currentMembership.active ? `Renew ${plan.label} with AZINC` : `Buy ${plan.label} with AZINC`}</button>
                </article>
            `).join('');
        }
        async function refreshMembershipPanel(user) {
            const membership = user?.membership || {};
            const featureText = [];
            if (user?.featureAccess?.messages) featureText.push('Messages');
            if (user?.featureAccess?.meetings) featureText.push('Meetings');
            const badge = document.getElementById('membershipBadge');
            const badgeState = membership.active ? String(membership.planKey || '').toLowerCase() : 'locked';
            badge.className = `membership-status ${badgeState || 'locked'}`;
            badge.textContent = membership.active ? `${membership.label} active` : 'Locked';
            document.getElementById('membershipTitle').textContent = membership.active ? `${membership.label} membership active` : 'No active membership';
            document.getElementById('membershipMeta').textContent = membership.active
                ? `Expires ${new Date(membership.expiresAt).toLocaleString()}. Next AZHA reward: ${membership.nextRewardAt ? new Date(membership.nextRewardAt).toLocaleString() : 'ready now'}. ${featureText.length ? `Unlocked: ${featureText.join(', ')}.` : 'No extra tools unlocked on this plan.'}`
                : 'Use AZINC to unlock Messages, Meetings, and shared storage access over time.';
            document.getElementById('cancelMembershipButton').disabled = !membership.active;
            const plans = await getMembershipPlans();
            renderMembershipPlans(plans, membership);
        }
        function refreshStoragePanel(user) {
            const storage = user?.storagePreference || { mode: 'shared', status: 'shared' };
            const badge = document.getElementById('storageBadge');
            const badgeState = storage.mode === 'supabase'
                ? (storage.status === 'connected' ? 'supabase' : (storage.status || 'expired'))
                : (storage.sharedAllowed ? 'shared' : 'expired');
            badge.className = `storage-badge ${badgeState}`;
            badge.textContent = storage.mode === 'supabase'
                ? `Supabase: ${storage.status}`
                : (storage.sharedAllowed ? 'AZHA Upstash' : 'Locked');
            document.getElementById('storageMeta').textContent = storage.mode === 'supabase'
                ? `Supabase URL: ${storage.supabaseUrl || 'not set'}. Status: ${storage.status}.${storage.lastError ? ` Last error: ${storage.lastError}` : ''}`
                : (storage.sharedAllowed ? 'Shared AZHA Upstash storage is available for this account across the whole website.' : 'Shared AZHA Upstash storage needs an active MAX membership. You can still connect your own Supabase.');
            document.getElementById('storageSupabaseUrl').value = storage.supabaseUrl || '';
            document.getElementById('storageSupabaseKey').value = '';
            document.getElementById('useSharedStorageButton').disabled = !storage.sharedAllowed;
        }
        async function init() {
            if (!checkLogin()) return;
            const user = await getCurrentAccountData();
            if (!user) { showMessage('Unable to load your profile.', false); return; }
            document.getElementById('profileUsername').value = user.username;
            document.getElementById('profileFullName').value = user.fullName;
            document.getElementById('profilePassword').value = user.password || '';
            pendingProfilePic = user.profilePic || '';
            updatePreview();
            await refreshMembershipPanel(user);
            refreshStoragePanel(user);
        }
        document.getElementById('profilePicInput').addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            pendingProfilePic = await readFileAsDataUrl(file);
            updatePreview();
        });
        document.getElementById('saveProfileButton').addEventListener('click', async () => {
            const payload = {
                username: document.getElementById('profileUsername').value.trim(),
                fullName: document.getElementById('profileFullName').value.trim(),
                password: document.getElementById('profilePassword').value.trim(),
                profilePic: pendingProfilePic
            };
            if (await updateOwnProfile(payload)) {
                setTimeout(() => window.location.href = 'index.html', 600);
            }
        });
        document.getElementById('claimMembershipButton').addEventListener('click', async () => {
            const result = await claimMembershipReward();
            if (result) {
                const user = await getCurrentAccountData();
                await refreshMembershipPanel(user);
            }
        });
        document.getElementById('refreshMembershipButton').addEventListener('click', async () => {
            const user = await getCurrentAccountData();
            if (user) {
                await refreshMembershipPanel(user);
                showMessage('Membership refreshed.', true);
            }
        });
        document.getElementById('cancelMembershipButton').addEventListener('click', async () => {
            if (await cancelOwnMembership()) {
                const user = await getCurrentAccountData();
                if (user) {
                    await refreshMembershipPanel(user);
                    refreshStoragePanel(user);
                }
            }
        });
        document.getElementById('useSharedStorageButton').addEventListener('click', async () => {
            const user = await configurePersonalStorage({ mode: 'shared' });
            if (user) {
                await refreshMembershipPanel(user);
                refreshStoragePanel(user);
            }
        });
        document.getElementById('useSupabaseStorageButton').addEventListener('click', async () => {
            const supabaseUrl = document.getElementById('storageSupabaseUrl').value.trim();
            const supabaseKey = document.getElementById('storageSupabaseKey').value.trim();
            const user = await configurePersonalStorage({ mode: 'supabase', supabaseUrl, supabaseKey });
            if (user) {
                await refreshMembershipPanel(user);
                refreshStoragePanel(user);
            }
        });
        init();
    