const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');
let localStream;
let peers = {};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;
        localStream = stream;
        socket.emit('ready', { meeting_id: meetingId });
    })
    .catch(error => console.error('Error accessing media devices.', error));

socket.on('join_announcement', data => {
    console.log('A new user joined:', data);
    // ここでPeerConnectionを作成し、メディアストリームを接続する処理を追加
});

socket.on('leave_announcement', data => {
    console.log('A user left:', data);
    // ここでPeerConnectionを削除し、映像を削除する処理を追加
});
