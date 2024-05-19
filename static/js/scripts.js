document.getElementById('createMeetingBtn').addEventListener('click', () => {
    fetch('/create_meeting', { method: 'POST' })
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

if (window.location.pathname.includes('/meeting/')) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.id = `video_${userId}`;
            video.autoplay = true;
            document.getElementById('videos').appendChild(video);
        });
}
