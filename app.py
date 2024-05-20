import os
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

meetings = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/meeting/<meeting_id>/<user_id>')
def meeting(meeting_id, user_id):
    return render_template('meeting.html', meeting_id=meeting_id, user_id=user_id)

@app.route('/create_meeting', methods=['POST'])
def create_meeting():
    meeting_id = os.urandom(4).hex()
    user_id = os.urandom(4).hex()
    meetings[meeting_id] = [user_id]
    return jsonify({'meeting_id': meeting_id, 'user_id': user_id})

@app.route('/join_meeting', methods=['POST'])
def join_meeting():
    data = request.json
    meeting_id = data['meeting_id']
    user_id = os.urandom(4).hex()
    if meeting_id in meetings:
        meetings[meeting_id].append(user_id)
        return jsonify({'meeting_id': meeting_id, 'user_id': user_id})
    else:
        return jsonify({'error': 'Meeting not found'}), 404

@socketio.on('join')
def on_join(data):
    room = data['meeting_id']
    user_id = data['user_id']
    join_room(room)
    emit('user-joined', {'userId': user_id}, room=room)
    print(f'User {user_id} is joining room {room}')

@socketio.on('offer')
def on_offer(data):
    room = data['target']
    emit('offer', data, room=room)
    print(f'Received offer from {data["source"]} in room {room}')

@socketio.on('answer')
def on_answer(data):
    room = data['target']
    emit('answer', data, room=room)
    print(f'Received answer from {data["source"]} in room {room}')

@socketio.on('ice-candidate')
def on_ice_candidate(data):
    room = data['target']
    emit('ice-candidate', data, room=room)
    print(f'Received ICE candidate from {data["source"]} in room {room}')

if __name__ == '__main__':
    socketio.run(app, debug=True)
