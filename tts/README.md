# Install Requirements

You can follow these simple steps to install the TTS (Text-to-Speech) dependencies:

- Install requirements using `pip`
```
$ pip install -r requirements
```
- Install `punkt` package from NLTK
```
$ python
>>> import nltk
>>> nltk.download('punkt')
```

- Clone ESPN library and switch to branch where it supports Parallel WaveGAN:
```
$ git clone https://github.com/espnet/espnet.git
$ cd espnet && git fetch && git checkout -b v.0.6.0 8bfb7ac6974699e9720558a4ef20376805e38d6b
```
