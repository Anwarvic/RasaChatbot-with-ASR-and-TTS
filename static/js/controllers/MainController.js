

app.controller('MainController', ['$scope', '$http', '$timeout',
function($scope, $http, $timeout) {
	//////////////////// Variables ////////////////////
	// basic datatype for the session conversation
	$scope.conversation = [];
	// variable to control sending
	$scope.enableSending = true;
	// duration of holding before recording
	$scope.holdDuration = 1000;
	// variable to track the condition of the mic button
	$scope.micDown = false;
	// control app configulration
	$scope.config = {
		asr: false,
		tts: false
	};

	//////////////////// HTML click functions ////////////////////
	// control mic icon title
	$scope.micTitle = $scope.config.asr
					? "Hold to record, Release to send"
					: "Enable ASR from top-right menu";

	// toggle the ellipsis menu				
	$scope.showMenu = function(){
		angular.element('.action_menu').toggle();
	};	

	// un-toggle the ellipsis menu
	$scope.untoggle = function(){
		angular.element('.action_menu').hide();
	};

	//////////////////// helper functions ////////////////////
	// function to get the current time
	$scope.getTime= function(){
		let today = new Date();
		// hour with leading zero
		let h = ("0"+today.getHours()).slice(-2);
		// minute with leading zero
		let m = ("0"+today.getMinutes()).slice(-2);
		return h + ":" + m;
	};

	//////////////////// Main functions ////////////////////
	// function to view user message
	$scope.presentUserMessage = function(userMsg){
		return new Promise((resolve, reject) => {
			console.log("USER: "); console.log(userMsg);
			$scope.conversation.push(userMsg);
			// clear input
			$scope.userMsg = "";
			resolve("User Message Presented!!")
		});
	};

	// function to view Rasa response
	$scope.presentRasaResponse = function(obj){
		return new Promise((resolve, reject) =>{
			// prepare loading message
			let botLoadingMsg = {
				"id": $scope.conversation.length,
				"sender": "bot",
				"time": "",
				"type": "text",
				"body": ""
			};
			$scope.conversation.push(botLoadingMsg);
			// adding loading style
			$timeout(function(){
				document.getElementById("msg#"+botLoadingMsg["id"]).classList.add("loading")
			}, 0);
			// call backend
			$http.post('/send_message', obj)
			.then(function(response) {
				// remove loading message
				document.getElementById("msg#"+botLoadingMsg["id"]).classList.remove("loading");
				$scope.conversation.pop();
				// handle backend responses
				$scope.handleBackendResponses(response["data"], 0);
				resolve("Rasa Response Submitted!!")
			},
			function(response) { 
				// failed
				reject("Rasa Response Suspended!!");
			});
		});
	};

	// function to send text message
	$scope.submitMessage = function(){
		if ($scope.userMsg && $scope.enableSending){
			// disable sending
			$scope.enableSending = false;
			// structure the text message
			let userTextMsg = {
				"id": $scope.conversation.length,
				"sender": "user",
				"body": $scope.userMsg,
				"time": $scope.getTime(),
				"type": "text"
			};
			// send text message to Rasa server
			$scope.sendMessage(userTextMsg);
		}
	}
	
	// function to send user messages to the bot
	$scope.sendMessage = async function(userMsg){
		// variable to match the ASR flag
		let asrEnabled = $scope.config.asr;
		// deactivate ASR temporarily
		if ($scope.config.asr){
			$scope.config.asr = false;
		}
		// show user message if it was text
		let userPromise = $scope.presentUserMessage(userMsg);
		userPromise.then(function(){
			// call flask back-end
			let msg = {
				"id": userMsg["id"],
				"useTTS": $scope.config.tts
			};
			if (userMsg["type"] == "audio"){
				msg["text"] = userMsg["body"]["text"];
			}
			else if (userMsg["type"] == "text"){
				msg["text"] = userMsg["body"];
			}
			// show Rasa response
			let rasaPromise = $scope.presentRasaResponse(msg);
			rasaPromise.then(function(){
				// enable sending again
				$scope.enableSending = true;
				// enable ASR again (iff it was enabled before)
				if (asrEnabled){
					$scope.config.asr = true;
				}
			});
		})
	};
	
	// get browser mic permission
	$scope.haveMicPermission = false;
	$scope.getMicPermission = function(){
		$scope.micTitle = $scope.config.asr
						? "Hold to record, Release to send"
						: "Enable ASR from top-right menu";
		if ($scope.config.asr && !$scope.haveMicPermission){
			$scope.haveMicPermission = true;
			console.log("Getting Permission");
			return new Promise(async resolve => {
				$scope.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				// audio buffer size
				let bufferSize = 1024;
				// necessary objects for recording audio
				$scope.audioCntxt = new AudioContext();
				$scope.microphone = $scope.audioCntxt.createMediaStreamSource($scope.stream);
				$scope.recorder = $scope.audioCntxt.createScriptProcessor(bufferSize, 1, 1);
				// resampler object (16k, mono is what ASR expects)
				res = new Resampler($scope.audioCntxt.sampleRate, 16000, 1, bufferSize);
				// object to save audio data
				$scope.chunks = [];
				// whenever audio data is available
				$scope.recorder.onaudioprocess = function(e) {
					// get input buffer
					let inBuf = e.inputBuffer.getChannelData(0);
					// resample buffer using `res` object
					let outBuf = res.resample(inBuf);
					// add buffer to chunks member variable
					$scope.chunks.push.apply($scope.chunks, outBuf);
				};
			});
		}
	};
	
	// record function for the ASR
	$scope.record = function(){
		console.log("record btn is clicked");
		//hold for a certain period to start recording
		$scope.holdCounter = setTimeout(function(){
			$scope.micDown = true;
			// play trigger
			let snd = new Audio("/static/audio/tone.wav");
			snd.play();
			snd.onended = function(){
				// check mic button being still clicked upon
				if ($scope.micDown){
					console.log("Recording started!!");
					// blur effect
					document.getElementById("card_body").style.filter = "blur(5px)";
					// recording message
					let userHeadline = document.getElementById("user_headline");
					userHeadline.textContent = "Recording";
					userHeadline.style.color = "red";
					userHeadline.classList.add("loading");
					// connect audio devices
					$scope.microphone.connect($scope.recorder);
					$scope.recorder.connect($scope.audioCntxt.destination);
				}
			};
		}, $scope.holdDuration);
	};

	// stop recording function for the ASR
	$scope.stop = async function(){
		$scope.micDown = false;
		console.log("Recording stopped!!");	
		clearTimeout($scope.holdCounter);
		if ($scope.chunks.length != 0 && $scope.microphone && $scope.recorder){
			// disable sending
			$scope.enableSending = false;
			// disconnect audio devices
			$scope.microphone.disconnect();
			$scope.recorder.disconnect();
			// remove blur effect
			document.getElementById("card_body").style.removeProperty("filter");
			// reset user headline
			let userHeadline = document.getElementById("user_headline");
			userHeadline.textContent = "Chat with User";
			userHeadline.style.removeProperty("color");
			userHeadline.classList.remove("loading");
			// send loading message
			let userLoadingMsg = {
				"id": $scope.conversation.length,
				"sender": "user",
				"time": "",
				"type": "text",
				"body": ""
			};
			$scope.conversation.push(userLoadingMsg);
			// adding loading style
			$timeout(function(){
				document.getElementById("msg#"+userLoadingMsg["id"]).classList.add("loading");
			}, 0);
			// Convert buffer to WAV (sample rate: 16k, percision: 16-bit)
			let wav = new synth.WAV(1, 16000, 16, true, $scope.chunks);
			// get audio duration
			let audioDuration = $scope.chunks.length / 16000;
			// reset recorded audio data
			$scope.chunks = [];
			// convert wav to blob
			let blob = wav.toBlob();
			// get url to be saved in the conversation
			let url = URL.createObjectURL(blob);
			// send post request to flask backend
			$http.post('/send_audio_msg', wav)
			.then(function(response) {
				// success
				// remove loading message
				document.getElementById("msg#"+userLoadingMsg["id"]).classList.remove("loading");
				$scope.conversation.pop();
				// structure audio message
				let userAudioMsg = {
					"id": $scope.conversation.length,
					"sender": "user",
					"time": $scope.getTime(),
					"body": {
						"snd": url,
						"text":response["data"]["text"],
						"duration": audioDuration
					},
					"type": "audio"
				};
				// send message to Rasa server
				$scope.userMsg = userAudioMsg["body"]["text"];
				// send audio message
				$scope.sendMessage(userAudioMsg);
			},
			function(response) { 
				// failed
				reject("Rasa Response Suspended!!");
			});
		}
	};

	// play audio file
	$scope.play = function(id){
		let snd = new Audio($scope.conversation[id].body.snd);
		snd.play();
		// hide play-icon when playing audio (TODO: change this to pause)
		document.getElementById("play-icon#"+id).style.display = "none";
		let audioDuration = $scope.conversation[id].body.duration;
		console.log(audioDuration);
		// shadow-transition effect
		document.getElementById("msg#"+id).setAttribute("style",
			"background-position: left bottom; transition: "+audioDuration+"s linear");
		snd.onended = function() {
			// get back the play-icon
			document.getElementById("play-icon#"+id).removeAttribute('style');
			// remove the shadow-transition effect
			document.getElementById("msg#"+id).removeAttribute('style');
		};
	};

	// play audio returned from TTS
	$scope.TTSplay = function(snd_obj){
		let buff = new Float32Array(snd_obj["audio"]);
		// Convert buffer to WAV (sample rate: snd_ob["sample_rate"], percision: 16-bit)
		let wav = new synth.WAV(1, snd_obj["sample_rate"], 16, true, buff);
		// convert wav to blob
		let blob = wav.toBlob();
		// get url to be saved in the conversation
		let url = URL.createObjectURL(blob);
		let snd = new Audio(url);
		// don't use autoplay as it's disabled in Firefox
		// snd.autoplay = true;
		snd.onplaying = function(){
			console.log("TTS is playing");
		};
		return snd;
	};

	// rasa usually responds with more than one message, and these messages
	// could be either text, image or both. This function handles these 
	// responses in an asynchronous way (message by message)!!
	$scope.handleBackendResponses = function(responses, index){
		// stops when indices ran out
		if (index == responses.length){
			return
		}
		else{
			let element = responses[index];
			// formulate bot response
			let rasaMsg = {
				"id": $scope.conversation.length,
				"sender": "bot",
				"time": $scope.getTime(),
				"type": element["type"],
				"body": element["body"]
			};
			if (element["snd"]){
				let snd = $scope.TTSplay(element["snd"]);
				snd.play();
				console.log("RASA: "); console.log(rasaMsg);
				// Push the bot response
				$scope.conversation.push(rasaMsg);
				snd.onended = function(){
					console.log("TTS is ended");
					$scope.handleBackendResponses(responses, index+1);
				};
			}
			else{
				$timeout(function(){
					console.log("RASA: "); console.log(rasaMsg);
					// Push the bot response
					$scope.conversation.push(rasaMsg);
					$scope.handleBackendResponses(responses, index+1);
				}, 0);
			}
		}
	}
	
}]);

// responsible for scrolling down the page whenever a new message is posted
app.directive('scrollToBottom', function($timeout) {
    return {
        scope: {
            scrollToBottom: "="
        },
        restrict: 'A',
        link: function(scope, element, attr) {
            scope.$watchCollection('scrollToBottom', function(newVal) {
                if (newVal) {
                    $timeout(function() {
                        element[0].scrollTop =  element[0].scrollHeight;
                    }, 0);
                }
            });
        }
    };
});