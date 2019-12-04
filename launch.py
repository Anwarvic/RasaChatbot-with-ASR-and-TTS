import os
import flask
import requests



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
		res = requests.post("http://localhost:5005/webhooks/rest/webhook", rasa_data)
		res = res.json()
		if res: break
	print(res)
	flask_response = app.response_class(response=flask.json.dumps(res),
										status=200,
										mimetype='application/json' )
	return flask_response



if __name__ == '__main__':
	app.run(host="0.0.0.0", debug=True, port=5000)