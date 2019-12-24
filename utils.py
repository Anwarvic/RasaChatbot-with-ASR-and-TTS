import yaml
import math
import numpy as np
from scipy.special import expn
from scipy.signal import wiener




def parse_yaml(filepath="conf.yaml"):
    """
    This method parses the YAML configuration file and returns the parsed info
    as python dictionary.
    Args:
        filepath (string): relative path of the YAML configuration file
    """
    with open(filepath, 'r') as fin:
        try:
            d = yaml.safe_load(fin)
            return d
        except Exception as exc:
            print("ERROR while parsing YAML conf.")
            return exc


# REF: https://github.com/rajivpoddar/logmmse/blob/master/logmmse.py
def logmmse(x, Srate, noise_frames=6, Slen=0, eta=0.15, saved_params=None):
    if Slen == 0:
        Slen = int(math.floor(0.02 * Srate))

    if Slen % 2 == 1:
        Slen = Slen + 1

    PERC = 50
    len1 = int(math.floor(Slen * PERC / 100))
    len2 = int(Slen - len1)

    win = np.hanning(Slen)
    win = win * len2 / np.sum(win)
    nFFT = 2 * Slen

    x_old = np.zeros(len1)
    Xk_prev = np.zeros(len1)
    Nframes = int(math.floor(len(x) / len2) - math.floor(Slen / len2))
    xfinal = np.zeros(Nframes * len2)

    if saved_params is None:
        noise_mean = np.zeros(nFFT)
        for j in range(0, Slen*noise_frames, Slen):
            noise_mean = noise_mean + \
                    np.absolute(np.fft.fft(win * x[j:j + Slen], nFFT, axis=0))
        noise_mu2 = (noise_mean / noise_frames) ** 2
    else:
        noise_mu2 = saved_params['noise_mu2']
        Xk_prev = saved_params['Xk_prev']
        x_old = saved_params['x_old']

    aa = 0.98
    mu = 0.98
    eta = 0.15
    ksi_min = 10 ** (-25 / 10)

    for k in range(0, Nframes*len2, len2):
        insign = win * x[k:k + Slen]

        spec = np.fft.fft(insign, nFFT, axis=0)
        sig = np.absolute(spec)
        sig2 = sig ** 2

        gammak = np.minimum(sig2 / noise_mu2, 40)

        if Xk_prev.all() == 0:
            ksi = aa + (1 - aa) * np.maximum(gammak - 1, 0)
        else:
            ksi = aa * Xk_prev / noise_mu2 + (1 - aa) * np.maximum(gammak - 1, 0)
            ksi = np.maximum(ksi_min, ksi)

        log_sigma_k = gammak * ksi/(1 + ksi) - np.log(1 + ksi)
        vad_decision = np.sum(log_sigma_k)/Slen
        if vad_decision < eta:
            noise_mu2 = mu * noise_mu2 + (1 - mu) * sig2

        A = ksi / (1 + ksi)
        vk = A * gammak
        ei_vk = 0.5 * expn(1, vk)
        hw = A * np.exp(ei_vk)
        sig = sig * hw
        Xk_prev = sig ** 2
        xi_w = np.fft.ifft(hw * spec, nFFT, axis=0)
        xi_w = np.real(xi_w)

        xfinal[k:k + len2] = x_old + xi_w[0:len1]
        x_old = xi_w[len1:Slen]

    return xfinal, {'noise_mu2': noise_mu2, 'Xk_prev': Xk_prev, 'x_old': x_old}


def reduce_noise(audio, method="wiener"):
    """
    Apply a certain method to reduce audio noise.
    Args:
        audio (numpy.array): the audio data as 1D numpy array
    Returns:
        numpy.array of the audio after reducing the noise
    NOTE: wiener is faster than logmmse
    """
    methods = ["logmmse", "wiener"]
    assert method in methods, \
        "noise-reduction method must be one of these " + str(methods)
    output = np.array([], dtype=np.float32)
    if method == "logmmse":
        sr = 16000 #sample rate
        # you can tune the following values
        initial_noise, window_size, noise_threshold = 6, 0, 0.15
        # number of frames per second
        chunk_size = 60*sr
        total_frames = audio.shape[0]
        frames_read = 0
        # iterate 1 second at a time
        while frames_read < total_frames:
            if frames_read + chunk_size > total_frames:
                frames = total_frames - frames_read
            else:
                frames = chunk_size
            audio_subsample = audio[frames_read:frames_read + frames]
            frames_read = frames_read + frames
            _output, _ = logmmse(audio_subsample, sr, initial_noise,
                                            window_size, noise_threshold)
            output = np.concatenate( (output, _output) )
    elif method == "wiener":
        output = wiener(audio)
    return output



def normalize_audio(audio, method="z-score"):
    """
    This method is used to normalize/scale the audio based on different 
    normalization methods. Normalization is important for the ASR model to treat
    loud audio as good as quite audio
    Args:
        audio (numpy.array): the audio data as 1D numpy array
        method (str): normalization method.. default (z-score)
    Returns:
        numpy.array of the audio data after normalization
    NOTE:
    "-1_1" normalization is a special case of min-max normalization where the
    min is -1 and the max is 1
    REF:
    https://en.wikipedia.org/wiki/Normalization
    """
    norm_methods = ["-1_1", "z-score", "mean"]
    assert method in norm_methods,\
            "normalization method must be one of these " + str(norm_methods)
    if method == "-1_1":
        # apply 0-1 normalization method
        new_min, new_max = -1, 1
        old_min, old_max = audio.min(), audio.max()
        scaled = (audio-old_min)/(old_max-old_min) * (new_max-new_min) + new_min
    elif method == "mean":
        # apply mean normalization
        meu = np.mean(audio)
        mn, mx = audio.min(), audio.max()
        scaled = (audio - meu) / (mx - mn)
    elif method == "z-score":
        # apply z-score normalization (standarization)
        std = np.std(audio)
        meu = np.mean(audio)
        scaled = (audio - meu) / std
    # get back the scaled version
    return scaled




