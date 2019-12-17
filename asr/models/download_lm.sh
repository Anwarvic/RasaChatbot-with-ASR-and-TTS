#!/bin/bash

if [[ ! -f "3-gram.pruned.1e-7.arpa" && ! -f "3-gram.pruned.1e-7.arpa.gz" ]]
then
	# download language model (pruned 70k words)
	wget "http://www.openslr.org/resources/11/3-gram.pruned.1e-7.arpa.gz"
	echo "Sucessfully downloaded language model"
fi

if [ ! -f "3-gram.pruned.1e-7.arpa.gz" ]
then
	# uncompress it in the current directory
	gunzip "3-gram.pruned.1e-7.arpa.gz"
	echo "Sucessfully extracted language model"
else
	echo "Language Model is already found!!"
fi

