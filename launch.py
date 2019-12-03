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



# @app.route('/', methods=['POST'])
# def my_form_post():
# 	text = request.form['search_query']
# 	return redirect(url_for('elastic_query', query_text=text))


# @app.route('/query/<query_text>')
# def elastic_query(query_text):
# 	hits = es_search(ES, query_text)
# 	query_out = [hit['_source'] for hit in hits]
# 	res = render_template('result.html', 
# 						  query_text=query_text,
# 						  toPass=query_out)
# 	return res




# @app.route('/movie/<id_>')
# def chart(id_):
# 	hits = es_search(ES, id_)
# 	out = hits[0]['_source']
# 	return render_template('dashboard.html',
# 							movie_name = out['movie_name'],
# 							tones=out['average_tones'],
# 							tweets = out['tweets'])






if __name__ == '__main__':
	app.run(host="0.0.0.0", debug = True, port=5000)