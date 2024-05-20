// Initialize local media stream
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        document.getElementById('localVideo').srcObject = stream;
        localStream = stream;
        console.log('Local Stream:', stream);

        // Add tracks to each peer connection
        for (const peerId in peers) {
            stream.getTracks().forEach(track => peers[peerId].addTrack(track, stream));
            console.log('Adding track to peer:', peerId);
        }
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });

socket.on('user-joined', data => {
    console.log('User joined:', data.userId);

    // Create a new peer connection
    const peer = new RTCPeerConnection(configuration);
    peers[data.userId] = peer;
    console.log('Creating peer for:', data.userId);

    // Add tracks from local stream to peer connection
    localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
    console.log('Adding tracks from local stream to peer for:', data.userId);

    // Handle ice candidate event
    peer.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                target: data.userId,
                candidate: event.candidate
            });
            console.log('Sending ICE candidate to:', data.userId);
        }
    };

    // Handle track event
    peer.ontrack = event => {
        console.log('Adding track from:', data.userId);
        event.streams.forEach(stream => {
            console.log('Event streams:', stream);
            const remoteVideo = document.createElement('video');
            remoteVideo.srcObject = stream;
            remoteVideo.autoplay = true;
            remoteVideo.id = `video-${data.userId}`;
            document.body.appendChild(remoteVideo);
            console.log('Added video element for user:', data.userId);
        });
    };

    // Create and send an offer to the new user
    peer.createOffer()
        .then(offer => {
            return peer.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit('offer', {
                target: data.userId,
                offer: peer.localDescription
            });
            console.log('Sending offer to:', data.userId);
        })
        .catch(error => {
            console.error('Error creating offer:', error);
        });
});

// Handle incoming offer
socket.on('offer', data => {
    console.log('Received offer from:', data.source);

    const peer = new RTCPeerConnection(configuration);
    peers[data.source] = peer;
    console.log('Creating peer for:', data.source);

    // Add tracks from local stream to peer connection
    localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
    console.log('Adding tracks from local stream to peer for:', data.source);

    // Handle ice candidate event
    peer.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                target: data.source,
                candidate: event.candidate
            });
            console.log('Sending ICE candidate to:', data.source);
        }
    };

    // Handle track event
    peer.ontrack = event => {
        console.log('Adding track from:', data.source);
        event.streams.forEach(stream => {
            console.log('Event streams:', stream);
            const remoteVideo = document.createElement('video');
            remoteVideo.srcObject = stream;
            remoteVideo.autoplay = true;
            remoteVideo.id = `video-${data.source}`;
            document.body.appendChild(remoteVideo);
            console.log('Added video element for user:', data.source);
        });
    };

    peer.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(() => {
            return peer.createAnswer();
        })
        .then(answer => {
            return peer.setLocalDescription(answer);
        })
        .then(() => {
            socket.emit('answer', {
                target: data.source,
                answer: peer.localDescription
            });
            console.log('Sending answer to:', data.source);
        })
        .catch(error => {
            console.error('Error handling offer:', error);
        });
});

// Handle incoming answer
socket.on('answer', data => {
    console.log('Received answer from:', data.source);
    peers[data.source].setRemoteDescription(new RTCSessionDescription(data.answer))
        .then(() => {
            console.log('Answer set successfully for:', data.source);
        })
        .catch(error => {
            console.error('Error setting remote description from answer:', error);
        });
});

// Handle incoming ICE candidate
socket.on('ice-candidate', data => {
    console.log('Received ICE candidate from:', data.source);
    peers[data.source].addIceCandidate(new RTCIceCandidate(data.candidate))
        .then(() => {
            console.log('ICE candidate added successfully for:', data.source);
        })
        .catch(error => {
            console.error('Error adding received ICE candidate:', error);
        });
});
