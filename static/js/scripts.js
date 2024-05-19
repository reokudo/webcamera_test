document.getElementById('createMeetingBtn').addEventListener('click', () => {
    fetch('/create_meeting', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            const { meeting_id, user_id } = data;
            window.location.href = `/meeting/${meeting_id}/${user_id}`;
        });
});

document.getElementById('leaveMeetingBtn').addEventListener('click', () => {
    const formData = new FormData();
    formData.append('meeting_id', meetingId);
    formData.append('user_id', userId);
    fetch('/leave_meeting', { method: 'POST', body: formData })
        .then(() => {
            window.location.href = '/';
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
