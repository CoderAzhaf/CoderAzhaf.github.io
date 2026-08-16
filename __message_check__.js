
        const loaderStartedAt = Date.now();
        let userDirectory = [];
        let pendingAttachments = [];
        let currentUsername = '';
        let replyToMessage = null;
        let forwardedMessage = null;
        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[char]));
        }
        function linkifyText(text) {
            const escaped = escapeHtml(text);
            return escaped.replace(/(https?:\/\/[^\s<]+)/gi, (match) => `<a href="${match}" target="_blank" rel="noreferrer">${match}</a>`);
        }
        function renderAttachmentNodes(attachments = []) {
            if (!attachments.length) return '';
            return `
                <div class="attachment-grid">
                    ${attachments.map((attachment) => {
                        if (attachment.type === 'image') {
                            return `<div class="attachment-item"><img src="${attachment.url}" alt="${escapeHtml(attachment.name)}"></div>`;
                        }
                        if (attachment.type === 'video') {
                            return `<div class="attachment-item"><video controls preload="metadata"><source src="${attachment.url}"></video></div>`;
                        }
                        return `<div class="attachment-item"><a href="${attachment.url}" target="_blank" rel="noreferrer">${escapeHtml(attachment.name)}</a></div>`;
                    }).join('')}
                </div>
            `;
        }
        function renderInviteCard(message) {
            const roomCode = message.meta?.roomCode || '';
            const title = message.meta?.title || 'AZHA Meeting';
            const startsAt = message.meta?.startsAt ? new Date(message.meta.startsAt).toLocaleString() : 'Start time not set';
            const note = message.meta?.note || message.text || 'Open the meeting invite to join.';
            return `
                <div class="invite-card">
                    <strong>${escapeHtml(title)}</strong>
                    <div class="invite-meta">
                        Host: @${escapeHtml(message.meta?.host || message.from)}<br>
                        Room code: ${escapeHtml(roomCode)}<br>
                        Starts: ${escapeHtml(startsAt)}
                    </div>
                    <div class="message-text">${linkifyText(note)}</div>
                    <div class="message-actions">
                        <button type="button" onclick="acceptInvite('${escapeHtml(message.id)}','${escapeHtml(roomCode)}')">Accept</button>
                        <button type="button" class="secondary" onclick="declineInvite('${escapeHtml(message.id)}')">Decline</button>
                        <button type="button" class="secondary" onclick="openInviteFocus('${escapeHtml(roomCode)}')">Open full screen</button>
                    </div>
                </div>
            `;
        }
        function renderPendingAttachments() {
            const preview = document.getElementById('attachmentPreview');
            if (!pendingAttachments.length) {
                preview.innerHTML = '';
                return;
            }
            preview.innerHTML = pendingAttachments.map((attachment, index) => `
                <div class="attachment-pill">
                    <strong>${escapeHtml(attachment.name)}</strong>
                    <div>${attachment.type}</div>
                    <button type="button" class="secondary" onclick="removePendingAttachment(${index})">Remove</button>
                </div>
            `).join('');
        }
        function renderComposeContext() {
            const wrapper = document.getElementById('composeContext');
            const blocks = [];
            if (replyToMessage) {
                blocks.push(`
                    <div class="context-quote">
                        <strong>Replying to @${escapeHtml(replyToMessage.from)}</strong><br>
                        ${escapeHtml(replyToMessage.text || '')}
                    </div>
                `);
            }
            if (forwardedMessage) {
                blocks.push(`
                    <div class="context-quote">
                        <strong>Forwarding from @${escapeHtml(forwardedMessage.from)}</strong><br>
                        ${escapeHtml(forwardedMessage.text || '')}
                    </div>
                `);
            }
            if (blocks.length) {
                blocks.push(`<button type="button" class="secondary" onclick="clearComposerContext()">Clear reply/forward</button>`);
            }
            wrapper.innerHTML = blocks.join('');
        }
        async function handleAttachmentInput(event) {
            const files = Array.from(event.target.files || []).slice(0, 4);
            pendingAttachments = [];
            for (const file of files) {
                const url = await readFileAsDataUrl(file);
                pendingAttachments.push({
                    type: file.type.startsWith('video/') ? 'video' : 'image',
                    name: file.name,
                    url
                });
            }
            renderPendingAttachments();
        }
        function removePendingAttachment(index) {
            pendingAttachments.splice(index, 1);
            renderPendingAttachments();
        }
        function avatarFor(username) {
            const user = userDirectory.find((entry) => entry.username === username);
            return user?.profilePic || 'azha-logo.png';
        }
        function updateRecipientPreview() {
            const recipient = document.getElementById('recipientSelect').value;
            const user = userDirectory.find((entry) => entry.username === recipient);
            document.getElementById('recipientAvatar').src = user?.profilePic || 'azha-logo.png';
            document.getElementById('recipientName').textContent = user?.fullName || recipient || 'No recipient selected';
            document.getElementById('recipientMeta').textContent = user ? `Message will go to @${user.username}` : 'Choose someone to preview their profile picture before sending.';
        }
        async function loadRecipients(currentUsername) {
            try {
                userDirectory = await getAllUsers();
                const currentUser = userDirectory.find((user) => user.username === currentUsername);
                if (currentUser?.profilePic) {
                    document.getElementById('currentUserAvatar').src = currentUser.profilePic;
                }
                populateRecipientSelect();
                updateRecipientPreview();
            } catch (error) {
                document.getElementById('recipientSelect').innerHTML = '<option value="">No users available</option>';
                updateRecipientPreview();
            }
        }

        function populateRecipientSelect(searchTerm = '') {
            const currentUsername = localStorage.getItem('currentUsername');
            const select = document.getElementById('recipientSelect');
            const filtered = userDirectory
                .filter((user) => user.username !== currentUsername && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((user) => `<option value="${user.username}">${user.username}</option>`)
                .join('');
            select.innerHTML = filtered || '<option value="">No matching users</option>';
        }

        document.getElementById('searchRecipient').addEventListener('input', (e) => {
            populateRecipientSelect(e.target.value);
            updateRecipientPreview();
        });
        function renderMessageCard(message, currentUsername, type) {
            const actionButtons = [];
            if (type === 'inbox' && !message.read) actionButtons.push(`<button type="button" onclick="markRead('${message.id}')">Mark read</button>`);
            actionButtons.push(`<button type="button" class="secondary" onclick="replyMessage('${message.id}','${type}')">Reply</button>`);
            actionButtons.push(`<button type="button" class="secondary" onclick="forwardMessage('${message.id}','${type}')">Forward</button>`);
            actionButtons.push(`<button type="button" class="secondary" onclick="removeMessage('${message.id}')">Delete</button>`);
            const identity = type === 'inbox' ? message.from : message.to;
            const messageBody = message.kind === 'meeting-invite'
                ? renderInviteCard(message)
                : `
                    ${message.meta?.replyTo ? `<div class="context-quote"><strong>Reply to @${escapeHtml(message.meta.replyTo.from)}</strong><br>${escapeHtml(message.meta.replyTo.text || '')}</div>` : ''}
                    ${message.meta?.forwardedFrom ? `<div class="context-quote"><strong>Forwarded from @${escapeHtml(message.meta.forwardedFrom.from)}</strong><br>${escapeHtml(message.meta.forwardedFrom.text || '')}</div>` : ''}
                    ${message.text ? `<div class="message-text">${linkifyText(message.text)}</div>` : ''}
                    ${renderAttachmentNodes(message.attachments || [])}
                `;
            return `
                <article class="message-card">
                    <div class="message-head">
                        <img class="message-avatar" src="${avatarFor(identity)}" alt="${identity} profile picture">
                        <div>
                            <strong>${type === 'inbox' ? `From: ${message.from}` : `To: ${message.to}`}</strong>
                            <span>${new Date(message.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="message-body">
                        ${messageBody}
                    </div>
                    <div class="message-actions">${actionButtons.join('')}</div>
                </article>
            `;
        }
        async function refreshMessages(preloadedInbox = null) {
            const inboxSource = Array.isArray(preloadedInbox) ? preloadedInbox : await getInbox(currentUsername);
            const inbox = inboxSource.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
            const sent = (await getSent(currentUsername)).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
            const unreadCount = inbox.filter((message) => !message.read).length;
            document.getElementById('inboxList').innerHTML = inbox.length ? inbox.map((message)=>renderMessageCard(message,currentUsername,'inbox')).join('') : '<p>No inbox messages yet.</p>';
            document.getElementById('sentList').innerHTML = sent.length ? sent.map((message)=>renderMessageCard(message,currentUsername,'sent')).join('') : '<p>No sent messages yet.</p>';
            document.getElementById('inboxUnreadBadge').textContent = unreadCount;
            document.getElementById('sentCountBadge').textContent = sent.length;
            document.getElementById('statusText').textContent = `Signed in as ${currentUsername}. ${unreadCount} unread message${unreadCount === 1 ? '' : 's'} and live refresh is active.`;
        }
        async function markRead(id) { if (await markMessageRead(id,currentUsername)) refreshMessages(); }
        async function removeMessage(id) { if (await deleteMessage(id,currentUsername)) refreshMessages(); }
        async function replyMessage(id, type) {
            const source = type === 'inbox' ? await getInbox(currentUsername) : await getSent(currentUsername);
            const match = source.find((message) => message.id === id);
            if (!match) return;
            replyToMessage = { id: match.id, from: match.from, text: match.text || '' };
            forwardedMessage = null;
            document.getElementById('recipientSelect').value = type === 'inbox' ? match.from : match.to;
            updateRecipientPreview();
            renderComposeContext();
            document.getElementById('messageInput').focus();
        }
        async function forwardMessage(id, type) {
            const source = type === 'inbox' ? await getInbox(currentUsername) : await getSent(currentUsername);
            const match = source.find((message) => message.id === id);
            if (!match) return;
            forwardedMessage = { id: match.id, from: match.from, to: match.to, text: match.text || '' };
            replyToMessage = null;
            renderComposeContext();
            document.getElementById('messageInput').focus();
        }
        function clearComposerContext() {
            replyToMessage = null;
            forwardedMessage = null;
            renderComposeContext();
        }
        function buildMeetingUrl(room, focused) {
            const params = new URLSearchParams({ meeting: room });
            if (focused) params.set('host', '0');
            return `Meetings.html?${params.toString()}`;
        }
        function joinInviteRoom(room) {
            if (!room) {
                showMessage('This invite is missing its room code.', false);
                return;
            }
            window.location.href = buildMeetingUrl(room, false);
        }
        async function acceptInvite(id, room) {
            await markMessageRead(id, currentUsername);
            if (typeof markNotificationAsRead === 'function') {
                markNotificationAsRead(currentUsername, id);
            }
            joinInviteRoom(room);
        }
        async function declineInvite(id) {
            const removed = await deleteMessage(id, currentUsername);
            if (removed && typeof clearNotificationItem === 'function') {
                clearNotificationItem(currentUsername, id);
            }
            if (removed) {
                showMessage('Invite declined.', true);
                refreshMessages();
            }
        }
        function openInviteFocus(room) {
            if (!room) {
                showMessage('This invite is missing its room code.', false);
                return;
            }
            window.open(buildMeetingUrl(room, false), '_blank', 'noopener,noreferrer');
        }
        async function enableNotifications() {
            const permission = await requestNotificationAccess();
            if (permission === 'granted') {
                showMessage('Notifications are enabled on this device.', true);
            } else if (permission === 'denied') {
                showMessage('Notifications are blocked in this browser right now.', false);
            } else {
                showMessage('Notifications are not supported here.', false);
            }
        }
        document.getElementById('sendButton').addEventListener('click', async () => {
            const recipient = document.getElementById('recipientSelect').value;
            const text = document.getElementById('messageInput').value.trim();
            if (!recipient || (!text && !pendingAttachments.length)) { showMessage('Choose a recipient and add text or media.', false); return; }
            const ok = await sendMessage(currentUsername, recipient, text, pendingAttachments, {
                meta: {
                    replyTo: replyToMessage,
                    forwardedFrom: forwardedMessage
                }
            });
            if (ok) {
                document.getElementById('messageInput').value = '';
                document.getElementById('messageMedia').value = '';
                pendingAttachments = [];
                renderPendingAttachments();
                clearComposerContext();
                showMessage('Message sent.', true);
                refreshMessages();
            }
        });
        document.getElementById('recipientSelect').addEventListener('change', updateRecipientPreview);
        document.getElementById('messageMedia').addEventListener('change', handleAttachmentInput);
        document.getElementById('enableNotificationsBtn').addEventListener('click', enableNotifications);
        async function init() {
            if (!checkLogin()) return;
            currentUsername = localStorage.getItem('currentUsername') || '';
            renderComposeContext();
            const access = await ensureFeatureAccess('messages', { silent: true });
            if (!access.allowed) {
                document.getElementById('statusText').textContent = `Signed in as ${currentUsername}. Messages are locked for your current membership.`;
                document.querySelector('.layout').innerHTML = `
                    <div class="locked-card">
                        <h2>Messages are locked</h2>
                        <p>Upgrade to <strong>Pro</strong> or <strong>MAX</strong> in your profile to unlock inbox and sending tools.</p>
                        <a class="back-link" href="Profile.html">Open membership</a>
                    </div>
                `;
                return;
            }
            const backend = await hasBackend();
            document.getElementById('statusText').textContent = backend ? `Signed in as ${currentUsername}. Messages refresh automatically and new ones should appear on this device in a few seconds.` : `Signed in as ${currentUsername}. Backend is unavailable, so local fallback mode is active.`;
            await loadRecipients(currentUsername);
            await refreshMessages();
            await startInboxPolling({
                username: currentUsername,
                intervalMs: 1500,
                onInbox: async (inbox) => {
                    await refreshMessages(inbox);
                }
            });
        }
        window.markRead = markRead;
        window.removeMessage = removeMessage;
        window.replyMessage = replyMessage;
        window.forwardMessage = forwardMessage;
        window.clearComposerContext = clearComposerContext;
        window.removePendingAttachment = removePendingAttachment;
            window.joinInviteRoom = joinInviteRoom;
        window.acceptInvite = acceptInvite;
        window.declineInvite = declineInvite;
        window.openInviteFocus = openInviteFocus;
        init();
        window.addEventListener('load', () => {
            const loader = document.getElementById('appLoader');
            const elapsed = Date.now() - loaderStartedAt;
            const delay = Math.max(900 - elapsed, 0);
            window.setTimeout(() => {
                loader.classList.add('is-hidden');
                window.setTimeout(() => loader.remove(), 320);
            }, delay);
        });
    
