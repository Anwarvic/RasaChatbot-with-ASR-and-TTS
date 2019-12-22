# RasaChatbot-with-ASR-and-TTS
This repository contains an attempt to incorporate Rasa Chatbot with state-of-the-art ASR (Automatic Speech Recognition) and TTS (Text-to-Speech) models directly without the need of running additional servers or socket connections.


## Browser compatibility

In this project, the browser is a big part as it provides access to the connected media input devices like microphones. So, I had to use a supported interface that is compatible with all mainstream browsers even with older versions. That's why I used the `AudioContext()` interface. I didn't use other interfaces like `MediaRecorder` because it isn't compatible with Microsoft Edge, or Safari. Also, I didn't use any other plugins like `recorderJs` as it is not supported anymore.

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
            <td>:heavy_check_mark: Full support 35 </td>
            <td>:heavy_check_mark: Full support</td>
            <td>:heavy_check_mark: Full support 25</td>
            <td>:x: No support</td>
            <td>:heavy_check_mark: Full support 22</td>
            <td>:heavy_check_mark: Full support 6</td>
            <td>:heavy_check_mark: Full support</td>
            <td>:heavy_check_mark: Full support 35</td>
            <td>:heavy_check_mark: Full support 26</td>
            <td>:heavy_check_mark: Full support 22</td>
            <td>:heavy_check_mark: Full support</td>
            <td>:heavy_check_mark: Full support</td>
        </tr>
    </tbody>
</table>



# acknowledgements

Special Thanks to:

- Sean Naren for training the provided ASR model.
- ESPNet organization for training all provided TTS models.
- SamimOnline for providing the early [Bootstrap template](https://bootsnipp.com/snippets/nNg98)
- Patrick Roberts for the [synth-js](https://github.com/patrickroberts/synth-js) JavaScript plugin.
- [Remon Kamal](https://github.com/RemonComputer) for the technical help during this project... without you, I would have done nothing in this project.