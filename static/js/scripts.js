const constraints = {
    video: true,
    audio: true
};

navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        document.getElementById('videos').appendChild(videoElement);
        // WebRTC logic to connect with other participants
    })
    .catch((error) => {
        console.error('Error accessing media devices.', error);
    });
