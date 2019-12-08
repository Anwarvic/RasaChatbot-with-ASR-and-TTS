

app.controller('MainController', ['$scope', '$http',
	function($scope, $http) {
		//////////////////// HTML click functions ////////////////////
		// control app configulration
		$scope.config = {
			asr: false,
			tts: false
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
		// total number of messages between user and bot
		$scope.totalMessages = 0;
		$scope.messageId = 0;

		// basic datatype for the session conversation
	    $scope.conversation = [];

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
			if ($scope.userMsg){
				var msg = {
							"id": $scope.messageId++,
							"sender": "user",
							"body": $scope.userMsg,
							"time": $scope.getTime(),
							"type": "text"
				};
				$scope.conversation.push(msg);
				// increase number of total messages
				$scope.totalMessages += 1;
				// clear input
				$scope.userMsg = "";
				// scroll down to the bottom of conversation
				setTimeout(function(){
					document.querySelector(".msg_card_body")
						.scrollTo(0, document.querySelector(".msg_card_body").scrollHeight)
				}, 50);
				// call flask back-end
			    $http.post('/send_message', msg['message'])
			    .then(function(response) {
					// success
					console.log(response);
					// Push the bot response
			        response['data'].forEach(element => {
						var msg = { "id": $scope.messageId++,
									"sender": "bot",
									"time": $scope.getTime()};
						if (element["text"]){
							msg["body"] = element["text"];
							msg["type"] = "text";
						}
						else if (element["image"]){
							msg["body"] = element["image"];
							msg["type"] = "img";
						}
						$scope.conversation.push(msg);
						$scope.totalMessages  += 1 ;
					});
			    },
			    function(response) { 
		            // failed
		            console.log(response);
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
		
		// record function for the ASR
		$scope.holdCounter = 0;
		$scope.startRecording = function(){
			return new Promise(async resolve => {
				chunks = [];
				$scope.recorder.ondataavailable = e => chunks.push(e.data);
				$scope.recorder.start();
				console.log("START RECORDING");
				$scope.recorder.onstop = async ()=>{
				  let blob = new Blob(chunks, {'type':'audio/ogg; codecs=opus'});
				  let encodedBlob = await $scope.b2text(blob);
				  // message
				  var msg = {
							"id": $scope.messageId++,
							"sender": "user",
							"time": $scope.getTime(),
							"body": {
								"snd": encodedBlob,
								"text":"blah blah blah",
								},
							"type": "audio"
					};
				  $scope.conversation.push(msg);
				  $scope.$apply();
				  resolve(encodedBlob);
				}
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
				let snd = new Audio("/static/audio/trigger.wav");
				snd.play();
				$scope.startRecording();
			}, 1000);
		}

		// play audio file
		$scope.play = function(id){
			let snd = new Audio($scope.conversation[id].body.snd);
			snd.play();
			document.getElementById("play-icon#"+id).style.display = "none";
			snd.onended = function() {
				document.getElementById("play-icon#"+id).removeAttribute('style');
			};
		}
	}
]);