document.addEventListener('DOMContentLoaded', () => {
    const createMeetingBtn = document.getElementById('createMeetingBtn');
    const leaveMeetingBtn = document.getElementById('leaveMeetingBtn');
    const videosContainer = document.getElementById('videos');

    if (createMeetingBtn) {
        createMeetingBtn.addEventListener('click', () => {
            fetch('/create_meeting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.meeting_id && data.user_id) {
                    window.location.href = `/meeting/${data.meeting_id}/${data.user_id}`;
                } else {
                    console.error('Error creating meeting:', data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    }

    if (leaveMeetingBtn) {
        leaveMeetingBtn.addEventListener('click', () => {
            const formData = new FormData();
            formData.append('meeting_id', meetingId);
            formData.append('user_id', userId);
            fetch('/leave_meeting', {
                method: 'POST',
                body: formData
            })
            .then(() => {
                window.location.href = '/';
            });
        });
    }

    if (window.location.pathname.includes('/meeting/')) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                const video = document.createElement('video');
                video.srcObject = stream;
                video.id = `video_${userId}`;
                video.autoplay = true;
                video.playsInline = true;
                videosContainer.appendChild(video);

                // For testing purpose, adding a console log to check if stream is obtained
                console.log('Stream obtained:', stream);

                // Display a test video element with the stream
                const testVideo = document.createElement('video');
                testVideo.srcObject = stream;
                testVideo.autoplay = true;
                testVideo.playsInline = true;
                videosContainer.appendChild(testVideo);
            })
            .catch(error => {
                console.error('Error accessing media devices:', error);
            });
    }
});
