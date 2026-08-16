
        const localMeetingKey = 'meetingSchedules';

        function normalizeRoomName(value) {
            return String(value || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        }

        function readLocalMeetings() {
            try {
                const raw = JSON.parse(localStorage.getItem(localMeetingKey) || '[]');
                return Array.isArray(raw) ? raw : [];
            } catch (error) {
                return [];
            }
        }

        function writeLocalMeetings(meetings) {
            localStorage.setItem(localMeetingKey, JSON.stringify(meetings));
        }

        function getMeetingUser() {
            // Check if user is logged in
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (!isLoggedIn) {
                return 'guest';
            }
            // Prefer currentUsername (the actual username) over currentUser (full name)
            const username = localStorage.getItem('currentUsername');
            if (username) {
                return normalizeRoomName(username) || 'guest';
            }
            // Fallback to currentUser if currentUsername not available but logged in
            const fullName = localStorage.getItem('currentUser');
            return normalizeRoomName(fullName) || 'guest';
        }

        function buildMeetingName() {
            const typed = normalizeRoomName(document.getElementById('roomName').value);
            if (typed) return typed;
            const current = getMeetingUser();
            return `azha-${current || 'guest'}-room`;
        }

        function buildMeetingUrl(room, options = {}) {
            // Generate a shareable AZHA Meetings room link on this same site
            const baseUrl = window.location.origin;
            const meetingPath = window.location.pathname.replace(/\/[^\/]*\.html$/, '/Meetings.html');
            const params = new URLSearchParams({ meeting: room });
            if (options.host) {
                params.set('host', '1');
            }
            const joinUrl = `${baseUrl}${meetingPath}?${params.toString()}`;
            return joinUrl;
        }

        class AZHAMeetingManager {
            constructor(roomCode, username, isHost = false) {
                this.roomCode = roomCode;
                this.username = username;
                this.isHost = isHost;
                this.localStream = null;
                this.screenStream = null;
                this.peerConnections = {};
                this.remoteStreams = {};
                this.isAudioEnabled = true;
                this.isVideoEnabled = true;
                this.isScreenSharing = false;
                this.hostUsername = isHost ? username : null;
                this.participants = new Set();
                this.pendingParticipants = new Set();
                this.approvedParticipants = new Set();
                this.mutedParticipants = new Set();
                this.screenShareDisabled = new Set();
                this.meetingLocked = false;
                this.hostControls = {
                    canEndMeeting: true,
                    canMuteParticipants: true,
                    canRemoveParticipants: true,
                    canShareScreen: true,
                    canRecord: true
                };
                this.ws = null;
                this.wsRetries = 0;
                this.wsMaxRetries = 5;
                this.wsRetryDelay = 1000;
                this.rtcConfig = {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                };
            }

            async initialize() {
                try {
                    // Try to get local media, but don't fail if it's not available
                    try {
                        await this.getLocalMedia();
                    } catch (mediaError) {
                        console.warn('Could not access camera/microphone, but continuing with audio-only or text mode:', mediaError);
                        // Allow meeting to continue without media
                    }
                    
                    this.participants.add(this.username);
                    if (this.isHost) {
                        this.approvedParticipants.add(this.username);
                    } else {
                        this.pendingParticipants.add(this.username);
                    }
                    
                    // Connect to WebSocket with retry logic
                    try {
                        await this.connectWebSocket();
                    } catch (wsError) {
                        console.error('WebSocket connection failed:', wsError);
                        // Still allow meeting (might recover later or sync via polling)
                    }
                    
                    this.broadcastParticipantUpdate();
                    return true;
                } catch (error) {
                    console.error('Failed to initialize meeting:', error);
                    return false;
                }
            }

            async connectWebSocket() {
                return new Promise((resolve, reject) => {
                    const attemptConnection = () => {
                        try {
                            this.ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`);
                            let openTimeout;
                            
                            this.ws.onopen = () => {
                                clearTimeout(openTimeout);
                                this.wsRetries = 0;
                                console.log('WebSocket connected');
                                resolve();
                            };
                            
                            this.ws.onmessage = (event) => this.handleSignalingMessage(event.data);
                            
                            this.ws.onerror = (error) => {
                                console.error('WebSocket error:', error);
                                clearTimeout(openTimeout);
                            };
                            
                            this.ws.onclose = () => {
                                clearTimeout(openTimeout);
                                console.log('WebSocket closed, attempting reconnection...');
                                this.attemptReconnect();
                            };
                            
                            // Timeout if connection doesn't open within 10 seconds
                            openTimeout = setTimeout(() => {
                                if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                                    this.ws.close();
                                    if (this.wsRetries < this.wsMaxRetries) {
                                        this.wsRetries++;
                                        setTimeout(attemptConnection, this.wsRetryDelay * this.wsRetries);
                                    } else {
                                        reject(new Error('WebSocket connection timeout'));
                                    }
                                }
                            }, 10000);
                        } catch (error) {
                            if (this.wsRetries < this.wsMaxRetries) {
                                this.wsRetries++;
                                setTimeout(attemptConnection, this.wsRetryDelay * this.wsRetries);
                            } else {
                                reject(new Error('Failed to establish WebSocket connection'));
                            }
                        }
                    };
                    attemptConnection();
                });
            }

            attemptReconnect() {
                if (this.wsRetries < this.wsMaxRetries) {
                    this.wsRetries++;
                    setTimeout(() => {
                        this.connectWebSocket().catch(err => {
                            console.error('Reconnection failed:', err);
                        });
                    }, this.wsRetryDelay * this.wsRetries);
                }
            }

            safeSend(data) {
                // Helper to safely send WebSocket messages with retries
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    try {
                        this.ws.send(JSON.stringify(data));
                        return true;
                    } catch (error) {
                        console.error('Error sending WebSocket message:', error);
                        return false;
                    }
                } else {
                    console.warn('WebSocket not ready, message not sent:', data);
                    return false;
                }
            }

            async getLocalMedia() {
                try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
                    });
                    const videoElement = document.getElementById('localVideo');
                    if (videoElement) {
                        videoElement.srcObject = this.localStream;
                    }
                } catch (error) {
                    console.error('Failed to get local media:', error);
                    throw error;
                }
            }

            toggleAudio(enabled) {
                this.isAudioEnabled = enabled;
                if (this.localStream) {
                    this.localStream.getAudioTracks().forEach(track => {
                        track.enabled = enabled;
                    });
                }
            }

            toggleVideo(enabled) {
                this.isVideoEnabled = enabled;
                if (this.localStream) {
                    this.localStream.getVideoTracks().forEach(track => {
                        track.enabled = enabled;
                    });
                }
            }

            async toggleScreenShare() {
                try {
                    if (this.isScreenSharing) {
                        await this.stopScreenShare();
                    } else {
                        await this.startScreenShare();
                    }
                } catch (error) {
                    console.error('Error toggling screen share:', error);
                }
            }

            async startScreenShare() {
                try {
                    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: { cursor: 'always' },
                        audio: false
                    });

                    const screenContainer = document.getElementById('screenShareContainer');
                    if (screenContainer && this.screenStream) {
                        const video = document.createElement('video');
                        video.autoplay = true;
                        video.playsinline = true;
                        video.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:16px;';
                        const div = document.createElement('div');
                        div.style.cssText = 'position:relative;background:#000;border-radius:16px;overflow:hidden;aspect-ratio:16/9;';
                        const label = document.createElement('div');
                        label.style.cssText = 'position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.6);padding:6px 12px;border-radius:8px;font-size:.85rem;color:#fff;';
                        label.textContent = 'Screen: ' + this.username;
                        video.srcObject = this.screenStream;
                        div.appendChild(video);
                        div.appendChild(label);
                        screenContainer.appendChild(div);
                    }

                    this.isScreenSharing = true;
                    this.screenStream.getTracks()[0].onended = () => this.stopScreenShare();
                } catch (error) {
                    console.error('Error starting screen share:', error);
                }
            }

            async stopScreenShare() {
                if (this.screenStream) {
                    this.screenStream.getTracks().forEach(track => track.stop());
                    const screenContainer = document.getElementById('screenShareContainer');
                    if (screenContainer) {
                        screenContainer.innerHTML = '';
                    }
                    this.isScreenSharing = false;
                }
            }

            addRemoteStream(username, stream) {
                this.remoteStreams[username] = stream;
                this.updateRemoteVideos();
            }

            updateRemoteVideos() {
                const container = document.getElementById('remoteVideosContainer');
                if (!container) return;
                
                const html = Object.entries(this.remoteStreams).map(([username, stream]) => {
                    return `
                        <div style="position:relative;background:#000;border-radius:16px;overflow:hidden;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;">
                            <video id="remote-${username}" autoplay playsinline style="width:100%;height:100%;object-fit:cover;"></video>
                            <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.6);padding:6px 12px;border-radius:8px;font-size:.85rem;color:#fff;">${username}</div>
                        </div>
                    `;
                }).join('');
                container.innerHTML = html;

                Object.entries(this.remoteStreams).forEach(([username, stream]) => {
                    const video = document.getElementById(`remote-${username}`);
                    if (video) {
                        video.srcObject = stream;
                    }
                });
            }

            updateParticipantsList() {
                const info = document.getElementById('participantsInfo');
                if (!info) return;
                
                let html = '';
                
                // Show host info
                if (this.hostUsername) {
                    html += `<div style="margin-bottom:12px;padding:10px;background:rgba(102,204,153,.15);border-radius:8px;border:1px solid rgba(102,204,153,.3);">`
                         + `<strong>🎛️ Host: ${this.hostUsername}</strong><br>`
                         + `<small style="color:var(--muted);">`;
                    const controls = [];
                    if (this.hostControls.canEndMeeting) controls.push('End');
                    if (this.hostControls.canMuteParticipants) controls.push('Mute');
                    if (this.hostControls.canRemoveParticipants) controls.push('Remove');
                    if (this.hostControls.canShareScreen) controls.push('Share');
                    if (this.hostControls.canRecord) controls.push('Record');
                    html += `Permissions: ${controls.join(' • ')}</small>`;
                    
                    // Host controls if this is the host
                    if (this.isHost) {
                        html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(102,204,153,.3);">`;
                        html += `<button data-action="mute-all" type="button" style="padding:6px 12px;background:#ff8c42;color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:.85rem;margin-right:8px;">🔇 Mute All</button>`;
                        html += `<button data-action="toggle-lock" type="button" style="padding:6px 12px;background:${this.meetingLocked ? '#ff6b6b' : '#66cc99'};color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:.85rem;">${this.meetingLocked ? '🔒 Locked' : '🔓 Unlocked'}</button>`;
                        html += `</div>`;
                    }
                    html += `</div>`;
                }
                
                // Show approved participants (with host controls if host)
                if (this.approvedParticipants.size > 0) {
                    html += `<p style="margin:12px 0 4px 0;color:var(--accent);font-size:.85rem;">In Meeting (${this.approvedParticipants.size}):</p>`;
                    html += Array.from(this.approvedParticipants).map(p => {
                        const isMuted = this.mutedParticipants.has(p);
                        const screenBlocked = this.screenShareDisabled.has(p);
                        let status = [];
                        if (isMuted) status.push('🔇 Muted');
                        if (screenBlocked) status.push('📹 No Share');
                        
                        let card = `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;margin:4px 0;background:rgba(255,255,255,.04);border-radius:6px;border:1px solid rgba(255,255,255,.08);">
                            <div style="flex:1;">
                                <strong>${p}</strong>`;
                        if (status.length > 0) {
                            card += `<br><small style="color:#ffb341;">${status.join(' • ')}</small>`;
                        }
                        card += `</div>`;
                        
                        if (this.isHost && p !== this.username) {
                            card += `<div style="display:flex;gap:4px;">
                                <button data-action="${isMuted ? 'unmute' : 'mute'}" data-user="${p}" type="button" style="padding:4px 8px;background:${isMuted ? '#66cc99' : '#ff8c42'};color:#111;border:0;border-radius:4px;cursor:pointer;font-size:.75rem;">${isMuted ? '🔊' : '🔇'}</button>
                                <button data-action="toggle-share" data-user="${p}" type="button" style="padding:4px 8px;background:${screenBlocked ? '#ff6b6b' : '#66cc99'};color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:.75rem;">${screenBlocked ? '❌' : '✓'}</button>
                                <button data-action="remove" data-user="${p}" type="button" style="padding:4px 8px;background:#ff6b6b;color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:.75rem;">✕</button>
                            </div>`;
                        }
                        card += `</div>`;
                        return card;
                    }).join('');
                }
                
                // Show pending participants (only if host)
                if (this.isHost && this.pendingParticipants.size > 0) {
                    html += `<p style="margin:12px 0 4px 0;color:#ffb341;font-size:.85rem;">⏳ Waiting for Approval:</p>`;
                    html += Array.from(this.pendingParticipants).map(p => 
                        `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08);">
                            <span>${p}</span>
                            <div style="display:flex;gap:8px;">
                                <button data-action="approve" data-user="${p}" type="button" style="padding:4px 8px;background:#66cc99;color:#111;border:0;border-radius:4px;cursor:pointer;font-size:.8rem;">Allow</button>
                                <button data-action="reject" data-user="${p}" type="button" style="padding:4px 8px;background:#ff6b6b;color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:.8rem;">Deny</button>
                            </div>
                        </div>`
                    ).join('');
                }
                
                // Show waiting state if pending
                if (!this.isHost && this.pendingParticipants.has(this.username)) {
                    html += `<p style="color:#ffb341;padding:12px;text-align:center;">⏳ Waiting for host to approve your entry...</p>`;
                }
                
                // Show if muted
                if (this.mutedParticipants.has(this.username) && !this.isHost) {
                    html += `<p style="color:#ff8c42;padding:12px;text-align:center;background:rgba(255,140,66,.15);border-radius:6px;border:1px solid rgba(255,140,66,.3);">🔇 Host has muted you</p>`;
                }
                
                // Show if screen share is disabled
                if (this.screenShareDisabled.has(this.username) && !this.isHost) {
                    html += `<p style="color:#ff6b6b;padding:12px;text-align:center;background:rgba(255,107,107,.15);border-radius:6px;border:1px solid rgba(255,107,107,.3);">📹 Host has disabled screen sharing for you</p>`;
                }
                
                info.innerHTML = html || 'Connecting...';
            }

            approveParticipant(username) {
                if (!this.isHost) return;
                this.pendingParticipants.delete(username);
                this.approvedParticipants.add(username);
                this.updateParticipantsList();
                this.safeSend({
                    type: 'approve-participant',
                    room: this.roomCode,
                    username,
                    approvedBy: this.username
                });
            }

            rejectParticipant(username) {
                if (!this.isHost) return;
                this.pendingParticipants.delete(username);
                this.updateParticipantsList();
                this.safeSend({
                    type: 'reject-participant',
                    room: this.roomCode,
                    username,
                    rejectedBy: this.username
                });
            }

            broadcastParticipantUpdate(retryCount = 0) {
                this.updateParticipantsList();
                const sent = this.safeSend({
                    type: 'participant-update',
                    room: this.roomCode,
                    username: this.username,
                    participants: Array.from(this.participants)
                });
                
                if (!sent && retryCount < 5) {
                    // Retry if send failed
                    setTimeout(() => this.broadcastParticipantUpdate(retryCount + 1), 800 + (retryCount * 300));
                }
            }

            handleSignalingMessage(data) {
                try {
                    const message = JSON.parse(data);
                    if (message.room === this.roomCode) {
                        if (message.type === 'participant-joined') {
                            this.participants.add(message.username);
                            this.updateParticipantsList();
                        } else if (message.type === 'participant-left') {
                            this.participants.delete(message.username);
                            delete this.remoteStreams[message.username];
                            this.updateRemoteVideos();
                            this.updateParticipantsList();
                        }
                    }
                } catch (error) {
                    console.error('Error handling signaling message:', error);
                }
            }

            muteParticipant(username) {
                if (!this.isHost) return;
                this.mutedParticipants.add(username);
                this.updateParticipantsList();
                this.safeSend({
                    type: 'mute-participant',
                    room: this.roomCode,
                    username,
                    mutedBy: this.username
                });
            }

            unmuteParticipant(username) {
                if (!this.isHost) return;
                this.mutedParticipants.delete(username);
                this.updateParticipantsList();
                this.safeSend({
                    type: 'unmute-participant',
                    room: this.roomCode,
                    username,
                    unmutedBy: this.username
                });
            }

            muteAll() {
                if (!this.isHost) return;
                Array.from(this.approvedParticipants).forEach(p => {
                    if (p !== this.username) {
                        this.mutedParticipants.add(p);
                    }
                });
                this.updateParticipantsList();
                this.safeSend({
                    type: 'mute-all',
                    room: this.roomCode,
                    mutedBy: this.username
                });
            }

            toggleScreenSharePermission(username) {
                if (!this.isHost) return;
                if (this.screenShareDisabled.has(username)) {
                    this.screenShareDisabled.delete(username);
                } else {
                    this.screenShareDisabled.add(username);
                }
                this.updateParticipantsList();
                this.safeSend({
                    type: 'toggle-screen-permission',
                    room: this.roomCode,
                    username,
                    allowed: !this.screenShareDisabled.has(username),
                    by: this.username
                });
            }

            removeParticipant(username) {
                if (!this.isHost) return;
                this.approvedParticipants.delete(username);
                this.mutedParticipants.delete(username);
                this.screenShareDisabled.delete(username);
                delete this.remoteStreams[username];
                this.updateRemoteVideos();
                this.updateParticipantsList();
                this.safeSend({
                    type: 'remove-participant',
                    room: this.roomCode,
                    username,
                    removedBy: this.username
                });
            }

            toggleMeetingLock() {
                if (!this.isHost) return;
                this.meetingLocked = !this.meetingLocked;
                this.safeSend({
                    type: 'toggle-lock',
                    room: this.roomCode,
                    locked: this.meetingLocked,
                    lockedBy: this.username
                });
            }

            end() {
                if (this.localStream) {
                    this.localStream.getTracks().forEach(track => track.stop());
                }
                if (this.screenStream) {
                    this.screenStream.getTracks().forEach(track => track.stop());
                }
                Object.values(this.peerConnections).forEach(pc => pc.close());
                if (this.ws) {
                    this.ws.close();
                }
            }
        }

        let currentMeetingManager = null;

        function formatMeetingTime(iso) {
            if (!iso) return 'Time not set';
            const date = new Date(iso);
            if (Number.isNaN(date.getTime())) return 'Time not set';
            return date.toLocaleString();
        }

        function updateInvitePreview(room) {
            const roomName = room || buildMeetingName();
            const link = buildMeetingUrl(roomName);
            const previewEl = document.getElementById('invitePreview');
            if (previewEl) {
                // Show link as clickable URL
                previewEl.innerHTML = `<a href="${link}" target="_blank" style="color:#65d1b7;text-decoration:none;word-break:break-all;">${link}</a>`;
            }
            return link;
        }

        function openEmbeddedMeeting() {
            const room = buildMeetingName();
            if (!room) {
                showMessage('Choose a room name first.', false);
                return;
            }
            document.getElementById('roomName').value = room;
            document.getElementById('meetingTitle').textContent = `AZHA Meeting: ${room}`;
            document.getElementById('meetingFrameWrap').style.display = 'block';
            updateInvitePreview(room);
            startAZHAMeeting(room, true);
            showMessage('Meeting started. Waiting for participants...', true);
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }

        function openFocusedMeeting() {
            const room = document.getElementById('roomName').value || buildMeetingName();
            if (!room) {
                showMessage('Choose a room name first.', false);
                return;
            }
            document.getElementById('roomName').value = room;
            updateInvitePreview(room);
            const meetingUrl = buildMeetingUrl(room, { host: true });
            window.open(meetingUrl, '_blank', 'noopener,noreferrer');
        }

        async function getMeetingOwnership(roomCode) {
            const normalizedRoom = normalizeRoomName(roomCode);
            const currentUsername = String(localStorage.getItem('currentUsername') || '').trim().toLowerCase();
            const currentFullName = String(localStorage.getItem('currentUser') || '').trim().toLowerCase();
            if (!normalizedRoom) {
                return { isHost: false, meeting: null };
            }
            try {
                const meetings = await fetchMeetings();
                const meeting = Array.isArray(meetings)
                    ? meetings.find((item) => normalizeRoomName(item.roomCode) === normalizedRoom)
                    : null;
                if (!meeting) {
                    return { isHost: false, meeting: null };
                }
                const hostName = String(meeting.host || '').trim().toLowerCase();
                const isHost = Boolean(hostName) && (hostName === currentUsername || hostName === currentFullName);
                return { isHost, meeting };
            } catch (error) {
                console.warn('Could not load meeting ownership details:', error);
                return { isHost: false, meeting: null };
            }
        }

        async function startAZHAMeeting(roomCode, isHost = true) {
            if (currentMeetingManager) {
                currentMeetingManager.end();
            }

            // Get the actual logged-in username, preferring currentUsername (the account username)
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const username = isLoggedIn 
                ? (localStorage.getItem('currentUsername') || localStorage.getItem('currentUser') || 'guest')
                : 'guest';
            
            const ownership = await getMeetingOwnership(roomCode);
            const shouldHost = Boolean(isHost || ownership.isHost);
            currentMeetingManager = new AZHAMeetingManager(roomCode, username, shouldHost);

            if (ownership.meeting && ownership.meeting.hostControls) {
                currentMeetingManager.hostUsername = ownership.meeting.host;
                currentMeetingManager.hostControls = ownership.meeting.hostControls;
            } else if (shouldHost) {
                currentMeetingManager.hostUsername = username;
            }
            
            const success = await currentMeetingManager.initialize();
            if (!success) {
                showMessage('Could not initialize meeting. Check camera/microphone permissions.', false);
                return;
            }

            // Setup control buttons
            document.getElementById('toggleAudioBtn').onclick = () => {
                if (currentMeetingManager.mutedParticipants.has(currentMeetingManager.username) && currentMeetingManager.isAudioEnabled) {
                    showMessage('Host has muted you - you cannot unmute.', false);
                    return;
                }
                currentMeetingManager.toggleAudio(!currentMeetingManager.isAudioEnabled);
                document.getElementById('toggleAudioBtn').textContent = currentMeetingManager.isAudioEnabled ? '🎤 Audio On' : '🔇 Audio Off';
            };

            document.getElementById('toggleVideoBtn').onclick = () => {
                currentMeetingManager.toggleVideo(!currentMeetingManager.isVideoEnabled);
                document.getElementById('toggleVideoBtn').textContent = currentMeetingManager.isVideoEnabled ? '📹 Video On' : '🎥 Video Off';
            };

            document.getElementById('toggleScreenBtn').onclick = async () => {
                if (!currentMeetingManager.isHost && !currentMeetingManager.hostControls.canShareScreen) {
                    showMessage('Host has disabled screen sharing.', false);
                    return;
                }
                if (!currentMeetingManager.isHost && currentMeetingManager.screenShareDisabled.has(currentMeetingManager.username)) {
                    showMessage('Host has disabled screen sharing for you.', false);
                    return;
                }
                await currentMeetingManager.toggleScreenShare();
                document.getElementById('toggleScreenBtn').textContent = currentMeetingManager.isScreenSharing ? '🛑 Stop Sharing' : '🖥️ Share Screen';
            };

            document.getElementById('endMeetingBtn').onclick = () => {
                if (!shouldHost && !currentMeetingManager.isHost) {
                    showMessage('Only the host can end the meeting.', false);
                    return;
                }
                currentMeetingManager.end();
                document.getElementById('meetingFrameWrap').style.display = 'none';
                showMessage('Meeting ended.', true);
            };
            
            // Handle approval buttons
            document.getElementById('participantsInfo').onclick = (e) => {
                if (e.target.hasAttribute('data-action')) {
                    const action = e.target.getAttribute('data-action');
                    const user = e.target.getAttribute('data-user');
                    if (action === 'approve') {
                        currentMeetingManager.approveParticipant(user);
                    } else if (action === 'reject') {
                        currentMeetingManager.rejectParticipant(user);
                    } else if (action === 'mute') {
                        currentMeetingManager.muteParticipant(user);
                    } else if (action === 'unmute') {
                        currentMeetingManager.unmuteParticipant(user);
                    } else if (action === 'toggle-share') {
                        currentMeetingManager.toggleScreenSharePermission(user);
                    } else if (action === 'remove') {
                        currentMeetingManager.removeParticipant(user);
                    } else if (action === 'mute-all') {
                        currentMeetingManager.muteAll();
                    } else if (action === 'toggle-lock') {
                        currentMeetingManager.toggleMeetingLock();
                        if (currentMeetingManager.meetingLocked) {
                            showMessage('Meeting is now locked - no new participants can join', true);
                        } else {
                            showMessage('Meeting is now unlocked', true);
                        }
                    }
                }
            };
        }

        async function checkMeetingExists(roomCode) {
            try {
                const username = encodeURIComponent(localStorage.getItem('currentUsername') || '');
                const response = await fetch(`/api/meeting/${encodeURIComponent(roomCode)}?username=${username}`);
                const data = await response.json();
                return { exists: data.exists, participants: data.participantCount };
            } catch (error) {
                console.error('Error checking meeting:', error);
                return { exists: false, participants: 0 };
            }
        }

        async function openMeetingFromCode(code, focused) {
            const room = normalizeRoomName(code);
            if (!room) {
                showMessage('Enter a real meeting code first.', false);
                return;
            }

            try {
                const [result, ownership] = await Promise.all([
                    checkMeetingExists(room),
                    getMeetingOwnership(room)
                ]);
                const scheduledExists = Boolean(ownership.meeting);
                const validRoomFormat = /^[a-z0-9-]+$/.test(room) && room.length > 0;
                if (!result.exists && !scheduledExists && !validRoomFormat) {
                    showMessage(`Meeting "${room}" doesn't exist yet. Be the first to create it or try another code.`, false);
                    return;
                }
                proceedWithMeetingJoin(room, focused, ownership.isHost);
            } catch (error) {
                console.warn('Could not verify meeting code:', error);
                proceedWithMeetingJoin(room, focused, false);
            }
        }

        function proceedWithMeetingJoin(room, focused, isHost = false) {
            document.getElementById('roomName').value = room;
            if (focused) {
                const meetingUrl = buildMeetingUrl(room, { host: isHost });
                window.open(meetingUrl, '_blank', 'noopener,noreferrer');
            } else {
                document.getElementById('meetingTitle').textContent = `AZHA Meeting: ${room}`;
                document.getElementById('meetingFrameWrap').style.display = 'block';
                updateInvitePreview(room);
                startAZHAMeeting(room, isHost);
                showMessage('Joining meeting...', true);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
        }

        async function copyInviteLink() {
            const room = buildMeetingName();
            const link = updateInvitePreview(room);
            document.getElementById('roomName').value = room;
            try {
                await navigator.clipboard.writeText(link);
                showMessage('Invite link copied.', true);
            } catch (error) {
                showMessage('Copy failed. You can still share the link shown on the page.', false);
            }
        }

        async function fetchMeetings() {
            const username = localStorage.getItem('currentUsername') || '';
            if (typeof hasBackend === 'function' && await hasBackend()) {
                return apiRequest(`/api/meetings?username=${encodeURIComponent(username)}`);
            }
            return readLocalMeetings();
        }

        async function createScheduledMeeting(payload) {
            if (typeof hasBackend === 'function' && await hasBackend()) {
                return apiRequest('/api/meetings', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            const list = readLocalMeetings();
            const roomCode = normalizeRoomName(payload.roomCode) || `${getMeetingUser()}-meeting-${Date.now().toString(36)}`;
            if (list.some((meeting) => meeting.roomCode === roomCode)) {
                throw new Error('That room code is already being used');
            }
            const meeting = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                title: payload.title || 'AZHA Meeting',
                roomCode,
                host: payload.host,
                startsAt: new Date(payload.startsAt).toISOString(),
                note: payload.note || '',
                createdAt: new Date().toISOString(),
                status: 'scheduled',
                durationMinutes: payload.durationMinutes || null,
                recordingEnabled: Boolean(payload.recordingEnabled),
                hostControls: payload.hostControls || undefined,
                recordings: []
            };
            list.push(meeting);
            writeLocalMeetings(list);
            return meeting;
        }

        async function deleteScheduledMeeting(id) {
            const actor = localStorage.getItem('currentUsername') || '';
            if (typeof hasBackend === 'function' && await hasBackend()) {
                return apiRequest(`/api/meetings/${id}`, {
                    method: 'DELETE',
                    body: JSON.stringify({ actor })
                });
            }
            const list = readLocalMeetings().filter((meeting) => meeting.id !== id);
            writeLocalMeetings(list);
            return { message: 'Meeting deleted' };
        }

        function renderMeetings(meetings) {
            const host = localStorage.getItem('currentUsername') || '';
            const wrapper = document.getElementById('scheduledMeetings');
            if (!meetings.length) {
                wrapper.innerHTML = '<div class="meeting-item"><strong>No meetings scheduled yet.</strong><p class="meeting-note">Schedule one above and it will show here.</p></div>';
                return;
            }

            wrapper.innerHTML = meetings.map((meeting) => {
                const canDelete = host && (meeting.host === host || localStorage.getItem('isAdmin') === 'true');
                const note = meeting.note ? `<p class="meeting-note">${meeting.note.replace(/</g, '&lt;')}</p>` : '';
                const durationText = meeting.durationMinutes ? `${meeting.durationMinutes} min limit` : 'unlimited';
                const recordingIcon = meeting.recordingEnabled ? '📹' : '';
                
                let hostControlsText = '';
                if (meeting.hostControls) {
                    const controls = [];
                    if (meeting.hostControls.canEndMeeting) controls.push('Can end');
                    if (meeting.hostControls.canMuteParticipants) controls.push('Can mute');
                    if (meeting.hostControls.canRemoveParticipants) controls.push('Can remove');
                    if (meeting.hostControls.canShareScreen) controls.push('Can share');
                    if (meeting.hostControls.canRecord) controls.push('Can record');
                    if (controls.length > 0) {
                        hostControlsText = `<p class="meeting-note" style="color:rgba(101,209,183,.8);font-size:.88rem;">🎛️ Host: ${controls.join(' • ')}</p>`;
                    }
                }
                
                return `
                    <article class="meeting-item">
                        <div class="meeting-item-top">
                            <div>
                                <strong>${meeting.title} ${recordingIcon}</strong>
                                <div class="meeting-meta">Host: ${meeting.host} | Code: ${meeting.roomCode} | Starts: ${formatMeetingTime(meeting.startsAt)} | Duration: ${durationText}</div>
                            </div>
                            <span class="pill">${meeting.status}</span>
                        </div>
                        ${note}
                        ${hostControlsText}
                        <div class="meeting-actions">
                            <button type="button" data-room="${meeting.roomCode}" data-action="join">Join here</button>
                            <button type="button" class="secondary" data-room="${meeting.roomCode}" data-action="focus">Open full screen</button>
                            <button type="button" class="secondary" data-room="${meeting.roomCode}" data-action="copy">Copy code</button>
                            ${canDelete ? `<button type="button" class="secondary" data-id="${meeting.id}" data-action="delete">Delete</button>` : ''}
                        </div>
                    </article>
                `;
            }).join('');
        }

        async function refreshMeetings() {
            try {
                const meetings = await fetchMeetings();
                renderMeetings(meetings);
            } catch (error) {
                showMessage(error.message || 'Could not load meetings.', false);
            }
        }

        async function handleScheduleMeeting() {
            const host = localStorage.getItem('currentUsername') || '';
            const title = document.getElementById('scheduleTitle').value.trim();
            const roomCode = document.getElementById('scheduleCode').value.trim();
            const startsAt = document.getElementById('scheduleStartsAt').value;
            const note = document.getElementById('scheduleNote').value.trim();
            const recordingEnabled = document.getElementById('enableRecording').checked;
            
            const durationMode = document.querySelector('input[name="durationMode"]:checked').value;
            const durationMinutes = durationMode === 'unlimited' ? null : (Number(document.getElementById('durationMinutes').value) || null);

            const hostControls = {
                canEndMeeting: document.getElementById('hostControl_endMeeting').checked,
                canMuteParticipants: document.getElementById('hostControl_mute').checked,
                canRemoveParticipants: document.getElementById('hostControl_remove').checked,
                canShareScreen: document.getElementById('hostControl_share').checked,
                canRecord: document.getElementById('hostControl_record').checked
            };

            if (!host) {
                showMessage('Sign in first so the meeting knows who is hosting it.', false);
                return;
            }

            if (!startsAt) {
                showMessage('Choose a meeting date and time first.', false);
                return;
            }

            try {
                const meeting = await createScheduledMeeting({ 
                    host, 
                    title, 
                    roomCode, 
                    startsAt, 
                    note,
                    recordingEnabled,
                    durationMinutes,
                    hostControls
                });
                document.getElementById('scheduleTitle').value = '';
                document.getElementById('scheduleCode').value = '';
                document.getElementById('scheduleNote').value = '';
                document.getElementById('scheduleStartsAt').value = '';
                document.getElementById('roomName').value = meeting.roomCode;
                updateInvitePreview(meeting.roomCode);
                showMessage('Meeting scheduled.', true);
                await refreshMeetings();
            } catch (error) {
                showMessage(error.message || 'Could not schedule the meeting.', false);
            }
        }

        async function handleMeetingListClick(event) {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const action = button.getAttribute('data-action');
            const room = button.getAttribute('data-room') || '';
            const id = button.getAttribute('data-id') || '';

            if (action === 'join') {
                openMeetingFromCode(room, false);
                return;
            }

            if (action === 'focus') {
                openMeetingFromCode(room, true);
                return;
            }

            if (action === 'copy') {
                document.getElementById('roomName').value = room;
                await copyInviteLink();
                return;
            }

            if (action === 'delete' && id) {
                try {
                    await deleteScheduledMeeting(id);
                    showMessage('Meeting deleted.', true);
                    await refreshMeetings();
                } catch (error) {
                    showMessage(error.message || 'Could not delete the meeting.', false);
                }
            }
        }

        function updateProfileDisplay() {
            // Get the user from localStorage with proper fallbacks
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const username = localStorage.getItem('currentUsername');
            const fullName = localStorage.getItem('currentUser');
            
            // Determine display name (prefer username if logged in)
            let displayName = 'guest';
            if (isLoggedIn && username) {
                displayName = username;
            } else if (isLoggedIn && fullName) {
                displayName = fullName;
            }
            
            // Update the profile display
            const profileEl = document.getElementById('currentMeetingUser');
            if (profileEl) {
                profileEl.textContent = `Meeting profile: ${displayName}`;
            }
        }

        function initializeMeetingPage() {
            if (typeof checkLogin === 'function' && !checkLogin()) {
                return;
            }
            ensureFeatureAccess('meetings', { silent: true }).then((access) => {
                if (!access.allowed) {
                    document.querySelectorAll('.panel').forEach((panel, index) => {
                        if (index > 0) panel.style.display = 'none';
                    });
                    const locked = document.createElement('section');
                    locked.className = 'panel locked-card';
                    locked.innerHTML = `
                        <h2>Meetings are locked</h2>
                        <p>Upgrade to <strong>MAX</strong> in your profile to unlock AZHA Meetings.</p>
                        <a class="back-link" href="Profile.html">Open membership</a>
                    `;
                    document.querySelector('.shell').appendChild(locked);
                    return;
                }

                // Update profile display initially
                updateProfileDisplay();
                
                // Also listen for storage changes (for cross-tab session sync)
                window.addEventListener('storage', (e) => {
                    if (e.key === 'currentUsername' || e.key === 'currentUser' || e.key === 'isLoggedIn') {
                        updateProfileDisplay();
                    }
                });
                
                // Check if joining from focused meeting link
                const urlParams = new URLSearchParams(window.location.search);
                const meetingParam = urlParams.get('meeting');
                const hostParam = urlParams.get('host') === '1';
                
                if (meetingParam) {
                    document.getElementById('roomName').value = meetingParam;
                    document.getElementById('joinCodeInput').value = meetingParam;
                    document.getElementById('meetingTitle').textContent = `AZHA Meeting: ${meetingParam}`;
                    document.getElementById('meetingFrameWrap').style.display = 'block';
                    updateInvitePreview(meetingParam);
                    startAZHAMeeting(meetingParam, hostParam);
                    showMessage(hostParam ? 'Opening your host meeting...' : 'Joining meeting...', true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    const defaultRoom = buildMeetingName();
                    document.getElementById('roomName').value = defaultRoom;
                    document.getElementById('joinCodeInput').value = defaultRoom;
                    updateInvitePreview(defaultRoom);
                    refreshMeetings();
                }
            });
        }

        document.getElementById('joinEmbeddedBtn').addEventListener('click', openEmbeddedMeeting);
        document.getElementById('openFocusedBtn').addEventListener('click', openFocusedMeeting);
        document.getElementById('copyInviteBtn').addEventListener('click', copyInviteLink);
        document.getElementById('joinCodeBtn').addEventListener('click', () => openMeetingFromCode(document.getElementById('joinCodeInput').value, false));
        document.getElementById('joinCodeFocusedBtn').addEventListener('click', () => openMeetingFromCode(document.getElementById('joinCodeInput').value, true));
        document.getElementById('scheduleMeetingBtn').addEventListener('click', handleScheduleMeeting);
        document.getElementById('scheduledMeetings').addEventListener('click', handleMeetingListClick);
        document.getElementById('roomName').addEventListener('input', () => updateInvitePreview());
        
        document.querySelectorAll('input[name="durationMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const minutesInput = document.getElementById('durationMinutes');
                minutesInput.disabled = e.target.value === 'unlimited';
                if (e.target.value === 'unlimited') {
                    minutesInput.value = '';
                }
            });
        });
        
        // Initialize page after all event listeners are set up
        try {
            initializeMeetingPage();
        } catch (error) {
            console.error('Error initializing meeting page:', error);
            // Continue anyway so buttons still work
        }
    
