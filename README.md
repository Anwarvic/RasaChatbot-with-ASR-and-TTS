# RasaChatbot-with-ASR-and-TTS
This repository contains an attempt to incorporate Rasa Chatbot with state-of-the-art ASR (Automatic Speech Recognition) and TTS (Text-to-Speech) models directly without the need of running additional servers or socket connections.


## Browser compatibility

In this project, the browser is a big part as it provides access to the connected media input devices like micrsphones. So, I had to use a supported interface that is compatible with all mainstream browsers even with older versions. That's why I used the `navigator.mediaDevices` interface with `ogg` audio format encoded by `opus` codec.

I didn't use other interfaces like `MediaRecorder` because it isn't compatible with Microsoft Edge, or Internet Explorer (IE) or Safari. I didn't use any other plugins like `recorderJs` either as it isn't supported anymore.

Here is a table of the least acceptable version of each mainstream browser out there in the market:

<table>
    <thead>
        <tr>
            <th colspan="6">Desktop</th>
            <th  colspan="6">Mobile</th>
        </tr>
        <tr>
            <th>Chrome</th>
            <th>Edge</th>
            <th>Firefox</th>
            <th>Internet Explorer</th>
            <th>Opera</th>
            <th>Safari</th>
            <th>Android webview</th>
            <th>Chrome for Android</th>
            <th>Firefox for Android</th>
            <th>Opera for Android</th>
            <th>Safari on iOS</th>
            <th>Samsung Internet</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Full support 52 </td>
            <td>Full support 12</td>
            <td>Full support 36</td>
            <td>No support</td>
            <td>Full support 40</td>
            <td>Full support 11</td>
            <td>Full support 53</td>
            <td>Full support 52</td>
            <td>Full support 36</td>
            <td>Full support 41</td>
            <td>Full support 11</td>
            <td>Full support</td>
        </tr>
    </tbody>
</table>

