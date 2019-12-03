import os
from flask import Flask, render_template


app = Flask(__name__)



@app.route('/')
def index():
	return render_template("index.html")



# @app.route('/static/<path:path>')
# def send_static_files(path):
# 	print('path is: ',path)
# 	return send_from_directory('/static', path)

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


# @app.route('/query/<query_text>', methods=['POST'])
# def result_form_post(query_text):
# 	text = request.form['search_query']
# 	return redirect(url_for('elastic_query', query_text=text))


# @app.route('/movie/<id_>')
# def chart(id_):
# 	hits = es_search(ES, id_)
# 	out = hits[0]['_source']
# 	return render_template('dashboard.html',
# 							movie_name = out['movie_name'],
# 							tones=out['average_tones'],
# 							tweets = out['tweets'])






if __name__ == '__main__':
	app.run(debug = True)