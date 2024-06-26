document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const videosContainer = document.getElementById('videos');
    const peers = {};
    const iceCandidatesQueue = {};
    let localStream;

    // Get local media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            addVideoStream(localStream, userId, true); // 自分の映像にはmutedを追加

            socket.emit('join', { room: meetingId, user_id: userId });

            socket.on('user_joined', (data) => {
                console.log(`User joined: ${data.user_id}`);
                if (data.user_id !== userId) {
                    callUser(data.user_id);
                }
            });

            socket.on('user_left', (data) => {
                console.log(`User left: ${data.user_id}`);
                removeVideoStream(data.user_id);
                if (peers[data.user_id]) {
                    peers[data.user_id].close();
                    delete peers[data.user_id];
                }
            });

            socket.on('offer', async (data) => {
                console.log(`Received offer from ${data.source}`);
                if (data.target === userId) {
                    const peer = createPeer(data.source, false);
                    peers[data.source] = peer;
                    await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    socket.emit('answer', {
                        room: meetingId,
                        target: data.source,
                        source: userId,
                        answer: peer.localDescription
                    });

                    // Add any queued ICE candidates
                    if (iceCandidatesQueue[data.source]) {
                        for (const candidate of iceCandidatesQueue[data.source]) {
                            await peer.addIceCandidate(new RTCIceCandidate(candidate));
                        }
                        delete iceCandidatesQueue[data.source];
                    }
                }
            });

            socket.on('answer', async (data) => {
                console.log(`Received answer from ${data.source}`);
                if (data.target === userId) {
                    const peer = peers[data.source];
                    await peer.setRemoteDescription(new RTCSessionDescription(data.answer));

                    // Add any queued ICE candidates
                    if (iceCandidatesQueue[data.source]) {
                        for (const candidate of iceCandidatesQueue[data.source]) {
                            await peer.addIceCandidate(new RTCIceCandidate(candidate));
                        }
                        delete iceCandidatesQueue[data.source];
                    }
                }
            });

            socket.on('ice_candidate', async (data) => {
                console.log(`Received ICE candidate from ${data.source}`);
                if (data.target === userId) {
                    const peer = peers[data.source];
                    if (peer.remoteDescription) {
                        await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } else {
                        if (!iceCandidatesQueue[data.source]) {
                            iceCandidatesQueue[data.source] = [];
                        }
                        iceCandidatesQueue[data.source].push(data.candidate);
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error accessing media devices:', error);
        });

        function addVideoStream(stream, userId, muted = false) {
            console.log(`Adding video stream for user ${userId}, muted=${muted}`);
            const existingVideoContainer = document.getElementById(`video_container_${userId}`);
            if (existingVideoContainer) {
                existingVideoContainer.remove();
            }
    
            const videoContainer = document.createElement('div');
            videoContainer.id = `video_container_${userId}`;
            videoContainer.classList.add('video-container');
    
            const video = document.createElement('video');
            video.srcObject = stream;
            video.id = `video_${userId}`;
            video.autoplay = true;
            video.playsInline = true;
            if (muted) {
                video.muted = true;
            }
    
            const label = document.createElement('div');
            label.classList.add('video-label');
            label.innerText = userId;
    
            videoContainer.appendChild(video);
            videoContainer.appendChild(label);
            videosContainer.appendChild(videoContainer);
        }
    
        function removeVideoStream(userId) {
            console.log(`Removing video stream for user ${userId}`);
            const videoContainer = document.getElementById(`video_container_${userId}`);
            if (videoContainer) {
                videoContainer.remove();
            }
        }

    function createPeer(targetUserId, initiator) {
        console.log(`Creating peer for ${targetUserId} as initiator: ${initiator}`);
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`Sending ICE candidate to ${targetUserId}`);
                socket.emit('ice_candidate', {
                    room: meetingId,
                    target: targetUserId,
                    source: userId,
                    candidate: event.candidate
                });
            }
        };

        peer.ontrack = (event) => {
            console.log(`Adding track from ${targetUserId}`);
            addVideoStream(event.streams[0], targetUserId);
        };

        localStream.getTracks().forEach(track => {
            console.log(`Adding track to peer for ${targetUserId}`);
            peer.addTrack(track, localStream);
        });

        if (initiator) {
            peer.createOffer()
                .then(offer => {
                    console.log(`Created offer: ${JSON.stringify(offer)}`);
                    return peer.setLocalDescription(offer);
                })
                .then(() => {
                    console.log(`Sending offer to ${targetUserId}`);
                    socket.emit('offer', {
                        room: meetingId,
                        target: targetUserId,
                        source: userId,
                        offer: peer.localDescription
                    });
                });
        }

        return peer;
    }

    function callUser(targetUserId) {
        console.log(`Calling user: ${targetUserId}`);
        const peer = createPeer(targetUserId, true);
        peers[targetUserId] = peer;
    }

    document.getElementById('leaveMeetingBtn').addEventListener('click', () => {
        console.log('Leaving meeting');
        socket.emit('leave', { room: meetingId, user_id: userId });
        window.location.href = '/';
    });
});
