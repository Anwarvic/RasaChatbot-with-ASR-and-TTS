import os
import torch
import librosa
import numpy as np

from .model import DeepSpeech


class ASR():

    def __init__(self, conf):
        self.conf = conf
        # load pre-trained model
        model_path = os.path.join(os.getcwd(), self.conf["model_path"])
        self.model = DeepSpeech.load_model(model_path)
        self.model.eval()
        self.device = torch.device("cuda" if conf["cuda"] else "cpu")
        self.model = self.model.to(self.device)
        if self.conf["half"]:
            self.model = self.model.half()

        # create decoder
        if conf["decoder"] == "beam":
            from .decoder import BeamCTCDecoder
            lm_path = os.path.join(os.getcwd(), self.conf["lm_path"])
            self.decoder = BeamCTCDecoder(self.model.labels,
                                    lm_path = lm_path,
                                    alpha = self.conf["alpha"],
                                    beta = self.conf["beta"],
                                    cutoff_top_n = self.conf["cutoff_top_n"],
                                    cutoff_prob = self.conf["cutoff_prob"],
                                    beam_width = self.conf["beam_width"],
                                    num_processes = self.conf["lm_workers"])
        elif conf["decoder"] == "greedy":
            from .decoder import GreedyDecoder
            self.decoder = GreedyDecoder(self.model.labels,
                                    blank_index=self.model.labels.index('_'))


    def transcribe(self, audio):
        if len(audio.shape) > 1:
            if audio.shape[1] == 1:
                audio = audio.squeeze()
            else:
                audio = audio.mean(axis=1)  # multiple channels, average
        
        audio_conf = self.model.audio_conf
        n_fft = int(audio_conf['sample_rate'] * audio_conf['window_size'])
        win_length = n_fft
        hop_length = int(audio_conf['sample_rate'] * audio_conf['window_stride'])
        # STFT
        D = librosa.stft(audio, n_fft=n_fft, hop_length=hop_length,
                            win_length=win_length, window=audio_conf['window'])
        spect, phase = librosa.magphase(D)
        # S = log(S+1)
        spect = np.log1p(spect)
        spect = torch.FloatTensor(spect)
        # normalize spectrogram
        mean = spect.mean()
        std = spect.std()
        spect.add_(-mean)
        spect.div_(std)

        spect = spect.contiguous() # contiguous tensor
        spect = spect.view(1, 1, spect.size(0), spect.size(1))
        spect = spect.to(self.device)
        if self.conf["half"]:
            spect = spect.half()
        input_sizes = torch.IntTensor([spect.size(3)]).int()
        out, output_sizes = self.model(spect, input_sizes)
        decoded_output, decoded_offsets = self.decoder.decode(out, output_sizes)

        # build transcription
        output = []
        for b in range(len(decoded_output)):
            for pi in range(min(self.conf["top_paths"], len(decoded_output[b]))):
                result = {'transcription': decoded_output[b][pi]}
                if self.conf["offsets"]:
                    result['offsets'] = decoded_offsets[b][pi].tolist()
                output.append(result)
        # print(output[0]['transcription'])
        return output[0]['transcription']

