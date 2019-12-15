import os
import time
import flask
import requests
import librosa
import numpy as np
from io import BytesIO
from scipy.io import wavfile 
from pydub import AudioSegment
from base64 import b64encode, b64decode

from asr import ASR
from tts import TTS
from utils import parse_yaml



app = flask.Flask(__name__)

@app.route('/')
def index():
	return flask.render_template("index.html")


@app.route('/send_message', methods=['POST'])
def call_chatbot():
	"""
	This function does the following:
	- sends the given data to Rasa server running in the background
	- parse the server response, get the content.
	- if the tts is enabled, passes the text to the TTS
	- returns the result

	Given:
		the given data is on the following structure:
		{
			"useTTS": bool, 
			"text": str,
			"id": int
			}
		 }

	Returns:
		the returned object is on the following structure:
		[{ "id": int, "type": "image", "body": str},
		 { "id": int, "type": "text", "body": str, "snd": str },
		 ...
		]
	
	NOTE:
		"snd" key is passed only if TTS is enabled and the message type is text
	"""
	# prase the given data
	data = flask.json.loads(flask.request.data.decode('utf-8'))
	use_tts, text, current_id= data["useTTS"], data["text"], data["id"]
	
	result = []
	# call rasa: some requests get lost, loop till you get a response
	while(True):
		try:
			# rasa rest API
			url = "http://localhost:5005/webhooks/rest/webhook"
			# rasa request must have a "sender" and "message" keys
			res = requests.post(
					url=url,
					data=flask.json.dumps({"sender": "Rasa", "message": text}),
					timeout=5).json()
		except:
			# mimic the rasa response when something wrong happens
			res = [{'recipient_id': 'Rasa',
					'text': "[SOMETHING WENT WRONG!!]"}]
		if res: break
	print(res)
	for item in res:
		d = {}
		current_id += 1
		d["id"] = current_id
		d["type"] =  "text" if "text" in item.keys() else "image"
		d["body"] = item[d["type"]]
		if use_tts and d["type"] == "text":
			tic = time.time()
			wav, sr = tts_model.synthesize(d["body"])
			# convert wav from float32 to int16
			wav = (wav * np.iinfo(np.int16).max).astype(np.int16)
			# write the wav into temporary file
			wavfile.write(".tmp.wav", sr, wav)
			# read the bytes
			with open(".tmp.wav", "rb") as fin:
				wav = fin.read()
			# remove tmp file
			os.remove(".tmp.wav")
			# convert it to base64 bytes
			bytes_stream = b64encode(wav)
			# decode bytes into string to be JSON serializable
			processed_string = bytes_stream.decode("utf-8")
			# pass the string
			d["snd"] = processed_string
			toc = time.time()
			print( "TTS Duration: {} seconds".format(toc-tic) )
		
		
		result.append(d)

	# get back the result
	flask_response = app.response_class(response=flask.json.dumps(result),
										status=200,
										mimetype='application/json' )
	return flask_response



@app.route('/send_audio_msg', methods=['POST'])
def call_asr():
	tic = time.time()
	req = flask.request.data.decode("utf-8")
	header, *bytes_stream = req.split(',')
	if bytes_stream:
		bytes_stream = b64decode(bytes_stream[0])
		audio = AudioSegment.from_file(BytesIO(bytes_stream))
		# convert it to numpy
		data = np.frombuffer(audio._data, dtype=np.int32)
		# change type to np.int16 by dropping bottom 16 bits
		data = (data>>16).astype(np.int16)
		# change type to np.float32
		data = data.astype('float32') / np.iinfo(np.int16).max  # normalize audio
		# change sample rate from 48000 to 16000
		data = librosa.core.resample(data, 48000, 16000)
		# transcribe the provided data
		out = asr_model.transcribe(data)
		toc = time.time()
		print( "ASR Duration: {} seconds".format(toc-tic) )
	else:
		out = " "
	# form response
	flask_response = app.response_class(response=flask.json.dumps({"text": out}),
										status=200,
										mimetype='application/json' )
	return flask_response
	





if __name__ == '__main__':
	conf = parse_yaml("conf.yaml")
	
	# load ASR model
	asr_conf = conf["asr"]
	asr_model = ASR(asr_conf)

	# load TTS model
	tts_conf = conf["tts"]
	tts_model = TTS(tts_conf)

	# run server
	app.run(host="0.0.0.0", port=5000)