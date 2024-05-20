document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const videosContainer = document.getElementById('videos');
    const peers = {};
    let localStream;

    // Get local media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            addVideoStream(localStream, userId);

            socket.emit('join', { room: meetingId, user_id: userId });

            socket.on('user_joined', (data) => {
                if (data.user_id !== userId) {
                    callUser(data.user_id);
                }
            });

            socket.on('user_left', (data) => {
                removeVideoStream(data.user_id);
                if (peers[data.user_id]) {
                    peers[data.user_id].close();
                    delete peers[data.user_id];
                }
            });

            socket.on('offer', async (data) => {
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
                }
            });

            socket.on('answer', async (data) => {
                if (data.target === userId) {
                    const peer = peers[data.source];
                    await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
                }
            });

            socket.on('ice_candidate', async (data) => {
                if (data.target === userId) {
                    const peer = peers[data.source];
                    await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            });
        })
        .catch(error => {
            console.error('Error accessing media devices:', error);
        });

    function addVideoStream(stream, userId) {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.id = `video_${userId}`;
        video.autoplay = true;
        video.playsInline = true;
        videosContainer.appendChild(video);
    }

    function removeVideoStream(userId) {
        const video = document.getElementById(`video_${userId}`);
        if (video) {
            video.remove();
        }
    }

    function createPeer(targetUserId, initiator) {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice_candidate', {
                    room: meetingId,
                    target: targetUserId,
                    source: userId,
                    candidate: event.candidate
                });
            }
        };

        peer.ontrack = (event) => {
            addVideoStream(event.streams[0], targetUserId);
        };

        localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

        if (initiator) {
            peer.createOffer()
                .then(offer => peer.setLocalDescription(offer))
                .then(() => {
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
        const peer = createPeer(targetUserId, true);
        peers[targetUserId] = peer;
    }

    document.getElementById('leaveMeetingBtn').addEventListener('click', () => {
        socket.emit('leave', { room: meetingId, user_id: userId });
        window.location.href = '/';
    });
});
