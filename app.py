import os
import flask
import requests
import librosa
import numpy as np
from io import BytesIO
from base64 import b64decode
from scipy import signal
from scipy.io import wavfile
from pydub import AudioSegment
from utils import parse_yaml
from asr import ASR

app = flask.Flask(__name__)


@app.route('/')
def index():
	return flask.render_template("index.html")


@app.route('/send_message', methods=['POST'])
def call_chatbot():
	# send message to Rasa 
	msg = flask.request.data.decode('utf-8')
	rasa_data = flask.json.dumps({"sender": "Rasa", "message": msg})
	# some requests get lost, loop till you get a response
	while(True):
		try:
			res = requests.post(url="http://localhost:5005/webhooks/rest/webhook",
								data=rasa_data,
								timeout=5)
			res = res.json()
		except:
			res = [{'recipient_id': 'Rasa',
					'text': "[Something went wrong, we didn't get any response]"}]
		if res: break
	print(res)
	flask_response = app.response_class(response=flask.json.dumps(res),
										status=200,
										mimetype='application/json' )
	return flask_response



@app.route('/send_audio_msg', methods=['POST'])
def call_asr():
	req = flask.request.data
	header, *bytes_stream = req.split(b',')
	if bytes_stream:
		bytes_stream = b64decode(bytes_stream[0])
		audio = AudioSegment.from_file(BytesIO(bytes_stream))
		# convert it to numpy
		data = np.frombuffer(audio._data, dtype=np.int32)
		# change type to np.int16 by dropping bottom 16 bits
		# data = (data>>16).astype(np.int16)
		# change type to np.float32
		data = data.astype('float32') / np.iinfo(np.int32).max  # normalize audio
		# change sample rate from 48000 to 16000
		data = librosa.core.resample(data, 48000, 16000)
		# transcribe the provided data
		out = asr_model.transcribe(data)
	else:
		out = " "
	# form response
	flask_response = app.response_class(response=flask.json.dumps({"text": out}),
										status=200,
										mimetype='application/json' )
	return flask_response
	



if __name__ == '__main__':
	# load ASR model
	asr_conf = parse_yaml("conf.yaml")
	asr_model = ASR(asr_conf)

	# run server
	app.run(host="0.0.0.0", port=5000)