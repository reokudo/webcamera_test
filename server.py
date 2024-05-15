from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, send, emit
import eventlet

eventlet.monkey_patch()

app = Flask(__name__)
app.config['SECRET_KEY'] = "sgfjaklgjakcjkfdjfkldj"#'your_secret_key'
socketio = SocketIO(app)

rooms = {}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('create_or_join')
def on_create_or_join(data):
    room = data['room']
    if room not in rooms:
        rooms[room] = []
    if request.sid not in rooms[room]:
        rooms[room].append(request.sid)
    join_room(room)
    emit('joined', {'sid': request.sid, 'room': room}, room=room)
    print(f'{request.sid} has joined the room {room}')

@socketio.on('leave')
def on_leave(data):
    room = data['room']
    if room in rooms:
        if request.sid in rooms[room]:
            rooms[room].remove(request.sid)
            leave_room(room)
            emit('left', {'sid': request.sid, 'room': room}, room=room)
            print(f'{request.sid} has left the room {room}')
            if not rooms[room]:
                del rooms[room]

@socketio.on('message')
def on_message(data):
    room = data['room']
    emit('message', data, room=room)

if __name__ == '__main__':
    app.run(host = '0.0.0.0',ssl_context=("server.crt","server.key"),debug=True,port=5001, threaded=True)