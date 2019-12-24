import yaml
import numpy as np



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
    SEE:
    https://en.wikipedia.org/wiki/Normalization
    """
    norm_methods = ["-1_1", "z-score", "mean"]
    assert method in norm_methods,\
            "normalization method must be one of these " + norm_methods
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




