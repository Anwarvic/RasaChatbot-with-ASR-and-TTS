

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
	// delay between send message and getting a response
	$scope.delay = 2000;
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
	// function to send user messages to the bot
	$scope.sendMessage = function(){
		if ($scope.userMsg && $scope.enableSending){
			var userMsg = {
						"id": $scope.conversation.length,
						"sender": "user",
						"body": $scope.userMsg,
						"time": $scope.getTime(),
						"type": "text"
			};
			$scope.conversation.push(userMsg);
			// clear input
			$scope.userMsg = "";
			// call flask back-end
			$http.post('/send_message', userMsg['body'])
			.then(function(response) {
				// Push the bot response
				response['data'].forEach(async function(element) {
					var rasaMsg = { "id": $scope.conversation.length,
								"sender": "bot",
								"time": $scope.getTime()};
					if (element["text"]){
						rasaMsg["body"] = element["text"];
						rasaMsg["type"] = "text";
					}
					else if (element["image"]){
						rasaMsg["body"] = element["image"];
						rasaMsg["type"] = "img";
					}
					await $scope.TTSplay(rasaMsg);
					console.log(rasaMsg);
					// wait for 2s to seem more reasonable
					// setTimeout(function(){
					// 	$scope.conversation.push(msg);
					// }, $scope.delay);
					$scope.conversation.push(rasaMsg);
				});
			},
			function(response) { 
				// failed
				console.error(response);
			});
		}
	}
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
	}
	
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
					// scroll down to the bottom of conversation
					setTimeout(function(){
						document.querySelector(".msg_card_body")
							.scrollTo(0, document.querySelector(".msg_card_body").scrollHeight)
					}, 50);
				},
				function(response) { 
					// failed
					console.log(response);
				});
			}
			// resolve(encodedBlob);
		});
	}

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
	}

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
	}

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
	}

	// play audio returned from TTS
	$scope.TTSplay = async function(msg){
		// check enabling tts
		if ($scope.config.tts && msg["type"] == "text"){
			$http.post("/speak", msg)
			.then(function(response){
				let path = response["data"]["path"]
				let snd = new Audio(path);
				// variable to match the ASR flag
				let asrEnabled = $scope.config.asr;
				// fires when TTS audio is playing
				snd.onplaying = function(){
					console.log("tts playing!!");
					// disable sending
					$scope.enableSending = false;
					// deactivate ASR temporarily
					if ($scope.config.asr){
						$scope.config.asr = false;
					}
				};
				// fires when TTS audio ends
				snd.onended = function(){
					// enable sending
					$scope.enableSending = true;
					// enable ASR again (iff it was enabled before)
					if (asrEnabled){
						$scope.config.asr = true;
					}
				};
				snd.play();
			},
			function(response){
				//failed
				console.error(response)
			});
		}
	}

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