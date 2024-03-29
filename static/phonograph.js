//Main function:
function reload() {
	gv.clickable = false;
	svg.transition().delay(500).duration(1500).style("opacity", 0.3)
	d3.json(flaskURL(), function(error, graph) {
		if (graph.origin) {
			gv.origin = graph.origin;
			gv.currentArtist = graph.origin;
			gv.clickedNode = graph.origin;
		} else {
			gv.origin = null;
		}
		if (!(graph.error)) {
			start_Vis(graph);
		} else {
			console.log('No path found.')
			gv.clickable = true;
			svg.transition().delay(500).duration(500).style("opacity", 1);
		};
	});
};

function flaskURL() {
	url = "/"+gv.route+"?origin="+gv.origin+"&size="+gv.size+"&genre="+gv.genre+"&level="+gv.zoomLevel+"&source="+gv.source+"&destination="+gv.destination+"&core="+gv.core+"&term="+gv.term;
	//console.log(url);
	return(url);
}

function start_Vis(graph) {
	svg.transition().duration(1000).style("opacity", 1)
	var width = $('#map').width();
		nheight = $('#navbar').height();
		height = window.innerHeight - nheight-115;

	gv.wellHeight = window.innerHeight - nheight-170+"px";
	$('#bio').css('height', gv.wellHeight);
	$('.fixed-table-container').attr({"data-height": height+"px"});
	var radius = Math.min(width, height)/2;
		
	svg.attr("width", width).attr("height", height);

	if (width >= height) {
		var hrange = [30, height-30];
		var wrange = [width/2 - height/2, width/2 +  height/2];
	} else {
		var wrange = [30, width-30];
		var hrange = [height/2 - width/2, height/2 +  width/2];
	};

	var popvals = [];
	gv.artist = {};
	for (d of graph.nodes) {
		popvals.push(d3.max([parseInt(d.popularity,10),1]));
		gv.artist[d.id] = {name: d.name, }};

	nodeScale = d3.scale.linear()
						.domain([1, 100])
						.range([10, 20]);
						
	labelScale = d3.scale.log(1.5)
						.domain([1, 100])
						.range([12, 16]);
						
	strokeScale = d3.scale.linear()
						.domain([1, 100])
						.range([2, 4]);
	var weights = [];
	for (d of graph.links) { weights.push(d.weight); };
	var linkCount = graph.links.length

	maxWidthScale = d3.scale.linear().domain([50,400]).range([0,2]);
	widthScale = d3.scale.log()
						.domain([d3.min(weights), d3.max(weights)])	
						.range([0.6, 3 - maxWidthScale(linkCount)]);	

	newNodes = [];
	newIds = [];
	for (n of graph.nodes) {
		newNodes.push(n);
		newIds.push(n.id);
	};

	gv.currentIds = newIds;
	oldNodes = [];
	oldIds = [];
	if (typeof gv.oldGraph != "undefined") { 
		for (n of gv.oldGraph.nodes) {
			oldNodes.push(n);
			oldIds.push(n.id);
		};
	};
	
	toStay = [];
	oldPos = [];
	newPos = [];
	for (n of oldNodes) {
		if (newIds.indexOf(n.id) != -1) {
			toStay.push(n.id);
			oldPos.push(n.pos);
			newPos.push(newNodes[newIds.indexOf(n.id)].pos);
		};
	};
	
	toGo = [];
	for (n of oldIds) {
		if (newIds.indexOf(n)  == -1) {
			toGo.push(n);
		};
	};
	
	if (!(gv.route=="path")) { 
		graph = optimiseRotation(oldPos, newPos, graph);
	} else {
		//gv.radioList = [];
		graph = pathPositions(graph, newIds, width, height);
	};
	
	gv.newGraph = graph;
	//makeRadioList();

	if ( !(gv.route == "path") ) {
		$('.numArtists').show();
		var wScale = d3.scale.linear().domain(graph.xrange).range(wrange);
		var hScale = d3.scale.linear().domain(graph.yrange).range(hrange);
	} else {
		$('.numArtists').hide();
		var wScale = d3.scale.linear();
		var hScale = d3.scale.linear();
	};
	d3.selectAll(".link").attr("class", "oldLink");
	d3.selectAll(".oldLink").transition().duration(gv.FadeOut).style("stroke-width", 0).remove();
	for (n of toGo) {
		d3.select('#a'+n).transition().duration(gv.FadeOut).style("opacity", 0);
		d3.select('#a'+n).attr("class", "toGo");
	};
	
	d3.selectAll(".toGo").transition().delay(gv.FadeOut).remove();
	for (n of toStay) {
		newNode = graph.nodes[newIds.indexOf(n)];
		d3.select('#a'+n).attr("class", "oldNode");
		d3.select('#a'+n).transition().delay(gv.FadeOut).duration(gv.NodeSlide)
			.attr("transform", "translate("+wScale(newNode.pos[0])+","+hScale(newNode.pos[1])+")")
	};
	
	gv.link = svg.selectAll(".link")
		.data(graph.links).enter().append("line")
		.attr("class", "link")
		.attr("x1", function(d) { return wScale(graph.nodes[d.source].pos[0]); })
		.attr("y1", function(d) { return hScale(graph.nodes[d.source].pos[1]); })
		.attr("x2", function(d) { return wScale(graph.nodes[d.target].pos[0]); })
		.attr("y2", function(d) { return hScale(graph.nodes[d.target].pos[1]); })
		.style("stroke-width", 0)
		.on("mouseenter", function(d) {
			if (isHighlighted(d)) {
				d3.select(this).style("stroke-width", function(d) { return 8; })
			} else {
				d3.select(this).style("stroke-width", function(d) { return 5; })
			}
		})
		.on("mouseleave", function(d) {
			if (isHighlighted(d)) { 
				d3.select(this).style("stroke-width", function() { return widthScale(d.weight)*2.5; });
			} else {
				d3.select(this).style("stroke-width", function() { return widthScale(d.weight); });
			};
		})
		.on("click", function(d) {
				if (gv.clickable) {
					clickLink(d);
				};
			});
		
	gv.node = svg.selectAll(".node")
			.data(graph.nodes)
			.enter()
			.append("g")
			.attr("class", "node")
			.attr("id", function(d) { return 'a' + d.id })
			.attr("transform", function(d) { return 'translate('+wScale(d.pos[0])+','+hScale(d.pos[1])+')' })
			.style("opacity", 0)
			.on("click", function(d) {
				if (gv.clickable) {
					clickNode(d);
				};
				d3.event.stopPropagation(); 
			})
			.on("dblclick", function(d) { 
				d3.event.stopPropagation();
				if ((d.id != gv.origin)&&(gv.clickable)) {
					gv.origin = d.id;
					gv.route = "neighbourhood"
					//resetZoomLevel();
					reload();	
				};
			});
			
	
	gv.node.append("circle")
		.attr("class", function(d) {
			return "ncircle "+d.genre;
		})
		.attr("r", function(d) {////console.log(d.popularity);
			if (d.id == gv.origin) {
					return 30;
				};
			return nodeScale(d3.max([1,d.popularity]));
		})
		.attr("stroke-width", function(d) { 
			if (d.id == gv.origin) {
					return 4;
				};
			return strokeScale(d.popularity);
		});
	
	gv.node.append("text")
		.attr("class", "firstLabel")
		.attr("dy", function(d) {return firstLabelHeight(d); })
		.attr("text-anchor", "middle")
		.style("font-size", function(d) {
			if (d.id == gv.origin) {
				return "18px";
			};
			return firstLabelFont(d); })
		.text(function(d) {
			return firstLabel(d);
		});	
	
	gv.node.append("text")
		.attr("class", "secondLabel")
		.attr("dy", function(d) { return "0.9em"; })
		.attr("text-anchor", "middle")
		.style("font-size", function(d) {
			if (d.id == gv.origin) {
				return "18px";
			};
			return secondLabelFont(d); })
		.text(function(d) {
			return secondLabel(d);
		});	
										
	gv.oldGraph = graph;
	
	d3.selectAll(".oldNode").transition().delay(gv.FadeOut+gv.NodeSlide+gv.FadeIn).remove();
	d3.selectAll(".node").transition().delay(gv.FadeOut+gv.NodeSlide).duration(gv.FadeIn).style("opacity", 1);
	
	setTimeout( function() {
		dehighlightLinks();
		if (gv.route == 'zoom' || gv.route == 'neighbourhood') {
			loadArtistInfo();
		};
		if (gv.playMode == 'radio') {
			//loadRadio(true);
		};
		gv.clickable = true;
	}, gv.FadeOut+gv.FadeIn+gv.NodeSlide);

	gv.FadeOut = 600;
	gv.NodeSlide = 1000;
};	

//Initialise variables:
var dir = "full";
var initFromURL = false;
var gv = {};
gv.route = "neighbourhood"
gv.origin = null;
gv.zoomLevel = 1;
gv.genre = null;
gv.term = null;
gv.source = null;
gv.destination = null;
gv.core = null;
gv.sidebars = [];
gv.customList = [];
gv.customListTable = [];
gv.currentSidebar = 0;
gv.artistList = [];
gv.pathOrder = [];
gv.currentService = "youtube";
gv.playlist = [];
gv.size = 20;
gv.clickable = true
gv.clicked = null;
gv.clickedNode = null;
gv.currentArtist = null;
gv.currentLink = null;
gv.clickedRadius = 30;
gv.clickedStrokeWidth = 4;
//gv.playMode = 'radio';
var width, height;
var svg = d3.select("#map").append("svg")
	.attr("id", "svg")
	.attr("class", "svg")
	.on("click", function() { 
		if (gv.clickable) {
			gv.clickedNode = null;
			highlightNode();
			dehighlightLinks();
		};
	})
	
//Animation variables.
gv.FadeOut = 0;
gv.NodeSlide = 0;
gv.FadeIn = 500;


var width = $('#map').width();
var nwidth = $('#playlistDropdown').width();
var height = window.innerHeight;
var nheight= $('#playerlistDropdown').height();
gv.wellHeight = window.innerHeight - nheight-170;
gv.wellWidth = $('#sidebar').width()-40;
$('#bio').css('max-height', gv.wellHeight+"px");
$('.fixed-table-container').attr("data-height", gv.wellHeight+"px");
$('#playlistDD').css({"height": height/2 +"px"});
/*$('#radioDD').css({
	"height": height/2 +"px",
	"left": -1*nwidth+"px"
});
*/

$('#sidebar').css('min-height', window.innerHeight+"px");
//var heightOfZoom = $('#zoom').height();

//$('#zoom').css({'left': '20px', 'top': height - heightOfZoom - 74 +'px'});

$('#subgraphTable').bootstrapTable({
        data: ""
});

$('#nodetable').attr("data-height", gv.wellHeight);
$('#nodeYoutubeTable').attr("data-height", gv.wellHeight);
$('#nodeYoutubeTable').bootstrapTable('resetView');
$('#edgeYoutubeTable').attr("data-height", gv.wellHeight);
$('#edgeYoutubeTable').bootstrapTable('resetView');
/*$('#radioYoutubeTable').attr("data-height", gv.wellHeight);
$('#radioYoutubeTable').bootstrapTable('resetView')*/
$('#subgraphTable').attr("data-height", gv.wellHeight-nheight-nheight);
$('#subgraphTable').bootstrapTable('resetView');

$('#artistOptions').on('click', function(){
	$('#artistSearch').val(gv.currentArtistName);
});

/*var URL = document.URL
console.log(URL);
/*
if(URL.length !== 1){
	initFromURL = true;
	var gv.route = URL[1].split("&seed=")[0];
	var seed = URL[1].split("&seed=")[1];	
}
*/
reload();

//Supplementary functions:
//Action functions:
function clickNode(d) {
	gv.currentLink = null;
	gv.clickedNode = d.id;
	highlightNode();
	highlightLinks();
	if (gv.currentArtist != d.id) {
		gv.currentArtist = d.id;
		loadArtistInfo();
		tabSwitch('node');
	}
};

function highlightNode() {
	d3.selectAll('circle').transition().duration(500)
		.attr('r', function(d) {
			if (d.id == gv.clickedNode) {
				return gv.clickedRadius; 
			} else {
				return nodeScale(d.popularity)
			};
		})
		.attr('stroke-width', function(d) {
			if (d.id == gv.clickedNode) {
				return gv.clickedStrokeWidth; 
			} else {
				return strokeScale(d.popularity)
			};
		});
	d3.selectAll('.firstLabel').transition().duration(500)
		.style('font-size', function(d) {
			if (d.id == gv.clickedNode) {
				return "18px"; 
			} else {
				return firstLabelFont(d);
			};
		});
	d3.selectAll('.secondLabel').transition().duration(500)
		.style('font-size', function(d) {
			if (d.id == gv.clickedNode) {
				return "18px"; 
			} else {
				return secondLabelFont(d);
			};
		});
}

function unclickNode() {
	if (gv.clicked) {
		console.log('unclicking')
		elt = gv.node.filter(function(d, i) { return (d.id==gv.clicked); });
		elt.select(".firstLabel").transition().duration(500)
			.style("font-size", function(d) { return firstLabelFont(d); });
		elt.select(".secondLabel").transition().duration(500)
			.style("font-size", function(d) { return secondLabelFont(d); })
			.attr("dy", "0.9em");
		elt.select("circle").transition()
			.duration(500)
			.attr("r", function(d) { return nodeScale(d.popularity); })
			.attr("stroke-width", function(d) { return strokeScale(d.popularity); })
			.style("fill-opacity", 1);
		gv.clicked = null;
	};
};

function loadArtistInfo() {
	gv.currentArtistName = gv.artist[gv.currentArtist].name;
	console.log(gv.artist);
	id  = gv.currentArtist;
	$('#node-title').text(gv.currentArtistName);
	d3.json("http://developer.echonest.com/api/v4/artist/biographies?api_key=X4WQEZFHWSIJ7OHWF&id=spotify:artist:"+id+"&format=json&results=1&start=0&license=cc-by-sa", function(error, response) {
		if(error){
			d3.select('#bioText').text("Biography not found in database");
		}
		else{
			var bio = response.response.biographies[0].text;
			////console.log(bio);
			d3.select('#bioText').text(bio);
		}
	});
	d3.json("http://developer.echonest.com/api/v4/artist/images?api_key=X4WQEZFHWSIJ7OHWF&id=spotify:artist:"+id+"&format=json&results=1&start=0", function(error, response) {
		if(error){
			d3.select('#artistImage').html( function() { return '<img src="static/images/default.jpg" style="max-width: 180px; max-height: 240p" class="img-thumbnail center-block"/>'; });
		}
		else{
			var image = response.response.images[0].url;
			d3.select('#artistImage').html( function() { return '<img src="'+image+'" style="max-width: 180px; max-height: 240p" class="img-thumbnail center-block"/>'; });

		};
	});

	d3.json("http://developer.echonest.com/api/v4/artist/twitter?api_key=X4WQEZFHWSIJ7OHWF&id=spotify:artist:"+id+"&format=json", function(error, response) {
		var twttrId = response.response.artist.twitter;
		if (typeof(twttrId)!= "undefined") {
			d3.select('#twitter').html('<a id="twitterTimeline" height="'+gv.wellHeight+'" class="twitter-timeline" href="https://twitter.com/'+twttrId+'" data-widget-id="574576262469009409" text="HAHAHAHAH" data-screen-name="'+twttrId+'">Loading Tweets by @'+twttrId+'</a>');
			twttr.widgets.load();
		} else {
			d3.select('#twitter').html('<p><em>Twitter account not found.</em></p>');
		};
	});

	if (gv.currentService=="spotify") {
		d3.select('#nodeIframe').html('<iframe src="https://embed.spotify.com/?uri=spotify:artist:'+id+'&theme=white" width="'+gv.wellWidth+'" height="'+gv.wellHeight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>');
	};

	if (gv.currentService == 'youtube') {
		d3.json("https://api.spotify.com/v1/artists/"+id+"/top-tracks?country=GB", function (error, response) {
			gv.requestTracks = [];
			console.log(response);
			for (track of response.tracks) {
				artistNames = [];
				for (artist of track.artists) {
					artistNames.push(artist.name);
				};
				parsedTrack = {'id': track.id, 'name': track.name, 'artists': artistNames};
				console.log(parsedTrack);
				gv.requestTracks.push(parsedTrack);
			};
			gv.tableData = [];
			performRequests('node');
		});
	};
};

function get_url(relations, type) {
	for (rel of relations) {
		if (rel.type == type) {
			return rel.url.resource;
		};
	};
};

function parseTrack(s){
	var trackData = s.split("|");
	//console.log(trackData);
	if(typeof trackData[2] === 'undefined'){
	  trackData[2] = "Artist";
	};
	var track = {
		"youtubeId" : trackData[0],
		"name" : trackData[1],
		"artists" : trackData[2].split("*")
	};
	return track;
}

function performRequests(mode) {
	//console.log(mode);
	var thisTrack = gv.requestTracks[0];

	var stNames = [];
	for (n of thisTrack.artists) {
		stNames.push(standardise(n));
	};

	var stTrack = standardise(thisTrack.name);

	var yt = yt_requestString(removeNames(stNames, stTrack), stNames.join(' '))

	gv.requestTracks.reverse().pop();
	gv.requestTracks.reverse();
	d3.json(yt, function(error, ytresponse) {
		if (ytresponse.items.length != 0) {
			var score = calculateScore(stTrack, standardise(ytresponse.items[0].snippet.title), stNames);
		} else {
			var score = 0;
		};
		if (score > 0.3) {
			console.log(thisTrack.artists);
			var playbtn = playInTable.replace("???", ytresponse.items[0].id.videoId+"|"+thisTrack.name+"|" +thisTrack.artists.join("*"));
			playbtn = playbtn.replace(/&&&/g, "");
			gv.tableData.push( {
				"artist": thisTrack.artists.join(", "), 
				"name": thisTrack.name, 
				"id": ytresponse.items[0].id.videoId, 
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
		//console.log(gv.tableData)

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
			//console.log(gv.tableData);
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

/*
function performRadioRequests(mode) {
	if (mode == 'upNext') {
		gv.nowPlaying = gv.upNext;
	};
	console.log('performRadioRequests' + mode)
	console.log(gv.radioList);
	var thisTrack = gv.radioList[0];
	var stNames = [];
	for (n of thisTrack.artists) {
		stNames.push(standardise(n));
	};

	var stTrack = standardise(thisTrack.name);

	var yt = yt_requestString(removeNames(stNames, stTrack), stNames.join(' '))

	d3.json(yt, function(error, ytresponse) {
		if (ytresponse.items.length != 0) {
			var score = calculateScore(stTrack, standardise(ytresponse.items[0].snippet.title), stNames);
			var youtubeId = ytresponse.items[0].id.videoId;
			console.log(score);
			console.log(youtubeId);
			if (score > 0.3) {
				gv.upNext = gv.radioList[0];
				gv.upNext.youtubeId = youtubeId;
				gv.radioList.reverse().pop();
				gv.radioList.reverse();
				if (mode == 'nowPlaying') {	
					if (!(gv.nowPlaying)) {
						performRadioRequests('upNext')
						if(gv.playMode == 'radio') {
							phonograph();
						};
					}
				}
				$('#radio-now-playing-name').text(gv.nowPlaying.name);
				$('#radio-now-playing-artists').text(parseArtists(gv.nowPlaying));
				$('#radio-up-next-name').text(gv.upNext.name);
				$('#radio-up-next-artists').text(parseArtists(gv.upNext));
			} else {
				gv.radioList.reverse().pop();
				gv.radioList.reverse();
				//console.log(gv.radioList);
				performRadioRequests(mode);
			};
		};
	});
};
*/
function loadEdgeInfo(){
	d = gv.currentLink;
	var linkId = [gv.newGraph.nodes[d.source].id, gv.newGraph.nodes[d.target].id].sort().join(',');
	var names = gv.newGraph.nodes[d.source].name +" & "+gv.newGraph.nodes[d.target].name;
	d3.json("/edgeLookup?seed="+linkId, function(error, response) {
		//console.log(response);
		if(gv.currentService=="spotify") {
			trackIds = [];
			for (track of response.tracks) {
				trackIds.push(track.id);
			};
			spotifyUrl = '"https://embed.spotify.com/?uri=spotify:trackset:Phonograph Radio:'+trackIds +'&theme=white"'
			d3.select('#edgeIframe').html( function() { return '<iframe src='+spotifyUrl+' width="'+gv.wellWidth+'" height="'+gv.wellHeight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>'; });
		};
		$('#edge-title').text(names);
		if(gv.currentService == "youtube") {
			gv.requestTracks = response.tracks;
			gv.tableData = [];
			performRequests('edge');
		};	
	});
};

function clickLink(d) {
	d3.event.stopPropagation();
	//addToSidebarHistory(1, d);
	gv.currentArtist = null;
	if (gv.currentLink != d) {
		gv.currentLink = d;
		loadEdgeInfo();
		tabSwitch('edge');
	}
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
		return check[0][0]; //return score;
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

function highlightLinks() {
	d3.selectAll(".link").transition().duration(500)
		.style("stroke-width", function(d) { 
			if (isHighlighted(d)) {
				return widthScale(d.weight)*2.5;
			} else {return 0;};	
		});
	};

function dehighlightLinks(dur) {
	if (typeof(dur) == "undefined") { dur = 500;}
	d3.selectAll(".link").transition().duration(dur)
		.style("stroke-width", function(d) { return widthScale(d.weight); });
};

function firstLabel(d) {
	if (d.name.length < 16) {
		return d.name;
	} else {
		splt = d.name.split(' ');
		label = splt[0];
		splt.reverse().pop(); splt.reverse();
		while ((label+' '+splt[0]).length < 14) {
			label += ' '+splt[0]
			splt.reverse().pop(); splt.reverse();
		};
		return label;
	};
};

function secondLabel(d) {
	firstLength = firstLabel(d).length + 1;
	label = d.name.substring(firstLength,999);
	if (label.length < 16) {
		return label;
	} else {
		splt = label.split(' ');
		label = splt[0];
		splt.reverse().pop(); splt.reverse();
		while ((label+' '+splt[0]).length < 14) {
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
	if (firstLabel(d) == d.name) {
		return "0.3em";
	} else {
		return "-0.2em";
	};
};

function firstLabelFont(d) {
	return labelScale(d.popularity).toString() + "px";
};

function secondLabelFont(d) {
	return (labelScale(d.popularity)*0.85).toString() + "px";
};

function isHighlighted(d) {
		return (gv.clickedNode == gv.oldGraph.nodes[d.source].id) || (gv.clickedNode == gv.oldGraph.nodes[d.target].id);
	return false;
};

function yt_requestString(trackName, artistNames) {
	return "https://www.googleapis.com/youtube/v3/search?safeSearch=none&part=snippet&q="+artistNames+' '+trackName+"&type=video&maxResults=1&key=AIzaSyBbsBwHRX5Z5OCe-xk8A7CRm159C7rbK0Y";
};

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
	for (n of graph.nodes) {
		oldX = n.pos[0]
		oldY = n.pos[1]
		theta = calculateTheta(oldX,oldY);
		r = oldX / Math.sin(theta);
		newX = r*Math.cos(theta+alpha);
		newY = r*Math.sin(theta+alpha);
		xs.push(newX);ys.push(newY);n.pos[0]=newX;n.pos[1]=newY;
	};
	graph.xrange = [Math.min.apply(null,xs),Math.max.apply(null,xs)];
	graph.yrange = [Math.min.apply(null,ys),Math.max.apply(null,ys)];
	return graph;
};

function pathPositions(graph, newIds, width, height) {
	gv.pathOrder = [newIds.indexOf(gv.source)]; c = 0; n = newIds.length;
	while (c < n - 1) { gv.pathOrder.push(nextNode(graph, gv.pathOrder)); c += 1};
	newY = height/2 - 10; c = 0; xInt = d3.min([(width - 160)/(n-1), width/5]);
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
				//gv.radioList.push(link.track);
				return link.source;
			};
			if (gv.pathOrder.indexOf(link.target) == -1 ) {
				//gv.radioList.push(link.track.id);
				return link.target;
			};
		};
	};
};

function compare(a,b) {
  if (parseInt(a.popularity,10) > parseInt(b.popularity,10))
     return -1;
  if (parseInt(a.popularity,10) < parseInt(b.popularity,10))
    return 1;
  return 0;
}
/*
function fillRadioTitle(){
	gv.radioTitle = "";
	if (gv.route == "zoom" || gv.route == "neighbourhood"){
		console.log(gv.origin);
		gv.radioTitle = getName(gv.origin) + ' Radio';
	};
	if (gv.route == "path") {
		gv.radioTitle = getName(gv.source)+' to '+getName(gv.destination) + " Radio";
	}
	if (gv.route == 'termsubgraph') {
		gv.radioTitle = gv.termLabel + ' Radio'
	};
	console.log(gv.radioTitle);
	$('#radio-title').text(gv.radioTitle);
};
*/
function getName(id) {
	for (d of gv.newGraph.nodes) {
		if (d.id == id) {
			return d.name;
		}
	}
};
/*
function loadRadio(firstTime) {
	radioAlert();
	fillRadioTitle();
	if ((gv.currentService == 'youtube')) {
		performRadioRequests('nowPlaying');
	};
	if (gv.currentService == 'spotify') {
		trackIds = [];
		for (track of gv.radioList) {
			trackIds.push(track.id);
		};
		loadSpotify(trackIds);
	};
};
*/
function loadSpotify(tracks) {
	spotifyUrl = '"https://embed.spotify.com/?uri=spotify:trackset:Phonograph Radio:'+trackIds.join(',')+'&theme=white"'
	//d3.select('#radioIframe').html( function() { return '<iframe src='+spotifyUrl+' width="'+gv.wellWidth+'" height="'+gv.wellHeight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>'; });

}
/*
function makeRadioList() {
	if (gv.route!="path") {
		gv.radioList = [];
		gv.radioListIds = [];
		for (l of gv.newGraph.links) {
			if (gv.radioListIds.indexOf(l.track.id) == -1) {
				gv.radioList.push(l.track);
				gv.radioListIds.push(l.track.id);
			}
		};
		gv.radioList.sort(compare)
	};
}
*/
function tabSwitch(pane) {
	$('#artistSearch').val("");
	$('#info').toggle(true);
	$('#playlistPane').toggle(false);
	//$('#subgraphPane').toggle(false);

	//console.log("switching to "+pane);
	if (pane == "edge") {
		for (elt of ["nodeTab", "nodePane"]) {
			d3.select('#'+elt).classed("active", false);
		};
		for (elt of ["nodeTab"]){
			$('#'+elt).hide();
		}	
		for (elt of ["edgeTab", "edgePane"]) {
			d3.select('#'+elt).classed("active", true);
			$('#'+elt).show();
		};
	}
	
	else if (pane == "node") {
		for (elt of ["edgeTab", "edgePane"]) {
			d3.select('#'+elt).classed("active", false);
		};
		for (elt of ["edgeTab"]){
			$('#'+elt).hide();
		}
		for (elt of ["nodeTab", "nodePane"]) {
			d3.select('#'+elt).classed("active", true);
			$('#'+elt).show();
		};
	}

	else{
		console.log("ERROR IN TAB SWITCHING FUNCTION");
	};

};

function setAutocomplete(){
	//Search bar.
	$( ".artist" ).autocomplete({
		source: function(request, response) {
			$.getJSON('/autocomplete?terms='+request.term.split(' ').join(','), function (data) {
				response(data.response);
			});
		},
	    select: function(event, ui) {
	    	this.value = '';
	    	gv.origin = ui.item.value;
	    	gv.route = "neighbourhood"
	    	gv.genre = null;
	    	//resetZoomLevel();
	    	reload();
	    	event.preventDefault();
	    },
	    delay: 100,
	    messages: {
	        noResults: 'No artists found.',
	        results: function() {}
	    },
	});

	//Search bar.
	$( ".term" ).autocomplete({
		source: function(request, response) {
			$.getJSON('/genresearch?terms='+request.term.split(' ').join(','), function (data) {
				response(data.response);
			});
		},
	    select: function(event, ui) {
	    	this.value = '';
	    	gv.term = ui.item.value
	    	gv.termLabel = ui.item.label;
	    	gv.route = "termsubgraph"
	    	gv.origin = null;
	    	gv.genre = null;
	    	//resetZoomLevel();
	    	reload();
	    	event.preventDefault();
	    },
	    delay: 100,
	    messages: {
	        noResults: 'No artists found.',
	        results: function() {}
	    },
	});

	//Search bar.
	$( ".path" ).autocomplete({
		source: function(request, response) {
			$.getJSON('/autocomplete?terms='+request.term.split(' ').join(','), function (data) {
				response(data.response);
			});
		},
	    select: function(event, ui) {
	    	//console.log("PATH SELECT");
	    	event.preventDefault();
	    	this.value = ui.item.label;
	    	gv.source = ui.item.value;
	    },
	    delay: 100,
	    messages: {
	        noResults: 'No artists found.',
	        results: function() {}
	    },
	});

	//Search bar forTRAVEL TO.
	$( "#destination" ).autocomplete({
		source: function(request, response) {
			$.getJSON('/autocomplete?terms='+request.term.split(' ').join(','), function (data) {
				response(data.response);
			});
		},
	    select: function(event, ui) {
	    	this.value = ui.item.label;
	    	gv.destination = ui.item.value;
	    	gv.route = "path"
	    	gv.genre = null;
	    	//resetZoomLevel();
	    	event.preventDefault();
	    },
	    delay: 100,
	    messages: {
	        noResults: 'No artists found.',
	        results: function() {}
	    },
	});

};

$('#search-button').on("click", function(){
	reload();
});

setAutocomplete();
/* NO SUBGRAPH AT PRESENT TIME
function checkForSubGraphRemoval(){
	$('.removeFromSubGraph').on("click", function(){
		var index = $(this).closest('tr').attr("data-index");
		gv.customList.splice(index, 1);
		gv.customListTable.splice(index,1);
		$('#subgraphTable').bootstrapTable('load', gv.customListTable);
		$('#subgraphTable').bootstrapTable('resetView');
		checkForSubGraphRemoval();

	});
};
//CUSTOM SUBGRAPHER.
$( "#addtoSubgraph" ).autocomplete({
	source: function(request, response) {
		$.getJSON('/autocomplete?terms='+request.term.split(' ').join(','), function (data) {
			response(data.response);
		});
	},
    select: function(event, ui) {
    	this.value = '';
    	chosen = ui.item.value;
    	event.preventDefault();
    	gv.customList.push(chosen);
    	gv.customListTable.push({
    		"name": ui.item.label,
    		"remove": '<button class="btn-sm btn-sidebar removeFromSubGraph" id="remove'+ui.item.value+'"><i class="el el-remove-sign"></i></button>'
    	})
    	$('#subgraphTable').bootstrapTable('load', gv.customListTable);
    	$('#subgraphTable').bootstrapTable('resetView');
    	checkForSubGraphRemoval();

    },
    delay: 100,
    messages: {
        noResults: 'No artists found.',
        results: function() {}
    },
});
*/


function addToSidebarHistory(cat, object){
	gv.sidebars.splice(1+gv.currentSidebar, gv.sidebars.length-gv.currentSidebar, [cat, object]);
	gv.currentSidebar=gv.sidebars.length-1;
}

$('#generateSubgraph').on('click', function() {
	gv.route = "custom"
	gv.core = (gv.customList.join(','));
	gv.genre = null;
	gv.origin = null;
	resetZoomLevel();
	reload();
});
/*
function sideBarBack(){
	//console.log(gv.currentSidebar);
	//console.log(gv.sidebars);
	if (gv.currentSidebar < gv.sidebars.length && gv.currentSidebar > 0) {
		//console.log("Going Back"); 
		gv.currentSidebar -= 1;
		var previousSidebar = gv.sidebars[gv.currentSidebar];
		////console.log(previousSidebar);
		if(previousSidebar[0]===0){
			loadArtistInfo(previousSidebar[1]);
		}
		else if (previousSidebar[0] === 1) {
			getLinkInfo(previousSidebar[1]);
		}
		else if (previousSidebar[0]===2){
			loadPathInfo(previousSidebar[1]);
		}
		else{
			alert("ERROR IN BACK BUTTON");
		};
	}
	else{
		//console.log("Cannot go Back");
	};

};

$('#sidebarBack').on('click', function() {
	sideBarBack();
});

$('#sidebarForward').on('click', function() {
	if (gv.currentSidebar  < gv.sidebars.length-1) {
		//console.log("Going Forward");
		gv.currentSidebar += 1;
		var nextSidebar = gv.sidebars[gv.currentSidebar]
		if(nextSidebar[0]===0){
			loadArtistInfo(nextSidebar[1]);
		}
		else if (nextSidebar[0] === 1) {
			getLinkInfo(nextSidebar[1]);
		}
		else if (nextSidebar[0] === 2){
			loadPathInfo(nextSidebar[1]);
		}
		else{
			alert("ERROR IN FORWARD BUTTON");
		}
	}
	else{
		//console.log("Cannot go Forward");
	}
});

*/
/*function highlightZoomLevel(){
	$('.zL').each(function(){
		if($(this).attr('id').replace("zoomL","") == gv.zoomLevel){
			$(this).addClass("btn-primary");
			$(this).removeClass("btn-default");
		}
		else{
			$(this).addClass("btn-default");
			$(this).removeClass("btn-primary");
		};
	});
};

function disableZoom(){
	if(gv.zoomLevel == 1){
		$('.zo').addClass('btn-default').removeClass('btn-disabled').prop("disabled", false);
		$('.zi').addClass('btn-disabled').removeClass('btn-default').prop("disabled", true);
	}
	else if(gv.zoomLevel == 3){
		$('.zi').addClass('btn-default').removeClass('btn-disabled').prop("disabled", false);
		$('.zo').addClass('btn-disabled').removeClass('btn-default').prop("disabled", true);
	}
	else{
		$('.zi').addClass('btn-default').removeClass('btn-disabled').prop("disabled", false);
		$('.zo').addClass('btn-default').removeClass('btn-disabled').prop("disabled", false);
	}
};

function zoom(){
	gv.route = "zoom";
	gv.genre = null;
	if (gv.currentArtist) {
		gv.origin = gv.currentArtist;
	} else {
		gv.origin = gv.currentIds[Math.floor(gv.currentIds.length * Math.random())];
	};
	highlightZoomLevel();
	disableZoom();
	reload();
};

function resetZoomLevel() {
	gv.zoomLevel = 1;
	disableZoom();
	highlightZoomLevel();
}
//ON CLICK OF ZOOM LEVEL MOVE TO THAT LEVEL
$('.zL').click(function(){
	var newZoomLevel = $(this).attr('id').replace("zoomL",""); //GET NEW ZOoM LEVEL FROM BUTTON
	////console.log("MOVING TO ZOOM LEVEL "+newZoomLevel);
	if (newZoomLevel != gv.zoomLevel) {
		gv.zoomLevel = newZoomLevel;
		zoom();
	};
})

$('.zo').click(function() { 
	if ((gv.zoomLevel < 3)&&(gv.clickable)) {
		gv.zoomLevel += 1;
		zoom();
	}
});

$('.zi').click(function() {
	if ((gv.zoomLevel > 1)&&(gv.clickable)) {
		gv.zoomLevel -= 1;
		zoom();
	}
});
*/
$('#genre').change(function(){
	var newGenre = $('#genre option:selected')[0].value;
	//console.log(newGenre);
	if (gv.genre != newGenre) {
		gv.genre = newGenre;
		gv.route = "neighbourhood"
		gv.origin = null;
		reload();
	};
});

$('#ns').change(function(){
	var newSize = $('#ns option:selected')[0].value;
	if ( (gv.size!=newSize && (gv.clickable) ) ) {
		gv.size = newSize;
		reload();
	};
});
/*
$('#urlShare').click(function(){
    var root = location.protocol + '//' + location.host;
    var params = flaskURL().replace("/neighbourhood?", "");
    console.log(params);
	console.log(root);
	d3.select('#URL').property({'value': root+"/?" +flaskURL()});
});
*/
//CHECK FOR SearchType
$('.search-choice').on('click', function(){
	var searchType = $(this).attr("id").replace("search-choice-", "");
	var newIcon = $(this).children('i').clone();
	$('#searchType').children().first().replaceWith(newIcon);
	var searchAutoComplete = $('#searchAutoComplete');
	searchAutoComplete.removeClass("artist");
	searchAutoComplete.removeClass("path");
	searchAutoComplete.removeClass("term");
	searchAutoComplete.addClass(searchType);
	if(searchType =="artist"){
		$('#destination').hide(500)
		searchAutoComplete.attr("placeholder", "Search by Artist");
	}
	else if(searchType =="term"){
		$('#destination').hide(500)
		searchAutoComplete.attr("placeholder", "Search by Term");
	}
	else if(searchType == "path"){
		$('#destination').show(500)
		searchAutoComplete.attr("placeholder", "Starting Artist...");
	};
	setAutocomplete();
});

//KEEP PLAYLIST OPEN UNLESS CLICKING ICON


$('#playlistICON').on("click", function(e){
	$('#playlistDropdown').toggleClass("open");
	//$('#radioDropdown').removeClass("open");
	e.stopPropagation();
});
////////////

$('#playlistDropdown').on('hide.bs.dropdown', function (e) {
	e.preventDefault();
});
/*
$('#radioICON').on("click", function(e){
	//$('#radioDropdown').toggleClass("open");
	$('#playlistDropdown').removeClass("open");
	e.stopPropagation();
	loadRadio(false);
})

////////////

//var oldplaybutton = "<button class='btn-sm btn-sidebar playNowButton' type='button' value='"+ytresponse.items[0].id.videoId+"|"+thisTrack.name+"|" +thisTrack.artists.join("*")+"'><i class='el el-play'></i></button>";
*/

var playInTable = "<div class='btn-group'> <button type='button' class='btn btn-info btn-play playNowButton' &&& value='???'><i class='fa fa-play-circle fa-lg'></i></button> <button type='button' class='btn btn-info btn-play dropdown-toggle' &&& data-toggle='dropdown' aria-expanded='false'> <span class='caret'></span> <span class='sr-only'>Toggle Play Dropdown</span> </button> <ul class='dropdown-menu pull-right' role='menu'> <li><a href='#' class='drop-down-play-now'>Play Now</a></li> <li><a href='#' class='drop-down-play-next'>Play Next</a></li> <li><a href='#' class='drop-down-add-to-playlist'>Add to Playlist</a></li></ul> </div>";

$('#svg').on("click", function(){
	if($('#playlistDropdown').hasClass("open")){
		$('#playlistICON').trigger("click");
	};
});






























































