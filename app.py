from serial import Serial
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, send, emit
from celery import Celery
import RPi.GPIO as GPIO

ser = Serial('/dev/ttyS0', 115200, timeout=None)
app = Flask(__name__)
app.config.update(CELERY_CONFIG={
    'broker_url': 'redis://localhost:6379',
    'result_backend': 'redis://localhost:6379',
})
socketio = SocketIO(app)

def make_celery(flask_app):
    celery = Celery(flask_app.import_name)
    celery.conf.update(flask_app.config["CELERY_CONFIG"])

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with flask_app.app_context():
                return self.run(*args, **kwargs)
    celery.Task = ContextTask
    return celery

celery = make_celery(app)

GPIO.setmode(GPIO.BCM)
GPIO.setup(4, GPIO.OUT)
GPIO.output(4, GPIO.HIGH)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/auton-replay')
def auton_replay_page():
    return render_template("auton-replay.html")

@app.route('/auton-generator')
def auton_generator_page():
    return render_template("auton-generator.html")

@app.route('/motion-profile')
def motion_profile_page():
    return render_template('motion-profile.html')

@app.route('/macro-editor')
def macro_editor_page():
    return render_template('macro-editor.html')


@socketio.on("request-auton")
def send_auton(ign):
    step = ""
    path_str = ""
    ser.write("GETAUTON".encode())
    while step != "END":
        step = ser.read_until().decode().strip()
        if step == "PATH_BEGIN":
            path_str = "PATH_BEGIN\n"
            while step != "OLD_PATH_END":
                step = ser.read_until().decode().strip()
            for i in range(9):
                step = ser.read_until().decode().strip()
            while step != "PATH_END":
                step = ser.read_until().decode().strip()
                path_str += step + "\n"
            step = path_str
        socketio.emit("receive-auton", step)

@socketio.on("live-auton")
def live_auton(ign):
    step = ""
    path_str = ""
    break_live = False
    while step != "AUTONBEGIN" and not break_live:
        step = ser.read_until().decode().strip()
    while step != "END" and not break_live:
        step = ser.read_until().decode().strip()
        if step == "PATH_BEGIN":
            path_str = "PATH_BEGIN\n"
            while step != "OLD_PATH_END":
                step = ser.read_until().decode().strip()
            for i in range(9):
                step = ser.read_until().decode().strip()
            while step != "PATH_END":
                step = ser.read_until().decode().strip()
                path_str += step + "\n"
            step = path_str.strip()
        socketio.emit("receive-live-auton", step)

@socketio.on("stop-live-auton")
def stop_live_auton(ign):
    break_live = True

@socketio.on("request-auton-paths")
def send_auton_paths(ign):
    socketio.emit("clear-paths", "")
    path = ""
    ser.write("GETPATHS".encode())
    while path != "END":
        path = ser.read_until().decode().strip()
        socketio.emit("receive-auton-path", path)

@socketio.on("request-auton-file")
def send_auton_file(msg):
    line = ""
    ser.write(("GETFILE(" + msg + ")").encode())
    while line != "END":
        line = ser.read_until().decode().strip()
        if line != "":
            socketio.emit("receive-auton-file", line)

@socketio.on("request-motors")
def send_motors(ign):
    line = ""
    ser.write("GETMOTORS".encode())
    while line != "END":
        line = ser.read_until().decode().strip()
        if line != "":
            socketio.emit("receive-motor", line)

@socketio.on("finished-receiving")
def begin_editing(ign):
    socketio.emit("begin-auton-editing", "")

if __name__ == '__main__':
    socketio.run(app)
