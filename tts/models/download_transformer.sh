#!/bin/bash

# define decompressor
decompress () {
    filename=$1
    decompress_dir=$2
    if echo "${filename}" | grep -q ".zip"; then
        unzip "${filename}" -d "${decompress_dir}"
    elif echo "${filename}" | grep -q -e ".tar" -e ".tar.gz" -e ".tgz"; then
        tar xvzf "${filename}" -C "${decompress_dir}"
    else
        echo "Unsupported file extension." && exit 1
    fi
}

if [ ! -d "ljspeech.parallel_wavegan.v1" ]
then
    #download vocoder (15MB)
    tmp=$(mktemp "XXXXXX.tar.gz")
    wget "https://drive.google.com/uc?export=download&id=1tv9GKyRT4CDsvUWKwH3s_OfXkiTi0gw7" -O "${tmp}"
    decompress "${tmp}" "."
    # remove tmpfiles
    rm "${tmp}"
    echo "Sucessfully downloaded vocoder"
fi



download_dir="transformer"
[ ! -e "${download_dir}" ] && mkdir -p "${download_dir}"
file_ext="tar.gz"
file_id="1M_w7nxI6AfbtSHpMO-exILnAc_aUYvXP"
tmp=$(mktemp "${download_dir}/XXXXXX.${file_ext}")

# Try-catch like processing
(
    # download (135MB)
    wget "https://drive.google.com/uc?export=download&id=${file_id}" -O "${tmp}"
    decompress "${tmp}" "${download_dir}"
) || {
    # Do not allow error from here
    set -e
    curl -c /tmp/cookies "https://drive.google.com/uc?export=download&id=${file_id}" > /tmp/intermezzo.html
    postfix=$(perl -nle 'print $& while m{uc-download-link" [^>]* href="\K[^"]*}g' /tmp/intermezzo.html | sed 's/\&amp;/\&/g')
    curl -L -b /tmp/cookies "https://drive.google.com${postfix}" > "${tmp}"
    decompress "${tmp}" "${download_dir}"
}
# remove tmpfiles
rm "${tmp}"
echo "Sucessfully downloaded tts transformer"
