

app.controller('MainController', ['$scope', '$http',
function($scope, $http) {
	//////////////////// HTML click functions ////////////////////
	// control app configulration
	$scope.config = {
		asr: false,
		tts: true
	};

	// toggle the ellipsis menu
	$scope.showMenu = function(){
		angular.element('.action_menu').toggle();
	};

	// un-toggle the ellipsis menu
	$scope.untoggle = function(){
		angular.element('.action_menu').hide();
	}
	//////////////////// Variables ////////////////////
	// basic datatype for the session conversation
	$scope.conversation = [];
	// variable to control sending
    $scope.enableSending = true;

	//////////////////// helper functions ////////////////////
	// function to get the current time
	$scope.getTime= function(){
		var today = new Date();
		// var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
		var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
		// var dateTime = date+' '+time;
		return time;
	}

	// covert blob bytes to URL text
	$scope.b2text = blob => new Promise(resolve => {
		const reader = new FileReader();
		reader.onloadend = e => resolve(e.srcElement.result);
		reader.readAsDataURL(blob);
	});

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
		return new Promise((resolve, reject) => {
			$http.post('/send_message', obj)
			.then(function(response) {
				response['data'].forEach(async function(element) {
					// formulate bot response
					var rasaMsg = { "id": $scope.conversation.length,
									"sender": "bot",
									"time": $scope.getTime(),
									"type": element["type"],
									"body": element["body"]};
					if (element["path"]){
						// wait for TTS
						let promise = $scope.TTSplay(element["path"]);
						promise.then(function(snd){
							snd.play();
						});
					}
					console.log("RASA: "); console.log(rasaMsg);
					// Push the bot response
					$scope.conversation.push(rasaMsg);
					resolve ("Rasa Response presented!!");
				});
			},
			function(response) { 
				// failed
				console.error(response);
				reject("Rasa Response Suspended!!")
			});
		});
	};

	// function to send user messages to the bot
	$scope.sendMessage = async function(){
		if ($scope.userMsg && $scope.enableSending){
			// disable sending
			$scope.enableSending = false;
			// variable to match the ASR flag
			let asrEnabled = $scope.config.asr;
			// deactivate ASR temporarily
			if ($scope.config.asr){
				$scope.config.asr = false;
			}
			var userMsg = {
				"id": $scope.conversation.length,
				"sender": "user",
				"body": $scope.userMsg,
				"time": $scope.getTime(),
				"type": "text"
			};
			// show user message
			let userPromise = $scope.presentUserMessage(userMsg);
			userPromise.then(function(){
				// call flask back-end
				let tmp = { "message": userMsg,
							"useTTS": $scope.config.tts}
				// show Rasa response
				let rasaPromise = $scope.presentRasaResponse(tmp);
				rasaPromise.then(function(){
					// enable sending again
					$scope.enableSending = true;
					// enable ASR again (iff it was enabled before)
					if (asrEnabled){
						$scope.config.asr = true;
					}
				});
			})
		}
	};

	// get browser mic permission
	$scope.haveMicPermission = false;
	$scope.micTitle = $scope.config.asr ? "Hold to record, Release to send" : "Enable ASR from top-right menu";

	$scope.getMicPermission = function(){
		$scope.micTitle = $scope.config.asr ? "Hold to record, Release to send" : "Enable ASR from top-right menu";
		if ($scope.config.asr && !$scope.haveMicPermission){
			$scope.haveMicPermission = true;
			console.log("Getting Permission");
			return new Promise(async resolve => {
				stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				$scope.recorder = new MediaRecorder(stream)
			});
		}
	};
	
	// counter to track holding period
	$scope.holdCounter = 0;
	// record function for the ASR
	$scope.startRecording = function(){
		return new Promise(async resolve => {
			$scope.recorder.start();
			console.log("START RECORDING");
			let chunks = [];
			$scope.recorder.ondataavailable = function(e){
				chunks.push(e.data);
			}
			
			let audioStart = Date.now();
			$scope.recorder.onstop = async ()=>{
				let audioEnd = Date.now();
				let blob = new Blob(chunks, {'type':'audio/webm; codecs=opus'});
				let encodedBlob = await $scope.b2text(blob);
				let url = URL.createObjectURL(blob);
				// send post request to flask backend
				$http.post('/send_audio_msg', encodedBlob)
				.then(function(response) {
					// success
					var msg = {
						"id": $scope.conversation.length,
						"sender": "user",
						"time": $scope.getTime(),
						"body": {
							"snd": url,
							"text":response["data"]["text"],
							"duration": (audioEnd-audioStart)/1000
						},
						"type": "audio"};
					$scope.conversation.push(msg);
					// send this message to the backend
				},
				function(response) { 
					// failed
					console.log(response);
				});
			}
		});
	};

	// stop recording function for the ASR
	$scope.stop = function(){
		if ($scope.holdCounter){
			console.log("Recording stopped!!");
			clearTimeout($scope.holdCounter);
			if ($scope.recorder && $scope.recorder.state == "recording"){
				$scope.recorder.stop();
				console.log("STOPPED");
			}
		}
	};

	$scope.record = function(){
		console.log("record btn is clicked");
		$scope.stop();
		//hold for 1s to start recording
		$scope.holdCounter = setTimeout(function(){
			// play trigger
			let snd = new Audio("/static/audio/tone.wav");
			snd.play();
			setTimeout(function (){
				$scope.startRecording();
			}, 500); //500 is the duration of tone.wav
			// onended DIDN'T WORK, DON'T KNOW WHY!!
			// snd.onended = function(){
			// 	$scope.startRecording();
			// };
		}, 1000);
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
	$scope.TTSplay = async function(path){
		console.log(path);
		let snd = new Audio(path);
		// fires when TTS audio is playing
		snd.onplaying = function(){
			console.log("tts playing "+path);
		};
		// fires when TTS audio ends
		snd.onended = function(){
			console.log("tts ended "+path);
		};
		return snd;
	};

}]);


app.directive('scrollToBottom', function($timeout, $window) {
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