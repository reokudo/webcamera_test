import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room, emit
import random
import string

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

meetings = {}

def generate_id(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create_meeting', methods=['POST'])
def create_meeting():
    try:
        meeting_id = generate_id()
        user_id = generate_id()
        meetings[meeting_id] = {
            'host': user_id,
            'participants': [user_id]
        }
        print(f"Created meeting with ID: {meeting_id} and host user ID: {user_id}")
        return jsonify({'meeting_id': meeting_id, 'user_id': user_id})
    except Exception as e:
        print(f"Error creating meeting: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/join_meeting', methods=['POST'])
def join_meeting():
    meeting_id = request.form.get('meeting_id')
    print(f"Received join request for meeting_id: {meeting_id}")
    if meeting_id in meetings:
        user_id = generate_id()
        meetings[meeting_id]['participants'].append(user_id)
        print(f"User {user_id} joined meeting {meeting_id}")
        return jsonify({'meeting_id': meeting_id, 'user_id': user_id})
    else:
        print(f"Meeting ID {meeting_id} not found")
        return jsonify({'error': 'Meeting ID not found'}), 404

@app.route('/meeting/<meeting_id>/<user_id>')
def meeting(meeting_id, user_id):
    if meeting_id in meetings and user_id in meetings[meeting_id]['participants']:
        return render_template('meeting.html', meeting_id=meeting_id, user_id=user_id)
    else:
        return "Meeting not found or user not in meeting", 404

@app.route('/leave_meeting', methods=['POST'])
def leave_meeting():
    meeting_id = request.form.get('meeting_id')
    user_id = request.form.get('user_id')
    if meeting_id in meetings:
        if user_id in meetings[meeting_id]['participants']:
            meetings[meeting_id]['participants'].remove(user_id)
        if not meetings[meeting_id]['participants']:
            del meetings[meeting_id]
    return '', 204

@socketio.on('join')
def handle_join(data):
    try:
        room = data['room']
        user_id = data['user_id']
        print(f"User {user_id} is joining room {room}")
        join_room(room)
        emit('user_joined', {'user_id': user_id}, room=room)
    except Exception as e:
        print(f"Error in join event: {e}")

@socketio.on('leave')
def handle_leave(data):
    try:
        room = data['room']
        user_id = data['user_id']
        print(f"User {user_id} is leaving room {room}")
        leave_room(room)
        emit('user_left', {'user_id': user_id}, room=room)
    except Exception as e:
        print(f"Error in leave event: {e}")

@socketio.on('offer')
def handle_offer(data):
    try:
        room = data['room']
        offer = data['offer']
        source = data['source']
        print(f"Received offer from {source} in room {room}")
        emit('offer', {'offer': offer, 'source': source, 'target': data['target']}, room=room)
    except Exception as e:
        print(f"Error in offer event: {e}")

@socketio.on('answer')
def handle_answer(data):
    try:
        room = data['room']
        answer = data['answer']
        source = data['source']
        print(f"Received answer from {source} in room {room}")
        emit('answer', {'answer': answer, 'source': source, 'target': data['target']}, room=room)
    except Exception as e:
        print(f"Error in answer event: {e}")

@socketio.on('ice_candidate')
def handle_ice_candidate(data):
    try:
        room = data.get('room')
        candidate = data.get('candidate')
        source = data.get('source')
        print(f"Received ICE candidate from {source} in room {room}")
        emit('ice_candidate', {'candidate': candidate, 'source': source, 'target': data.get('target')}, room=room)
    except Exception as e:
        print(f"Error in ice_candidate event: {e}")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8000)
