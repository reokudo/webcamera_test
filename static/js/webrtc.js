async function startWebRTC(meetingId) {
    const localVideo = document.getElementById('localVideo');
    const remoteVideos = document.getElementById('remoteVideos');
    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
    localVideo.srcObject = localStream;
    
    const peerConnections = {};
    
    // WebSocket connection for signaling
    const socket = new WebSocket(`wss://${window.location.host}/ws/${meetingId}`);
    
    socket.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        
        switch (data.type) {
            case 'offer':
                const pc = createPeerConnection(data.from);
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.send(JSON.stringify({ type: 'answer', to: data.from, answer: answer }));
                break;
            case 'answer':
                await peerConnections[data.from].setRemoteDescription(new RTCSessionDescription(data.answer));
                break;
            case 'candidate':
                await peerConnections[data.from].addIceCandidate(new RTCIceCandidate(data.candidate));
                break;
            case 'leave':
                if (peerConnections[data.from]) {
                    peerConnections[data.from].close();
                    delete peerConnections[data.from];
                }
                break;
        }
    };
    
    function createPeerConnection(id) {
        const pc = new RTCPeerConnection();
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({ type: 'candidate', to: id, candidate: event.candidate }));
            }
        };
        
        pc.ontrack = (event) => {
            const remoteVideo = document.createElement('video');
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.autoplay = true;
            remoteVideos.appendChild(remoteVideo);
        };
        
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        
        peerConnections[id] = pc;
        return pc;
    }
    
    // Handling new user joining
    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', id: meetingId }));
    };
}
