import os
import time
import flask
import requests
import numpy as np
# from scipy.io import wavfile

from asr import ASR
from tts import TTS
from utils import *




app = flask.Flask(__name__)

@app.route('/')
def index():
	# check existence of ASR pretrained models
	mdls = ["an4_pretrained_v2.pth", "librispeech_pretrained_v2.pth",
			  "ted_pretrained_v2.pth"]
	asr_enabled = any([mdl in os.listdir("./asr/models") for mdl in mdls]) and \
				  "asr_model" in globals()
	
	# check existence of TTS pretrained models
	wavgan_model = "ljspeech.parallel_wavegan.v1"
	mdls = ["fastspeech", "tacotron2", "transformer"]
	tts_enabled = wavgan_model in os.listdir("./tts/models") and \
			any([mdl in os.listdir("./tts/models") for mdl in mdls]) and \
			"tts_model" in globals()
	
	return flask.render_template("index.html",
								 asr_enabled = asr_enabled,
								 tts_enabled = tts_enabled,
								 show_menu = tts_enabled or asr_enabled)




@app.route('/send_message', methods=['POST'])
def call_chatbot():
	"""
	This function is called using a POST request and this function does the
	following:
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
			d["snd"] = wav.tolist()
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
	"""
	This function is called using a POST request passing base64 string of webm 
	audio encoded using opus codecs. And this function parses this string and
	extract the audio to be transcribed using the ASR model. After that, the
	data is being sent back to the frontend as a JSON object like the following:
	{"text": str}
	NOTE:
	if the audio is silent or the ASR couldn't transcribe, then an empty string 
	is sent instead.
	"""
	tic = time.time()
	req = flask.request.data.decode("utf-8")
	audio_arr = flask.json.loads(req)["data"]
	wav = np.array(audio_arr, np.float32)
	# normalize ([-1:1] normalization)
	wav = normalize_audio(wav, method="-1_1")
	# reduce noise (comment it to make ASR a bit faster)
	wav = reduce_noise(wav, method="wiener")
	# write the recorded audio (for debugging reasons)
	# wavfile.write(filename="recorded.wav", rate=16000, data=wav)
	# transcribe the provided data
	out = asr_model.transcribe(wav)
	toc = time.time()
	print( "ASR Duration: {} seconds".format(toc-tic) )
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