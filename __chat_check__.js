
        let currentUsername = '';
        let selectedFriend = '';
        let replyToMessage = null;
        let forwardedMessage = null;
        let friendsSnapshot = [];
        let chatRefreshHandle = null;
        let friendsRefreshHandle = null;
        let inspectingUsername = '';

        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[char]));
        }

        function presenceBadge(status) {
            const safe = String(status || 'offline').toLowerCase();
            const cls = safe === 'online' ? 'badge-online' : safe === 'busy' ? 'badge-busy' : 'badge-offline';
            return `<span class="${cls}">${safe}</span>`;
        }

        function renderRequestLists(view) {
            const incoming = document.getElementById('incomingRequests');
            const outgoing = document.getElementById('outgoingRequests');
            incoming.innerHTML = (view.incomingRequests || []).length
                ? view.incomingRequests.map((request) => `
                    <div class="card">
                        <strong>@${escapeHtml(request.from)}</strong>
                        <div class="small">${new Date(request.createdAt).toLocaleString()}</div>
                        <div class="mini-actions">
                            <button type="button" class="primary" onclick="acceptRequestNow('${escapeHtml(request.from)}')">Accept</button>
                            <button type="button" class="danger" onclick="rejectRequestNow('${escapeHtml(request.from)}')">Reject</button>
                        </div>
                    </div>
                `).join('')
                : '<div class="small">No incoming requests.</div>';
            outgoing.innerHTML = (view.outgoingRequests || []).length
                ? view.outgoingRequests.map((request) => `
                    <div class="card">
                        <strong>@${escapeHtml(request.to)}</strong>
                        <div class="small">Pending since ${new Date(request.createdAt).toLocaleString()}</div>
                    </div>
                `).join('')
                : '<div class="small">No outgoing requests.</div>';
        }

        function renderFriends(view) {
            const list = document.getElementById('friendsList');
            const targetName = view.username === currentUsername ? 'your' : `${view.username}'s`;
            friendsSnapshot = Array.isArray(view.friends) ? view.friends : [];
            document.getElementById('friendCountPill').textContent = `${friendsSnapshot.length} friends`;
            document.getElementById('friendListMeta').textContent = `Showing ${targetName} friend list.`;
            if (!friendsSnapshot.length) {
                list.innerHTML = '<div class="small">No friends yet.</div>';
                return;
            }
            list.innerHTML = friendsSnapshot.map((friend) => `
                <article class="card friend-card ${selectedFriend === friend.username ? 'is-active' : ''}" onclick="openFriendChat('${escapeHtml(friend.username)}')">
                    <div class="friend-top">
                        <div>
                            <strong>${escapeHtml(friend.fullName || friend.username)}</strong>
                            <div class="small">@${escapeHtml(friend.username)}</div>
                        </div>
                        <span class="pill">${presenceBadge(friend.status)}</span>
                    </div>
                    <div class="friend-meta">
                        Membership: ${escapeHtml(friend.membershipLabel)}<br>
                        AZHA: ${escapeHtml(friend.balance)}<br>
                        Last seen: ${friend.lastSeenAt ? escapeHtml(new Date(friend.lastSeenAt).toLocaleString()) : 'unknown'}
                    </div>
                </article>
            `).join('');
        }

        function renderComposerMeta() {
            const reply = document.getElementById('replyPreview');
            const forward = document.getElementById('forwardPreview');
            if (replyToMessage) {
                reply.classList.remove('hidden');
                reply.innerHTML = `<strong>Replying to @${escapeHtml(replyToMessage.from)}</strong><br>${escapeHtml(replyToMessage.text || '')}`;
            } else {
                reply.classList.add('hidden');
                reply.textContent = '';
            }
            if (forwardedMessage) {
                forward.classList.remove('hidden');
                forward.innerHTML = `<strong>Forwarding from @${escapeHtml(forwardedMessage.from)}</strong><br>${escapeHtml(forwardedMessage.text || '')}`;
            } else {
                forward.classList.add('hidden');
                forward.textContent = '';
            }
        }

        async function renderChat() {
            const thread = document.getElementById('chatThread');
            if (!selectedFriend) {
                document.getElementById('chatTitle').textContent = 'Select a friend';
                document.getElementById('chatMeta').textContent = 'Choose a friend to start chatting.';
                document.getElementById('chatStatusPill').textContent = 'No chat';
                thread.innerHTML = '<div class="small">No chat open yet.</div>';
                return;
            }
            const friend = friendsSnapshot.find((entry) => entry.username === selectedFriend);
            document.getElementById('chatTitle').textContent = friend?.fullName || selectedFriend;
            document.getElementById('chatMeta').textContent = `Chatting with @${selectedFriend}`;
            document.getElementById('chatStatusPill').innerHTML = presenceBadge(friend?.status || 'offline');
            const messages = await getChatThread(selectedFriend, currentUsername);
            if (!messages.length) {
                thread.innerHTML = '<div class="small">No chat messages yet.</div>';
                return;
            }
            thread.innerHTML = messages.map((message) => `
                <article class="chat-bubble ${message.from === currentUsername ? 'mine' : ''}">
                    <div class="small">${message.from === currentUsername ? 'You' : '@' + escapeHtml(message.from)} • ${new Date(message.timestamp).toLocaleString()}</div>
                    ${message.replyTo ? `<div class="quote"><strong>Reply to @${escapeHtml(message.replyTo.from)}</strong><br>${escapeHtml(message.replyTo.text)}</div>` : ''}
                    ${message.forwardedFrom ? `<div class="quote"><strong>Forwarded from @${escapeHtml(message.forwardedFrom.from)}</strong><br>${escapeHtml(message.forwardedFrom.text)}</div>` : ''}
                    <div>${escapeHtml(message.text)}</div>
                    <div class="mini-actions" style="margin-top:10px;">
                        <button type="button" onclick="setReplyChat('${escapeHtml(message.id)}')">Reply</button>
                        <button type="button" onclick="setForwardChat('${escapeHtml(message.id)}')">Forward</button>
                    </div>
                </article>
            `).join('');
            await Promise.all(messages.filter((message) => message.to === currentUsername && !message.read).map((message) => markChatRead(message.id, currentUsername)));
        }

        async function refreshFriendsPanel() {
            const target = inspectingUsername || currentUsername;
            const actor = currentUsername;
            const view = await getFriendsView(target, actor);
            document.getElementById('presenceText').innerHTML = `You are ${presenceBadge(view.username === currentUsername ? view.presence : 'online')}.`;
            renderRequestLists(view);
            renderFriends(view);
            if (selectedFriend && !friendsSnapshot.some((entry) => entry.username === selectedFriend)) {
                selectedFriend = '';
                clearComposerMeta();
            }
            await renderChat();
        }

        async function changePresence(status) {
            const ok = await setPresenceStatus(status);
            if (ok) {
                showMessage(`You now appear ${status}.`, true);
                refreshFriendsPanel();
            }
        }

        async function sendFriendRequestNow() {
            const to = document.getElementById('friendUsernameInput').value.trim();
            if (!to) {
                showMessage('Enter a username first.', false);
                return;
            }
            if (await sendFriendRequest(to)) {
                document.getElementById('friendUsernameInput').value = '';
                refreshFriendsPanel();
            }
        }

        async function acceptRequestNow(fromUsername) {
            if (await acceptFriendRequest(fromUsername)) {
                refreshFriendsPanel();
            }
        }

        async function rejectRequestNow(fromUsername) {
            if (await rejectFriendRequest(fromUsername)) {
                refreshFriendsPanel();
            }
        }

        function openFriendChat(username) {
            selectedFriend = username;
            renderFriends({ username: inspectingUsername || currentUsername, friends: friendsSnapshot, incomingRequests: [], outgoingRequests: [] });
            renderChat();
        }

        function clearComposerMeta() {
            replyToMessage = null;
            forwardedMessage = null;
            renderComposerMeta();
        }

        async function sendChatNow() {
            if (!selectedFriend) {
                showMessage('Choose a friend first.', false);
                return;
            }
            const text = document.getElementById('chatInput').value.trim();
            if (!text) {
                showMessage('Write a chat message first.', false);
                return;
            }
            const ok = await sendChatMessage(selectedFriend, text, {
                replyTo: replyToMessage,
                forwardedFrom: forwardedMessage
            });
            if (!ok) return;
            document.getElementById('chatInput').value = '';
            clearComposerMeta();
            renderChat();
        }

        async function setReplyChat(messageId) {
            const messages = await getChatThread(selectedFriend, currentUsername);
            const match = messages.find((entry) => entry.id === messageId);
            if (!match) return;
            replyToMessage = { id: match.id, from: match.from, text: match.text };
            forwardedMessage = null;
            renderComposerMeta();
        }

        async function setForwardChat(messageId) {
            const messages = await getChatThread(selectedFriend, currentUsername);
            const match = messages.find((entry) => entry.id === messageId);
            if (!match) return;
            forwardedMessage = { id: match.id, from: match.from, to: match.to, text: match.text };
            replyToMessage = null;
            renderComposerMeta();
        }

        async function inspectFriendsNow() {
            if (currentUsername !== 'AZHA') return;
            const target = document.getElementById('inspectUsernameInput').value.trim();
            if (!target) {
                inspectingUsername = '';
                document.getElementById('inspectMeta').textContent = 'AZHA can inspect another user’s friend list here.';
            } else {
                inspectingUsername = target;
                document.getElementById('inspectMeta').textContent = `Inspecting ${target}'s friends.`;
            }
            selectedFriend = '';
            clearComposerMeta();
            refreshFriendsPanel();
        }

        async function init() {
            if (!checkLogin()) return;
            currentUsername = localStorage.getItem('currentUsername') || '';
            if (!currentUsername) {
                window.location.href = 'Getin.html';
                return;
            }
            if (currentUsername === 'AZHA') {
                document.getElementById('ceoInspectCard').classList.remove('hidden');
            }
            startPresenceHeartbeat('online');
            await refreshFriendsPanel();
            if (friendsRefreshHandle) clearInterval(friendsRefreshHandle);
            if (chatRefreshHandle) clearInterval(chatRefreshHandle);
            friendsRefreshHandle = window.setInterval(refreshFriendsPanel, 4000);
            chatRefreshHandle = window.setInterval(renderChat, 2000);
        }

        window.changePresence = changePresence;
        window.sendFriendRequestNow = sendFriendRequestNow;
        window.acceptRequestNow = acceptRequestNow;
        window.rejectRequestNow = rejectRequestNow;
        window.openFriendChat = openFriendChat;
        window.clearComposerMeta = clearComposerMeta;
        window.sendChatNow = sendChatNow;
        window.setReplyChat = setReplyChat;
        window.setForwardChat = setForwardChat;
        window.inspectFriendsNow = inspectFriendsNow;
        init();
    
