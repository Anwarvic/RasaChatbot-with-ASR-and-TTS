

app.controller('MainController', ['$scope', '$http',
	function($scope, $http) {
		// total number of messages between user and bot
		$scope.total_messages = 0

		// basic datatype for the session conversation
	    $scope.conversation = [{
		    	"type": "user",
		    	"message": "Hello World",
		    	"time": "2019-12-02"
	    	},
			{
				"type": "bot",
				"message": "Hello World from bot",
				"time": "2019-12-02"
			},
			{
		    	"type": "user",
		    	"message": "Hello World2",
		    	"time": "2019-12-02"
	    	},
			{
				"type": "bot",
				"message": "Hello World2 from bot",
				"time": "2019-12-02"
		}];

		// function to get the current time
		$scope.get_time= function(){
			var today = new Date();
			// var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
			var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
			// var dateTime = date+' '+time;
			return time;
		}

	    // function to send user messages to the bot
		$scope.send_message = function(){
			if ($scope.user_msg){
				msg = { "type": "user",
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
			    $http.post('/send_message', JSON.stringify(msg))
			    .then(function(response) {
			        // success
			        console.log(response);
			    },
			    function(response) { 
		            // failed
		            console.log(response);
			    });
			}
		}
	}
]);