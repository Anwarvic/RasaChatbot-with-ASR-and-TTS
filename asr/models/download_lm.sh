#!/bin/bash

if [[ ! -f "en-70k-0.2-pruned.lm" && ! -f "en-70k-0.2-pruned.lm.gz" ]]
then
	# download language model (pruned 70k words)
	wget "https://liquidtelecom.dl.sourceforge.net/project/cmusphinx/Acoustic%20and%20Language%20Models/US%20English/en-70k-0.2-pruned.lm.gz"
	echo "Sucessfully downloaded language model"
fi

if [ ! -f "en-70k-0.2-pruned.lm" ]
then
	# uncompress it in the current directory
	gunzip "en-70k-0.2-pruned.lm.gz"
	echo "Sucessfully extracted language model"
else
	echo "Language Model is found!!"
fi

