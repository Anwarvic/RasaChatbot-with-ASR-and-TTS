#!/bin/bash

if [ "$1" = "--help" ]  || [ "$1" = "-h" ] || [ $# -lt 1 ] || [ $# -gt 1 ]
then
   echo "Usage: $0 <training_dataset>"
   echo "Options:"
   echo "	<training_dataset>: the dataset used to pre-train the model."
   echo "	Available are [an4, librispeech, tedlium]"
   echo "	e.g.: $0 librispeech"
   exit 0
fi

dataset=$1

if [ $dataset = "librispeech" ]
then
	if [ ! -f "librispeech_pretrained_v2.pth" ]
	then
		echo "Downloading ASR (trained on Librispeech)"
		wget "https://github.com/SeanNaren/deepspeech.pytorch/releases/download/v2.0/librispeech_pretrained_v2.pth"
	else
		echo "${dataset} pre-trained model is already found!!"
	fi
elif  [ $dataset = "tedlium" ]
then
	if [ ! -f "ted_pretrained_v2.pth" ]
	then
		echo "Downloading ASR (trained on TEDLIUM)"
		wget "https://github.com/SeanNaren/deepspeech.pytorch/releases/download/v2.0/ted_pretrained_v2.pth"
	else
		echo "${dataset} pre-trained model is already found!!"
	fi
elif  [ $dataset = "an4" ]
then
	if [ ! -f "an4_pretrained_v2.pth" ]
	then
		echo "Downloading ASR (trained on AN4)"
		wget "https://github.com/SeanNaren/deepspeech.pytorch/releases/download/v2.0/an4_pretrained_v2.pth"
	else
		echo "${dataset} pre-trained model is already found!!"
	fi
else
	echo "Invalid <training_dataset>... Use either 'an4', or 'librispeech', or 'tedlium'"
fi
