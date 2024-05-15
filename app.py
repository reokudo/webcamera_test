# app.py
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, send
import uuid
import qrcode
import io
import base64

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# 会議データを保持する簡易データベース
meetings = {}

# トップページ
@app.route('/')
def index():
    return render_template('index.html')

# 新しい会議の作成
@app.route('/create_meeting', methods=['POST'])
def create_meeting():
    meeting_id = str(uuid.uuid4())
    meeting_url = request.host_url + 'meeting/' + meeting_id
    meetings[meeting_id] = {'url': meeting_url, 'comments': []}
    return jsonify({'meeting_id': meeting_id, 'meeting_url': meeting_url})

# 会議への参加
@app.route('/meeting/<meeting_id>')
def meeting(meeting_id):
    if meeting_id not in meetings:
        return "Meeting not found", 404

    # 会議URLのQRコード生成
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(meetings[meeting_id]['url'])
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    byte_io = io.BytesIO()
    img.save(byte_io, 'PNG')
    byte_io.seek(0)
    qr_img_data = base64.b64encode(byte_io.read()).decode('utf-8')  # Base64エンコード

    return render_template('meeting.html', meeting_id=meeting_id, qr_img_data=qr_img_data)

# コメントの送信
@app.route('/comment', methods=['POST'])
def post_comment():
    meeting_id = request.form['meeting_id']
    comment = request.form['comment']
    if meeting_id in meetings:
        meetings[meeting_id]['comments'].append(comment)
        socketio.emit('new_comment', {'meeting_id': meeting_id, 'comment': comment})
        return jsonify({'status': 'success'})
    return jsonify({'status': 'failed'})

# コメントの取得
@app.route('/get_comments/<meeting_id>')
def get_comments(meeting_id):
    if meeting_id in meetings:
        return jsonify(meetings[meeting_id]['comments'])
    return jsonify([])

# WebSocketイベントハンドラー
@socketio.on('message')
def handle_message(message):
    send(message, broadcast=True)

if __name__ == '__main__':
    #app.run(host = '0.0.0.0',ssl_context=("server.crt","server.key"),debug=True,port=5001, threaded=True)
    app.run(host = '0.0.0.0',debug=True,threaded=True)
