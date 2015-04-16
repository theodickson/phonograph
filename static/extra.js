//Extra functions don't need to be seen, and probably won't need to
//Rotation functions.
function optimiseRotation(oldPos, newPos, graph) {
	testVals = [];
	x = 0;
	while (x < 10000) {
		testVals.push(x*Math.PI/10000);
		x += 1;
	};
	results = [];
	for (alpha of testVals) {
		results.push(calculateTotalDistance(alpha,oldPos,newPos));
	};
	bestScore = Math.min.apply(null, results);
	bestAlpha = testVals[results.indexOf(bestScore)];
	graph = rotatePos(bestAlpha,graph);
	return graph;
};

function calculateTheta(x,y) {
	X = Math.abs(x); Y = Math.abs(y);
	if ((x > 0) && (y > 0)) {
		theta = Math.atan(X/Y);
	} else if ((x > 0) && (y < 0)) {
		theta = Math.atan(Y/X) + Math.PI/2;
	} else if ((x < 0) && (y < 0)) {
		theta = Math.atan(X/Y) + Math.PI;
	} else {
		theta = Math.atan(Y/X) + 3*Math.PI/2;
	};
	return theta;
};

function calculateTotalDistance(alpha, oldPos, newPos) {
	sum = 0;
	c = 0;
	while (c < oldPos.length) {
		source = [oldPos[c][0], oldPos[c][1]];
		target = [newPos[c][0], newPos[c][1]];
		target = rotate(target, alpha);
		sum += calculateDistance(source, target);
		c += 1;
	};
	return sum;
};

function calculateDistance(source, target) {
	x1 = source[0]; y1 = source[1]; x2 = target[0]; y2 = target[1];
	return Math.sqrt(Math.pow(x1 - x2,2) + Math.pow(y1 - y2,2));
};

function rotate(source, alpha) {
	x = source[0]; y = source[1];
	theta = calculateTheta(x,y);
	r = x / Math.sin(theta);
	newX = r*Math.cos(theta+alpha);
	newY = r*Math.sin(theta+alpha);
	return [newX, newY];
};

function rotatePos(alpha, graph) {
	xs = [];
	ys = [];
	for (k of Object.keys(graph.nodes)) {
		n = graph.nodes[k];
		oldX = n.pos[0];
		oldY = n.pos[1];
		theta = calculateTheta(oldX,oldY);
		r = oldX / Math.sin(theta);
		newX = r*Math.cos(theta+alpha);
		newY = r*Math.sin(theta+alpha);
		xs.push(newX);ys.push(newY);graph.nodes[k].pos[0]=newX;graph.nodes[k].pos[1]=newY;
	};
	graph.xRange = [Math.min.apply(null,xs),Math.max.apply(null,xs)];
	graph.yRange = [Math.min.apply(null,ys),Math.max.apply(null,ys)];
	return graph;
};

function pathPositions(graph, newIds, width, height) {
	gv.pathOrder = [newIds.indexOf(gv.source)]; c = 0; n = newIds.length;
	while (c < n - 1) { gv.pathOrder.push(nextNode(graph, gv.pathOrder)); c += 1};
	newY = height/2 - 10; c = 0; xInt = d3.min([(gv.width - 160)/(n-1), width/5]);
	totalLength = xInt*(n-1); offset = width/2 - totalLength/2;
	while (c < n) {
		graph.nodes[gv.pathOrder[c]].pos[0] = offset + c*xInt; graph.nodes[gv.pathOrder[c]].pos[1] = newY; c += 1;
	};
	return graph;
};

function nextNode(graph, pathOrder) {
	for (link of graph.links) {
		if ( (link.source == [gv.pathOrder[gv.pathOrder.length-1]]) || (link.target == [gv.pathOrder[gv.pathOrder.length-1]]) ) {
			if (gv.pathOrder.indexOf(link.source) == -1 ) {
				return link.source;
			};
			if (gv.pathOrder.indexOf(link.target) == -1 ) {
				return link.target;
			};
		};
	};
};

//Label functions:
function firstLabel(d) {
	if (d.value.name.length < 14) {
		return d.value.name;
	} else {
		splt = d.value.name.split(' ');
		label = splt[0];
		splt.reverse().pop(); splt.reverse();
		while ((label+' '+splt[0]).length < 12) {
			label += ' '+splt[0]
			splt.reverse().pop(); splt.reverse();
		};
		return label;
	};
};

function secondLabel(d) {
	firstLength = firstLabel(d).length + 1;
	label = d.value.name.substring(firstLength,999);
	if (label.length < 14) {
		return label;
	} else {
		splt = label.split(' ');
		label = splt[0];
		splt.reverse().pop(); splt.reverse();
		while ((label+' '+splt[0]).length < 12) {
			label += ' '+splt[0]
			splt.reverse().pop(); splt.reverse();
		};
		if (splt == []) {
			return label;
		} else {
			return label + '...';
		};
	};
};
	
function firstLabelHeight(d) {
	if (firstLabel(d) == d.value.name) {
		return "0.3em";
	} else {
		return "-0.1em";
	};
};

function labelFontSize(d,c) {
	return (labelScale(d.value.popularity)*c).toString() + "px";
};

//Shitty youtube functions:
function performRequests(mode) {
	//console.log(mode);
	var thisTrack = gv.requestTracks[0];

	var stNames = [];
	for (n of thisTrack.artists) {
		stNames.push(standardise(n));
	};

	var stTrack = standardise(thisTrack.name);


	gv.requestTracks.reverse().pop();
	gv.requestTracks.reverse();
	d3.json(youtubeRequestString(removeNames(stNames, stTrack), stNames.join(' ')), function(error, response) {
		if (response.items.length != 0) {
			var score = calculateScore(stTrack, standardise(response.items[0].snippet.title), stNames);
		} else {
			var score = 0;
		};
		if (score > 0.3) {
			var playbtn = playInTable.replace("???", response.items[0].id.videoId+"|"+thisTrack.name+"|" +thisTrack.artists.join("*"));
			playbtn = playbtn.replace(/&&&/g, "");
			gv.tableData.push( {
				"artist": thisTrack.artists.join(", "), 
				"name": thisTrack.name, 
				"id": response.items[0].id.videoId, 
				"play": playbtn
			});
		} else {
			var playbtn = playInTable.replace("???", "");
			playbtn = playbtn.replace(/&&&/g, "disabled='disabled'");
			gv.tableData.push( {
				"artist": '<div class="disabled" style="color:grey;">'+thisTrack.artists.join("*")+'</div>', 
				"name": '<div class="disabled" style="color:grey;">'+thisTrack.name+'</div>', 
				"id": null, 
				"play": playbtn
			});
		};

		$('#'+mode+'YoutubeTable').bootstrapTable('load', gv.tableData);
		$('#'+mode+'YoutubeTable').bootstrapTable('hideLoading');

		if (gv.requestTracks.length != 0) { 
			performRequests(mode); 
		} else { 
			if (gv.tableData.length == 0) {
				gv.tableData.push({
					"title": 'No songs found.', 
					"add": "", 
					"play":""
				}
			)};
	
			$('#'+mode+'YoutubeTable').bootstrapTable('load', gv.tableData);
			$('#'+mode+'YoutubeTable').bootstrapTable('hideLoading');
			$('#'+mode+'YoutubeTable').bootstrapTable('load', gv.tableData);
			//Play tracks on double click
			$('tr').dblclick(function(){
				var playNowButton = $(this).find('.playNowButton');
				console.log(playNowButton);
				if(playNowButton.attr("disabled")){
					//console.log("Can't play track");
				}
				else{
					playNowButton.trigger("click");
				};
			});
			//Plays tracks on click of play now dropdown
			$('.drop-down-play-now').on("click", function(){
				playlistMode();
				$(this).closest('.btn-group').children('.playNowButton').trigger("click");
			});
			$('.drop-down-play-next').on("click", function(){
				playlistMode();
				var s = $(this).closest('.btn-group').children('.playNowButton').val();
				var track = parseTrack(s);
				console.log(track);
				playNextFromDropdown(track);

			});
			$('.drop-down-add-to-playlist').on("click", function(){
				playlistMode();
				var s = $(this).closest('.btn-group').children('.playNowButton').val();
				var track = parseTrack(s);
				addTrackToPlaylist(track);
			});
		};
	});
};

function calculateScore(requestName, responseName, artistNames) {
	requestName = removeNames(artistNames, standardise(requestName));
	responseName = removeNames(artistNames, standardise(responseName));
	a = FuzzySet(); 
	a.add(responseName);
	var check = a.get(requestName);
	if(check === undefined || check === null){
		return 0;
	}
	else{
		return check[0][0];
	};
};

function removeNames(pairNames, trackName) {
	pairNames = pairNames.concat(['featuring', 'feat', 'ft', 'original', 'music', 'official','video', 'explicit', 'version']);
	for (n of pairNames) {
		trackName = trackName.replace(n, '')
	};
	return trackName;
};

function standardise(str) {
	str = str.toLowerCase();
	str = str.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,'');
	return str;
};

//Request string and HTML tag getters:


function youtubeRequestString(trackName, artistNames) {
	return "https://www.googleapis.com/youtube/v3/search?safeSearch=none&part=snippet&q="+artistNames+' '+trackName+"&type=video&maxResults=1&key=AIzaSyBbsBwHRX5Z5OCe-xk8A7CRm159C7rbK0Y";
};

function spotifyTracksRequestString(tracks) {
	return '"https://embed.spotify.com/?uri=spotify:trackset:Phonograph Radio:'+trackIds.join(',')+'&theme=white"'
};

function bioRequestString(id) {
	return "http://developer.echonest.com/api/v4/artist/biographies?api_key=X4WQEZFHWSIJ7OHWF&id=spotify:artist:"+id+"&format=json&results=1&start=0&license=cc-by-sa"
};

function imageRequestString(id) {
	return "https://api.spotify.com/v1/artists/"+id;
};

function twitterRequestString(id) {
	return "http://developer.echonest.com/api/v4/artist/twitter?api_key=X4WQEZFHWSIJ7OHWF&id=spotify:artist:"+id+"&format=json";
};

function imageTag(image) {
	if (!image) {
		return '<img src="static/images/default.jpg" style="max-width: 180px; max-height: 240p" class="img-thumbnail center-block"/>';
	} else {
		return '<img src="'+image+'" style="max-width: 180px; max-height: 240p" class="img-thumbnail center-block"/>';
	};
};

function twitterTag(id) {
	return '<a id="twitterTimeline" height="'+gv.wellheight+'" class="twitter-timeline" href="https://twitter.com/'+id+'" data-widget-id="574576262469009409" text="HAHAHAHAH" data-screen-name="'+id+'">Loading Tweets by @'+id+'</a>';
};

function spotifyIframeTag(tracks) {
	return '<iframe src='+spotifyTracksRequestString(tracks)+' width="'+gv.wellwidth+'" height="'+gv.wellheight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>';
};

function spotifyArtistIframe(id) {
	return '<iframe src="https://embed.spotify.com/?uri=spotify:artist:'+id+'&theme=white" width="'+gv.wellwidth+'" height="'+gv.wellheight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>';
};

//crap for the shitty comment box:
function sendComment() {
	d3.json('/comment?comment='+document.getElementById('commentBox').value, function(error, response) {
		console.log(response);
	})
	document.getElementById('commentSend').value='Thanks!';
	document.getElementById('commentBox').value='';
}

function change() {
	console.log('Change');
	document.getElementById('commentSend').value='Send';
}

$('#commentBox').keypress(function(event){
	console.log('keypress')
	console.log(event)
	console.log(event.which)
   if($(this).keyCode == 13)
   {
       sendComment();
   }     
});

//wut?
var playInTable = "<div class='btn-group'> <button type='button' class='btn btn-info btn-play playNowButton' &&& value='???'><span class='glyphicon glyphicon-play-circle'></span></button> <button type='button' class='btn btn-info btn-play dropdown-toggle' &&& data-toggle='dropdown' aria-expanded='false'> <span class='glyphicon glyphicon-option-horizontal'></span> <span class='sr-only'>Toggle Play Dropdown</span> </button> <ul class='dropdown-menu pull-right' role='menu'> <li><a href='#' class='drop-down-play-now'>Play Now</a></li> <li><a href='#' class='drop-down-play-next'>Play Next</a></li> <li><a href='#' class='drop-down-add-to-playlist'>Add to Playlist</a></li></ul> </div>";