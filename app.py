from flask import Flask, render_template, request, redirect, url_for
import uuid

app = Flask(__name__)

meetings = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create_meeting', methods=['POST'])
def create_meeting():
    meeting_id = str(uuid.uuid4())
    meetings[meeting_id] = []
    return redirect(url_for('meeting', meeting_id=meeting_id))

@app.route('/join_meeting', methods=['POST'])
def join_meeting():
    meeting_id = request.form['meeting_id']
    if meeting_id in meetings:
        return redirect(url_for('meeting', meeting_id=meeting_id))
    return redirect(url_for('index'))

@app.route('/meeting/<meeting_id>')
def meeting(meeting_id):
    if meeting_id in meetings:
        return render_template('meeting.html', meeting_id=meeting_id)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, threaded=True)
