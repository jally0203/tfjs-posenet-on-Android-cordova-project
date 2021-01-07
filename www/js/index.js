/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var app = {
    // Application Constructor
    initialize: function() {
		//console.log("initialize");
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
		//console.log("deviceready");
        this.receivedEvents('deviceready');
    },

    // Update DOM on a Received Event
    receivedEvents: function(id) {
        var parentElement = document.getElementById(id);
        //var listeningElement = parentElement.querySelector('.listening');
        //var receivedElement = parentElement.querySelector('.received');

        //listeningElement.setAttribute('style', 'display:none;');
        //receivedElement.setAttribute('style', 'display:block;');

        //console.log('Received Event: ' + id);
		
		/* use Camera */
		//const param = {quality:50, destinationType:Camera.DestinationType.DATA_URL};
		//navigator.camera.getPicture(this.onSuccess, this.onFail, param);
		
		/* get Video Stream by WebRTC */
		if(hasGetUserMedia()){
			//console.log("I have getUserMedia");
			const width = 360;
			const height = 360;
			const webRTCParam = {video:{width:width, height:height}, audio:false};
			const videoElem = document.getElementById("myVideo");
			const canvasElem = document.getElementById("myCanvas");
			const pictureElem = document.getElementById("myPicture");
			
						
			navigator.mediaDevices.getUserMedia(webRTCParam).then(function(stream){
				//console.log("success in getUserMedia");
				videoElem.srcObject = stream;
				videoElem.addEventListener('canplay', function(event){
					var context = canvasElem.getContext('2d');
					var data = null;
					/* get a image and count PoseNet */	
					getImageAndCountPose(canvasElem, videoElem, pictureElem, width, height);
				});
			},function(err){
				//console.log("fail in getUserMedia");
				console.log(err);
			});			
		}else{
			console.log("I don't have getUserMedia");
		}
    },
	
	onFail: function(message){
		console.log("onFail:" + message);
	},
	
	onSuccess: function(imageData){
		//console.log("onSuccess:");
		const pictureBlock = document.getElementById("pictureBlock");
		pictureBlock.src = "data:image/jpeg;base64," + imageData;
		feedPoseNet(pictureBlock);
	}

};

function getImageAndCountPose(canvasElem, videoElem, pictureElem, width, height){
	//console.log("draw image on canvas");
	const hideCanvasElem = document.getElementById("hideCanvas");
	hideCanvas.getContext('2d').drawImage(videoElem, 0, 0, width, height);
	var data = hideCanvas.toDataURL('image/png');
	pictureElem.setAttribute('src', data);
	const infoElem = document.getElementById("information");
	var startTimeMS = Date.now();
	//console.log(startTimeMS);
	feedPoseNet(pictureElem, function(finish, stop) {
		var calTime = Date.now() - startTimeMS;
		infoElem.innerHTML = '<p>Frame time : '+ calTime +'ms</p>';
		if(!stop)
			getImageAndCountPose(canvasElem, videoElem, pictureElem, width, height);
	});
}

function chooseColor(part){
	if(part=="nose" || part=="leftEye" || part=="rightEye" || part=="leftEar" || part=="rightEar")
			return "red";
		else if(part=="leftHip"||part=="rightHip")
			return "blue";
		else
			return "green";
}
	
async function drawPoses(multiPoses, cb){	
	//console.log("drawpose");
	//console.log(multiPoses.length);
	const pictureElem = document.getElementById("myPicture");
	const canvas1 = document.getElementById("myCanvas");
	const canvas2 = document.getElementById("drawCanvas");
	const cxt = canvas2.getContext("2d");
	var p = 0;
	
	canvas1.getContext('2d').drawImage(pictureElem, 0, 0, canvas1.width, canvas1.height);
	//console.log("clear canvas");
	cxt.clearRect(0, 0, canvas2.width, canvas2.height);
	
	if(multiPoses.length == 0){
		//console.log("no person, return");
		cb(true, false);   //continue next image
	}
	
	const personThres = 0.01;
	const jointThres = 0.5;
	const radius = 5;
	let connected = [];
	
	multiPoses.forEach(function(person){
		const score = person.score;		
		p++;
		var j = 0;
		if(score > personThres){
			person.keypoints.forEach(function(joint, idx){
				j++;
				if(joint.score > jointThres){
					cxt.beginPath();
					cxt.arc(joint.position.x, joint.position.y, radius, 0, Math.PI*2);
					cxt.fillStyle = this.chooseColor(joint.part);
					cxt.fill();
					
					//draw lines
					//val idx = person.keypoints.indexOf(joint);
					connected = getConnectedParts(idx);
					connected.forEach(function(nextId){
						//console.log('connect from ' + joint + ' to ' + part);
						nextPart = person.keypoints[nextId];
						if(nextPart.score > jointThres){
							cxt.beginPath();
							cxt.moveTo(joint.position.x, joint.position.y);
							cxt.lineTo(nextPart.position.x, nextPart.position.y);
							cxt.strokeStyle = chooseColor(joint.part);
							cxt.lineWidth = 5;
							cxt.stroke();
						}
					});
				}
				//console.log("p=" + p + ", j=" + j);
				if(p == multiPoses.length && j == person.keypoints.length){
					//console.log("All joint on canvas");
					cb(true, false);     //stop and wait
				}
			});
		}	
	});
}

function getConnectedParts(id){
	let ret = [];
	switch(id){
		case 5:
			ret.push(6);
			ret.push(7);
			ret.push(11);
			break;
		case 6:
			ret.push(8);
			ret.push(12);
			break;
		case 7:
			ret.push(9);
			break;
		case 8:
			ret.push(10);
			break;
		case 11:
			ret.push(13);
			break;
		case 12:
			ret.push(14);
			break;
		case 13:
			ret.push(15);
			break;
		case 14:
			ret.push(16);
			break;
	}
	//console.log('input ' + id +', return is ' + ret);
	return ret;
}

async function drawPerson(person, context){
	const personThres = 0.01;
	if(person.score > personThres){
		for(let i=0; i < person.keypoints.length; i++){
			await drawJoint(person.keypoints[i], context);
		}
	}
}

async function drawJoint(joint, cxt){	
	const jointThres = 0.5;
	const radius = 5;
	if(joint.score > jointThres){
		cxt.beginPath();
		cxt.arc(joint.position.x, joint.position.y, radius, 0, Math.PI*2);
		cxt.fillStyle=this.chooseColor(joint.part);
		cxt.fill();
		//console.log("draw");
	}
}

function feedPoseNet(pictureBlock, cb){
	const imageScaleFactor = 0.5;
	const flipHorizontal = false;
	const outputStride = 16;
	const maxPoseDetections = 5;
	const scoreThreshold = 0.5;
	const nmsRadius = 20;
	//const infoElem = document.getElementById("information");
	//var stime = Date.now();
	//console.log("feedPoseNet");
	posenet.load().then(function(net){
		const multiPoses = net.estimateMultiplePoses(pictureBlock, imageScaleFactor,flipHorizontal, outputStride, maxPoseDetections, scoreThreshold, nmsRadius);
		return multiPoses;
	}).then(function(multiPoses){	
		console.log(multiPoses);
		//var ctime = Date.now() - stime;
		//console.log(ctime);
		//infoElem.innerHTML += '<p>Estimation Time : '+ ctime +'ms</p>';
		drawPoses(multiPoses, cb);
	});
}

function hasGetUserMedia(){
	return !!(navigator.mediaDevices.getUserMedia);
}



app.initialize();