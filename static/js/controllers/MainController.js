

app.controller('MainController', ['$scope', '$http',
	function($scope, $http) {
		//////////////////// HTML click functions ////////////////////
		// control app configulration
		$scope.config = {
			asr: true,
			tts: true
		};

		// toggle the ellipsis menu
		$scope.show_menu = function(){
			angular.element('.action_menu').toggle();
		};

		// un-toggle the ellipsis menu
		$scope.untoggle = function(){
			angular.element('.action_menu').hide();
		}
		//////////////////// Variables ////////////////////
		// total number of messages between user and bot
		$scope.total_messages = 0

		// basic datatype for the session conversation
	    $scope.conversation = [{
		    	"sender": "user",
		    	"message": "Hello World",
				"time": "2019-12-02",
				"type": "text"
	    	},
			{
				"sender": "bot",
				"message": "Hello World from bot",
				"time": "2019-12-02",
				"type": "text"
			},
			{
		    	"sender": "user",
		    	"message": "Hello World2",
		    	"time": "2019-12-02",
				"type": "text"
	    	},
			{
				"sender": "bot",
				"message": "Hello World2 from bot",
				"time": "2019-12-02",
				"type": "text"
		}];

		//////////////////// helper functions ////////////////////
		// function to get the current time
		$scope.get_time= function(){
			var today = new Date();
			// var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
			var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
			// var dateTime = date+' '+time;
			return time;
		}

		//////////////////// Main functions ////////////////////
	    // function to send user messages to the bot
		$scope.send_message = function(){
			if ($scope.user_msg){
				var msg = { "sender": "user",
							"message": $scope.user_msg,
							"time": $scope.get_time()};
				$scope.conversation.push(msg);
				// increase number of total messages
				$scope.total_messages += 1;
				// clear input
				$scope.user_msg = "";
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
						var msg = { "sender": "bot",
									"time": $scope.get_time()};
						if (element["text"]){
							msg["message"] = element["text"];
							msg["type"] = "text";
						}
						else if (element["image"]){
							msg["message"] = element["image"];
							msg["type"] = "img";
						}
						$scope.conversation.push(msg);
						$scope.total_messages += 1 ;
					});
			    },
			    function(response) { 
		            // failed
		            console.log(response);
			    });
			}
		}
		// record function for the ASR
		$scope.holdCounter = 0;
		$scope.startRecording = function(){
			console.log("Recording...");
		}

		// stop recording function for the ASR
		$scope.stop = function(){
			if ($scope.holdCounter){
				console.log("Recording stopped!!");
				clearTimeout($scope.holdCounter);
			}
		}

		$scope.record = function(){
			console.log("record btn is clicked");
			$scope.stop();
			//hold for 2s to start recording
			$scope.holdCounter = setTimeout(function(){ $scope.startRecording(); }, 2000);
		}
	}
]);