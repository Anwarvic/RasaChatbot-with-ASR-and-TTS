import sys
import yaml
import torch

from g2p_en import G2p
from argparse import Namespace
from parallel_wavegan.models import ParallelWaveGANGenerator

from .cleaners import custom_english_cleaners
from .utils import get_model_conf, torch_load, dynamic_import


# add espnet to the system path
sys.path.append("tts/espnet")

# configuration of every model
MODEL_CONF = {
    "tacotron2": {
        "trans_type": "char",
        "dict_path": "tts/models/tacotron2/data/lang_1char/train_no_dev_units.txt",
        "model_path": "tts/models/tacotron2/exp/train_no_dev_pytorch_train_pytorch_tacotron2.v3/results/model.last1.avg.best",
        "vocoder_path": "tts/models/ljspeech.parallel_wavegan.v1/checkpoint-400000steps.pkl",
        "vocoder_conf": "tts/models/ljspeech.parallel_wavegan.v1/config.yml"
    },
  
    "fastspeech": {
        "trans_type": "phn",
        "dict_path": "tts/models/fastspeech/data/lang_1phn/train_no_dev_units.txt",
        "model_path": "tts/models/fastspeech/exp/phn_train_no_dev_pytorch_train_fastspeech.v4/results/model.last1.avg.best",
        "vocoder_path": "tts/models/ljspeech.parallel_wavegan.v1/checkpoint-400000steps.pkl",
        "vocoder_conf": "tts/models/ljspeech.parallel_wavegan.v1/config.yml"
    },
    
    "transformer": {
        "trans_type": "phn",
        "dict_path": "tts/models/transformer/data/lang_1phn/train_no_dev_units.txt",
        "model_path": "tts/models/transformer/exp/phn_train_no_dev_pytorch_train_pytorch_transformer.v3/results/model.last1.avg.best",
        "vocoder_path": "tts/models/ljspeech.parallel_wavegan.v1/checkpoint-400000steps.pkl",
        "vocoder_conf": "tts/models/ljspeech.parallel_wavegan.v1/config.yml"
    }
}



class TTS():
    def __init__(self, conf):
        self.device = torch.device(conf["device"])
        self.conf = MODEL_CONF[conf["model"]]

        # define E2E-TTS model
        self.idim, odim, train_args = get_model_conf(self.conf["model_path"])
        model_class = dynamic_import(train_args.model_module)
        self.model = model_class(self.idim, odim, train_args)
        torch_load(self.conf["model_path"], self.model)
        self.model = self.model.eval().to(self.device)

        # define neural vocoder
        with open(self.conf["vocoder_conf"]) as f:
            self.vocoder_config = yaml.load(f, Loader=yaml.Loader)

        self.vocoder = ParallelWaveGANGenerator(**self.vocoder_config["generator_params"])
        self.vocoder.load_state_dict(\
            torch.load(self.conf["vocoder_path"], map_location="cpu")["model"]["generator"])
        self.vocoder.remove_weight_norm()
        self.vocoder = self.vocoder.eval().to(self.device)

        # define character-to-id dictionary
        with open(self.conf["dict_path"]) as f:
            lines = f.readlines()
        lines = [line.replace("\n", "").split(" ") for line in lines]
        self.char_to_id = {c: int(i) for c, i in lines}
        

    def __frontend(self, text):
            """Clean text and then convert to id sequence."""
            g2p = G2p()
            text = custom_english_cleaners(text)
            
            if self.conf["trans_type"] == "phn":
                text = filter(lambda s: s != " ", g2p(text))
                text = " ".join(text)
                print(f"Cleaned text: {text}")
                charseq = text.split(" ")
            elif self.conf["trans_type"] == "char":
                print(f"Cleaned text: {text}")
                charseq = list(text)
            idseq = []
            for c in charseq:
                if c.isspace():
                    idseq += [self.char_to_id["<space>"]]
                elif c not in self.char_to_id.keys():
                    idseq += [self.char_to_id["<unk>"]]
                else:
                    idseq += [self.char_to_id[c]]
            idseq += [self.idim - 1]  # <eos>
            return torch.LongTensor(idseq).view(-1).to(self.device)


    def synthesize(self, input_text):
        """
        This method turns text into audio data
        Args:
            input_text (str): the user input text
        Returns:
            1D numpy.array of the audio data where the data is:
            -> mono (just one channel)
            -> sample rate is 22050 Hz
            -> 32-bit floating-point
        """
        with torch.no_grad():
            x = self.__frontend(input_text)
            inference_args = Namespace(**{"threshold": 0.5,
                                          "minlenratio": 0.0,
                                          "maxlenratio": 10.0})
            c, _, _ = self.model.inference(x, inference_args)
            z = torch.randn(1, 1, c.size(0) * self.vocoder_config["hop_size"]).to(self.device)
            c = torch.nn.ReplicationPad1d(
                self.vocoder_config["generator_params"]["aux_context_window"])(c.unsqueeze(0).transpose(2, 1))
            y = self.vocoder(z, c).view(-1)
        wav = y.view(-1).cpu().numpy()
        return wav, self.vocoder_config["sampling_rate"]


