//Main function:
function reload() {
	gv.clickable = false;
	svg.transition().delay(1000).duration(1000).style("opacity", 0.3)
	d3.json(flaskURL(), function(error, graph) {
		start_Vis(graph);
	});
};

function flaskURL() {
	url = "/"+gv.route+"?origin="+gv.origin+"&size="+gv.size+"&genre="+gv.genre+"&level="+gv.zoomLevel+"&source="+gv.source+"&destination="+gv.destination+"&core="+gv.core+"&term="+gv.term;
	console.log(url);
	return(url);
}

function start_Vis(graph) {
	svg.transition().duration(1000).style("opacity", 1)
	var width = $('#map').width();
		nheight = $('#navbar').height();
		height = window.innerHeight - nheight-100;

	var wellHeight = window.innerHeight - nheight-170+"px";
	$('#bio').css('max-height', wellHeight);
	$('.fixed-table-container').attr("data-height", wellHeight);
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
	for (d of graph.nodes) { popvals.push(d3.max([parseInt(d.popularity,10),1])) };
	//console.log(popvals);
	//console.log(d3.min(popvals));
	nodeScale = d3.scale.log(1.5)
						.domain([d3.min(popvals), d3.max(popvals)])
						.range([10, 20]);
						
	labelScale = d3.scale.log(1.5)
						.domain([d3.min(popvals), d3.max(popvals)])
						.range([12, 15]);
						
	strokeScale = d3.scale.linear()
						.domain([d3.min(popvals), d3.max(popvals)])
						.range([1, 4]);
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
		graph = pathPositions(graph, newIds, width, height);
	};
	
	gv.newGraph = graph;
	
	loadRadio();

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
	
	var link = svg.selectAll(".link")
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
		
	var node = svg.selectAll(".node")
			.data(graph.nodes)
			.enter()
			.append("g")
			.attr("class", "node")
			.attr("id", function(d) { return 'a' + d.id })
			.attr("transform", function(d) { return 'translate('+wScale(d.pos[0])+','+hScale(d.pos[1])+')' })
			.style("opacity", 0)
			.on("click", function(d) {
				if ( (clicked != this)&&(gv.clickable) ) {
					clickNode(this, d, true);
				};
				d3.event.stopPropagation(); 
			})
			.on("dblclick", function(d) { 
				d3.event.stopPropagation();
				if ((d.id != gv.origin)&&(gv.clickable)) {
					gv.origin = d.id;
					resetZoomLevel();
					reload();	
				};
			});
			
	
	node.append("circle")
		.attr("class", function(d) {
			return "ncircle "+d.genre;
		})
		.attr("r", function(d) {//console.log(d.popularity);
			if ((gv.origin != null)&&(clicked)) {
				if (d.id == gv.origin) {
					return 30;
				};
			};
			return nodeScale(d3.max([1,d.popularity]));
		})
		.attr("stroke-width", function(d) { 
			if (gv.origin != null) {
				if (d.id == gv.origin) {
					return 4;
				};
			};
			return strokeScale(d.popularity);
		});
	
	node.append("text")
		.attr("class", "firstLabel")
		.attr("dy", function(d) {return firstLabelHeight(d); })
		.attr("text-anchor", "middle")
		.style("font-size", function(d) {
			if (gv.origin != null) {
				if (d.id == gv.origin) {
					return "18px";
				};
			};
			return firstLabelFont(d); })
		.text(function(d) {
			return firstLabel(d);
		});	
	
	node.append("text")
		.attr("class", "secondLabel")
		.attr("dy", function(d) { return "0.9em"; })
		.attr("text-anchor", "middle")
		.style("font-size", function(d) {
			if (gv.origin != null) {
				if (d.id == gv.origin) {
					return "18px";
				};
			};
			return secondLabelFont(d); })
		.text(function(d) {
			return secondLabel(d);
		});	
										
	gv.oldGraph = graph;
	
	d3.selectAll(".oldNode").transition().delay(gv.FadeOut+gv.NodeSlide+gv.FadeIn).remove();
	d3.selectAll(".node").transition().delay(gv.FadeOut+gv.NodeSlide).duration(gv.FadeIn).style("opacity", 1)
		.each("end", function(d) {
			if (gv.origin != null) {
				if (d.id == gv.origin) {
					if (gv.route == "zoom") {
						clickNode(this, d, false);
					} else {
						clickNode(this, d, true);
					};
				};
			} else {
				gv.currentArtist = gv.currentIds[Math.floor(gv.currentIds.length * Math.random())];
				dehighlightLinks();
			};
			gv.clickable = true;
		});
	
	setTimeout( function() {dehighlightLinks();}, gv.FadeOut+gv.FadeIn+gv.NodeSlide);
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
gv.radio = [];
gv.size = 20;
gv.clickable = true
var clicked = null;
var width, height;
var svg = d3.select("#map").append("svg")
	.attr("id", "svg")
	.attr("class", "svg")
	.on("click", function() { 
		if (gv.clickable) {
			dehighlightLinks();
			unclick(clicked);
		};
	})
	
//Animation variables.
gv.FadeOut = 0;
gv.NodeSlide = 0;
gv.FadeIn = 500;


var SidebarTitleHeight = $('#sideBarTitle').outerHeight(true) + $('.navbar').outerHeight();
var width = $('#map').width();
	nheight = $('#navbar').height();
	height = window.innerHeight;
var wellHeight = window.innerHeight - nheight-170;
var wellWidth = $('#sidebar').width()-40;
$('#bio').css('max-height', wellHeight+"px");

$('.fixed-table-container').attr("data-height", wellHeight+"px");


$('#sidebar').css('min-height', window.innerHeight+"px");
var heightOfZoom = $('#zoom').height();

$('#zoom').css({'left': '20px', 'top': height - heightOfZoom - 55 +'px'});

$('#subgraphTable').bootstrapTable({
        data: ""
});

$('#nodetable').attr("data-height", wellHeight);
$('#nodeYoutubeTable').attr("data-height", wellHeight);
$('#nodeYoutubeTable').bootstrapTable('resetView');
$('#edgeYoutubeTable').attr("data-height", wellHeight);
$('#edgeYoutubeTable').bootstrapTable('resetView');
$('#pathYoutubeTable').attr("data-height", wellHeight);
$('#pathYoutubeTable').bootstrapTable('resetView')
$('#subgraphTable').attr("data-height", wellHeight-nheight-nheight);
$('#subgraphTable').bootstrapTable('resetView');

$('#artistOptions').on('click', function(){
	$('#artistSearch').val(gv.currentArtistName);
});

/*var URL = document.URL.split("gv.route=");

if(URL.length !== 1){
	initFromURL = true;
	var gv.route = URL[1].split("&seed=")[0];
	var seed = URL[1].split("&seed=")[1];	
}*/

reload();

//Supplementary functions:
//Action functions:
function clickNode(n, o, hl) {
	dehighlightLinks();
	if (clicked != null) { unclick(clicked); };
	clicked = n;
	d3.select(clicked).select(".firstLabel").transition().duration(500)
		.style("font-size", "18px");
	d3.select(clicked).select(".secondLabel").transition().duration(500)
		.style("font-size", "18px")
		.attr("dy", "0.91em");
	d3.select(clicked).select("circle").transition().duration(500)
		.attr("r", 30)
		.attr("stroke-width", 4); 
	if (hl) { highlightLinks(); }
	$('#nodeYoutubeTable').bootstrapTable('showLoading');
	addToSidebarHistory(0, o);
	loadArtistInfo(o);
};

function unclick(d) { 
	d3.select(clicked).select(".firstLabel").transition().duration(500)
		.style("font-size", function(d) { return firstLabelFont(d); });
	d3.select(clicked).select(".secondLabel").transition().duration(500)
		.style("font-size", function(d) { return secondLabelFont(d); })
		.attr("dy", "0.9em");
	d3.select(d).select("circle").transition()
		.duration(500)
		.attr("r", function(d) { return nodeScale(d.popularity); })
		.attr("stroke-width", function(d) { return strokeScale(d.popularity); })
		.style("fill-opacity", 1);
	clicked = null;
};

function loadPathInfo(names){
	tabSwitch("path");
	//console.log(names);
	d3.select('#sideBarTitle').text(names);

	if(gv.currentService=="spotify"){
		d3.select('#pathIframe').html( function() { 
			return '<iframe src="https://embed.spotify.com/?uri=spotify:trackset:Phonograph Radio:'+ gv.playlist.join(',') +'&theme=white" width="'+wellWidth+'" height="'+wellHeight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>'; 
		});
	};
	c = 0; gv.tableData = [];
	performRequests(c, 'path');
}

function loadArtistInfo(o) {
	gv.currentArtistName = o.name;
	gv.currentArtist = o.id;
	tabSwitch("node");
	d3.select('#sideBarTitle').text(o.name);
	d3.json("http://developer.echonest.com/api/v4/artist/biographies?api_key=X4WQEZFHWSIJ7OHWF&id=spotify:artist:"+o.id+"&format=json&results=1&start=0&license=cc-by-sa", function(error, response) {
		//console.log(response);
		if(error){
			d3.select('#bioText').text("Biography not found in database");
		}
		else{
			var bio = response.response.biographies[0].text;
			//console.log(bio);
			d3.select('#bioText').text(bio);
		}
	});
	d3.json("http://developer.echonest.com/api/v4/artist/images?api_key=X4WQEZFHWSIJ7OHWF&id=spotify:artist:"+o.id+"&format=json&results=1&start=0", function(error, response) {
		if(error){
			d3.select('#artistImage').html( function() { return '<img src="static/images/default.jpg" style="max-width: 180px; max-height: 240p" class="img-thumbnail center-block"/>'; });
		}
		else{
			var image = response.response.images[0].url;
			d3.select('#artistImage').html( function() { return '<img src="'+image+'" style="max-width: 180px; max-height: 240p" class="img-thumbnail center-block"/>'; });

		};
	});
	if(gv.currentService=="spotify"){
		d3.select('#nodeIframe').html('<iframe src="https://embed.spotify.com/?uri=spotify:artist:'+o.id+'&theme=white" width="'+wellWidth+'" height="'+wellHeight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>');
	};
	d3.select('#nodeIframe').html('<iframe src="https://embed.spotify.com/?uri=spotify:artist:'+o.id+'&theme=white" width="'+wellWidth+'" height="'+wellHeight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>');

	d3.json("http://developer.echonest.com/api/v4/artist/twitter?api_key=X4WQEZFHWSIJ7OHWF&id=spotify:artist:"+o.id+"&format=json", function(error, response) {
		var twttrId = response.response.artist.twitter;
		if (typeof(twttrId)!= "undefined") {
			d3.select('#twitter').html('<a id="twitterTimeline" height="'+wellHeight+'" class="twitter-timeline" href="https://twitter.com/'+twttrId+'" data-widget-id="574576262469009409" text="HAHAHAHAH" data-screen-name="'+twttrId+'">Loading Tweets by @'+twttrId+'</a>');
			twttr.widgets.load();
		} else {
			d3.select('#twitter').html('<p><em>Twitter Data Not Found</em></p><p><a href="#">Click here to update Phonograph</a></p>');
		};
	});
	
	d3.json("https://api.spotify.com/v1/artists/"+o.id+"/top-tracks?country=GB", function (error, response) {
		gv.nodeTracks = response.tracks;
		c = 0; gv.tableData = [];
		performRequests(c, 'node');
	});
};

function get_url(relations, type) {
	for (rel of relations) {
		if (rel.type == type) {
			return rel.url.resource;
		};
	};
};

function performRequests(c, mode) {
	//console.log(gv.trackNames); console.log(gv.artistNames);
	/*if (mode == 'radio') {
		thisTrack = gv.radioList[c];
	}
	if (mode == 'node') {
		thisTrack = 
	}
	stNames = [];
	for (n of gv.radioList[c].artists) {
		stNames.push(standardise(n));
	};

	stTrack = standardise(gv.radioList[c].name);

	yt = yt_requestString(removeNames(stNames, stTrack), stNames.join(' '))

	d3.json(yt, function(error, ytresponse) {

		if (ytresponse.items.length != 0) {
			score = calculateScore(stTrack, standardise(ytresponse.items[0].snippet.title), stNames);
		} else {
			score = 0;
		};

		if (score > 0.3) {
			gv.tableData.push( {"artistNames": '<div class="disabled" style="color:grey; font-style: italic;">'+gv.artistNames[c]+'</div>', "title": gv.trackNames[c], "add": "<button class='btn-sm btn-sidebar addToPlaylist' type='button' value="+ytresponse.items[0].id.videoId+"><i class='el el-plus-sign'></i></button>", "play": "<button class='btn-sm btn-sidebar playNowButton' type='button' value="+ytresponse.items[0].id.videoId+"><i class='el el-play'></i></button>"} );
		} else {
			gv.tableData.push( {"artistNames": gv.radioList[c], "title": gv.trackNames[c], "add": "<button disabled class='btn-sm btn-sidebar disabled addToPlaylist' type='button'><i class='el el-plus-sign'></i></button>", "play": "<button disabled class='btn-sm btn-sidebar disabled playNowButton' type='button'><i class='el el-play'></i></button>"} );
		};

		c += 1;

		$('#'+mode+'YoutubeTable').bootstrapTable('load', gv.tableData);
		$('#'+mode+'YoutubeTable').bootstrapTable('hideLoading');

		if (c < gv.trackNames.length) { 
			performRequests(c, mode); 
		} else { 
			if (gv.tableData.length == 0) {
				gv.tableData.push({
					"title": 'No songs found.', 
					"add": "", 
					"play":""
				}
			)};

			$('#'+mode+'YoutubeTable').bootstrapTable('load', gv.tableData);
			//Play tracks on double click
			$('tr').dblclick(function(){
				var playNowButton = $(this).find('.playNowButton');
				//console.log(playNowButton);
				if(playNowButton.attr("disabled")){
					console.log("Can't play track");
				}
				else{
					playNowButton.trigger("click");
				};
			});
		};
	});*/
};

function getLinkInfo(d){
	console.log(d);
	var pairIds = [gv.newGraph.nodes[d.source].id, gv.newGraph.nodes[d.target].id].sort().join(',');
	var names = gv.newGraph.nodes[d.source].name +" & "+gv.newGraph.nodes[d.target].name;
	d3.json("/edgeLookup?seed="+pairIds, function(error, response) {
		console.log(response);
		tracks = response.trackIds.join(',');
		console.log(tracks);
		tabSwitch("edge");
		d3.select('#sideBarTitle').text(names);
		if(gv.currentService=="spotify"){
			spotifyUrl = '"https://embed.spotify.com/?uri=spotify:trackset:Phonograph Radio:'+tracks +'&theme=white"'
			console.log(spotifyUrl);
			d3.select('#edgeIframe').html( function() { return '<iframe src='+spotifyUrl+' width="'+wellWidth+'" height="'+wellHeight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>'; });
		};
		gv.linkTracks = response.tracks;
		c = 0; gv.tableData = [];
		performRequests(c, 'edge');
	});	
}

function clickLink(d) {
	//$('#edgeYoutubeTable').bootstrapTable('showLoading');
	d3.event.stopPropagation();
	addToSidebarHistory(1, d);
	getLinkInfo(d);
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

function isHighlighted(d) { if (clicked!=null) { 
		return (clicked.id == 'a'+gv.oldGraph.nodes[d.source].id) || (clicked.id == 'a'+gv.oldGraph.nodes[d.target].id);
	}
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
	gv.trackNames = []; gv.artistNames = [];
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
				gv.playlist.push(link.track.id); gv.trackNames.push(link.track.name); gv.artistNames.push(link.track.artists);
				return link.source;
			};
			if (gv.pathOrder.indexOf(link.target) == -1 ) {
				gv.playlist.push(link.track.id); gv.trackNames.push(link.track.name); gv.artistNames.push(link.track.artists);
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

function loadRadio() {
	if (gv.route != 'path') {
		makeRadioList();
	};
	if (gv.currentService == 'youtube') {
		gv.tableData = [];
		gv.requestCounter = 0;
		performRequests(gv.requestCounter, 'radio');
	};
	if (gv.currentService == 'spotify') {
		trackIds = [];
		for (track of gv.radioList) {
			trackIds.push(track.id);
		};
		loadEdgeSpotify(trackIds);
	};
};

function makeRadioList() {
	//console.log(graph.links);
	originTracks = [];
	otherTracks = [];
	originIndex = newIds.indexOf(gv.origin);
	//console.log(originIndex);
	for (l of gv.newGraph.links) {
		if ((l.source==originIndex)||(l.target==originIndex)) {
			originTracks.push(l.track)
		} else {
			otherTracks.push(l.track)
		};
	};
	console.log(originTracks);
	console.log(otherTracks);
	originTracks.sort(compare)
	otherTracks.sort(compare)
	//console.log(originTracks);
	//console.log(otherTracks);
	radioTracks = [otherTracks[0]];
	otherTracks.splice(0,1);
	toAdd = originTracks.concat(otherTracks);
	//console.log(toAdd);
	toAdd.sort(compare);
	for (i=0; i < 5; i++) {
		radioTracks.push(toAdd[i])
	};
	console.log(radioTracks);
}

function tabSwitch(pane) {
	$('#artistSearch').val("");
	$('#info').toggle(true);
	$('#playlistPane').toggle(false);
	$('#subgraphPane').toggle(false);

	console.log("switching to "+pane);
	if (pane !== "playlist"){
		$('.sidebarNav').removeClass('hide');
	};
	if (pane == "edge") {
		for (elt of ["nodeTab", "nodePane", "pathTab", "pathPane"]) {
			d3.select('#'+elt).classed("active", false);
		};
		for (elt of ["nodeTab", "pathTab"]){
			$('#'+elt).hide();
		}	
		for (elt of ["edgeTab", "edgePane"]) {
			d3.select('#'+elt).classed("active", true);
			$('#'+elt).show();
		};
	}
	
	else if (pane == "node") {
		for (elt of ["edgeTab", "edgePane", "pathTab", "pathPane"]) {
			d3.select('#'+elt).classed("active", false);
		};
		for (elt of ["edgeTab", "pathTab"]){
			$('#'+elt).hide();
		}
		for (elt of ["nodeTab", "nodePane"]) {
			d3.select('#'+elt).classed("active", true);
			$('#'+elt).show();
		};
	}
	
	else if (pane == "path") {
		for (elt of ["edgeTab", "edgePane", "nodeTab", "nodePane"]) {
			d3.select('#'+elt).classed("active", false);
		};

		for (elt of ["nodeTab", "edgeTab"]){
			$('#'+elt).hide();
		}
		for (elt of ["pathTab", "pathPane"]) {
			d3.select('#'+elt).classed("active", true);
			$('#'+elt).show();
		};
	}

	else{
		console.log("ERROR IN TAB SWITCHING FUNCTION");
	};

};

//Switch to Playlist Tab on Click
$('#playlistTab').on('click', function(){
	tabSwitch("playlist");
});

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
	    	resetZoomLevel();
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
	    	gv.route = "termsubgraph"
	    	gv.origin = null;
	    	gv.genre = null;
	    	resetZoomLevel();
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
	    	console.log("PATH SELECT");
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
	    	resetZoomLevel();
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

//Youtube stuff.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api?wmode=transparent";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var player;
function onYouTubeIframeAPIReady() {
player = new YT.Player('player', {
  events: {
	'onReady': onPlayerReady,
	'onStateChange': onPlayerStateChange
  }
});
};

function onPlayerReady(event) {
event.target.playVideo();
}
var done = false;
function onPlayerStateChange(event) {
if (event.data == YT.PlayerState.PLAYING && !done) {
  //fullimeout(stopVideo, 6000);
  done = true;
}
}

function stopVideo() {
player.stopVideo();
};

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

function sideBarBack(){
	console.log(gv.currentSidebar);
	console.log(gv.sidebars);
	if (gv.currentSidebar < gv.sidebars.length && gv.currentSidebar > 0) {
		console.log("Going Back"); 
		gv.currentSidebar -= 1;
		var previousSidebar = gv.sidebars[gv.currentSidebar];
		//console.log(previousSidebar);
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
		console.log("Cannot go Back");
	};

};

$('#sidebarBack').on('click', function() {
	sideBarBack();
});

$('#sidebarForward').on('click', function() {
	if (gv.currentSidebar  < gv.sidebars.length-1) {
		console.log("Going Forward");
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
		console.log("Cannot go Forward");
	}
});

$('a[href="#fullNetwork"]').click(function() {
	if (gv.nework != 'full') {
		gv.network = 'full';
		init(gv.network);
	};
});

$('a[href="#sampleNetwork"]').click(function() {
	if (gv.nework != 'sample') {
		gv.network = 'sample';
		init(gv.network);
	};
});

function highlightZoomLevel(){
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
	else if(gv.zoomLevel == 4){
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
	//console.log("MOVING TO ZOOM LEVEL "+newZoomLevel);
	if (newZoomLevel != gv.zoomLevel) {
		gv.zoomLevel = newZoomLevel;
		zoom();
	};
})

$('.zo').click(function() { 
	if ((gv.zoomLevel < 4)&&(gv.clickable)) {
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

$('#genre').change(function(){
	var newGenre = $('#genre option:selected')[0].value;
	console.log(newGenre);
	if (gv.genre != newGenre) {
		gv.genre = newGenre;
		gv.route = "neighbourhood"
		gv.origin = null;
		resetZoomLevel();
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
$('#urlShare').click(function(){
	if (typeof location.gv.origin === 'undefined'){
    	location.gv.origin = location.protocol + '//' + location.host;
	}
	console.log(location.gv.origin);

	d3.select('#URL').property({'value': location.gv.origin+'/?gv.route='+gv.route+'&seed='+seed});
});

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










































































