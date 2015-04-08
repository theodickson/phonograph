//Main function:
function get_graph(seed, route) {d3.json("/"+route+"?seed="+seed, function(error, graph) {
	dataset.graphs.splice(0,dataset.currentGraph);
	dataset.graphs.unshift([graph, route, seed]);
	dataset.currentGraph = 0;
	start_Vis([graph, route, seed]);
	});
};

function start_Vis(gms) { graph = gms[0]; route = gms[1]; seed = gms[2];
	if ( (route == "neighbourhood")||(route=="zoom") ) { origin = seed.split(',')[0]; clicked = 'a'+origin;};
	if (route == "path") { start = seed.split(',')[0]; finish = seed.split(',')[1]; dataset.zoomLevel = 1;};
	if (route == "custom") { core = seed.split(','); dataset.zoomLevel = 1;};
	dataset.clickable = false;
	
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
						.range([6, 20]);
						
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
	dataset.currentIds = newIds;
	oldNodes = [];
	oldIds = [];
	if (typeof dataset.oldGraph != "undefined") { 
		for (n of dataset.oldGraph.nodes) {
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
	
	if (!(route=="path")) { 
		graph = optimiseRotation(oldPos, newPos, graph);
	} else {
		dataset.playlist = [];
		graph = pathPositions(start, graph, newIds, width, height);
		names = graph.nodes[newIds.indexOf(start)].name+' to '+graph.nodes[newIds.indexOf(finish)].name;
		addToSidebarHistory(2, names);
		loadPathInfo(names);
	};
	
	dataset.newGraph = graph;
	
	if ( !(route == "path") ) {
		$('.numArtists').show();
		var wScale = d3.scale.linear().domain(graph.xrange).range(wrange);
		var hScale = d3.scale.linear().domain(graph.yrange).range(hrange);
	} else {
		$('.numArtists').hide();
		var wScale = d3.scale.linear();
		var hScale = d3.scale.linear();
	};
	d3.selectAll(".link").attr("class", "oldLink");
	d3.selectAll(".oldLink").transition().duration(dataset.FadeOut).style("stroke-width", 0).remove();
	for (n of toGo) {
		d3.select('#a'+n).transition().duration(dataset.FadeOut).style("opacity", 0);
		d3.select('#a'+n).attr("class", "toGo");
	};
	
	d3.selectAll(".toGo").transition().delay(dataset.FadeOut).remove();
	for (n of toStay) {
		newNode = graph.nodes[newIds.indexOf(n)];
		d3.select('#a'+n).attr("class", "oldNode");
		d3.select('#a'+n).transition().delay(dataset.FadeOut).duration(dataset.NodeSlide)
			.attr("transform", "translate("+wScale(newNode.pos[0])+","+hScale(newNode.pos[1])+")")
			.attr("id", "aa"+n);
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
				if (dataset.clickable) {
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
				if ( (clicked != this)&&(dataset.clickable) ) {
					clickNode(this, d, true);
				};
				d3.event.stopPropagation(); 
			})
			.on("dblclick", function(d) { 
				d3.event.stopPropagation();
				if (d.id != origin) {
					get_graph(d.id+','+dataset.neighbourhoodSize, "neighbourhood");	
				};
			});
			
	
	node.append("circle")
		.attr("class", function(d) {
			return "ncircle "+d.genre;
		})
		.attr("r", function(d) {//console.log(d.popularity);
			if (clicked != null) {
				if ('a'+d.id == clicked.id) {
					return 30;
				};
			};
			return nodeScale(d3.max([1,d.popularity]));
		})
		.attr("stroke-width", function(d) { 
			if (clicked != null) {
				if ('a'+d.id == clicked.id) {
					return 3;
				};
			};
			return strokeScale(d.popularity);
		});
	
	if (clicked != null) { 
		node.each(function(d) {
			if ('a'+d.id == clicked.id) {
				clicked = this;
			};
		});
	};

	node.append("text")
		.attr("class", "firstLabel")
		.attr("dy", function(d) { return firstLabelHeight(d); })
		.attr("text-anchor", "middle")
		.style("font-size", function(d) { return firstLabelFont(d); })
		.text(function(d) {
			return firstLabel(d);
		});	
	
	node.append("text")
		.attr("class", "secondLabel")
		.attr("dy", function(d) { return "0.9em"; })
		.attr("text-anchor", "middle")
		.style("font-size", function(d) { return secondLabelFont(d); })
		.text(function(d) {
			return secondLabel(d);
		});	
										
	dataset.oldGraph = graph;
	
	d3.selectAll(".oldNode").transition().delay(dataset.FadeOut+dataset.NodeSlide+dataset.FadeIn).remove();
	d3.selectAll(".node").transition().delay(dataset.FadeOut+dataset.NodeSlide).duration(dataset.FadeIn).style("opacity", 1)
		.each("end", function(d) {
			if (typeof(origin) != "undefined") {
				if (d.id == origin) {
					clickNode(this, d, false);
				};
			};
			dataset.clickable = true;
		});
	
	//setTimeout( function() {dehighlightLinks();}, dataset.FadeOut+dataset.FadeIn+dataset.NodeSlide) };
	dataset.FadeOut = 600;
	dataset.NodeSlide = 1000;
};	

//Initialise variables:
var dir = "full";
var origin;
var initFromURL = false;
var dataset = {};
dataset.graphs = [];
dataset.sidebars = [];
dataset.customList = [];
dataset.currentGraph = 0;
dataset.zoomLevel = 1;
dataset.currentSidebar = 0;
dataset.artistList = [];
dataset.pathOrder = [];
dataset.playlist = [];
dataset.neighbourhoodSize = 30;
dataset.neighbourhoodSizeBTN = "#b30";
dataset.clickable = true
var clicked = null;
var width, height;
var svg = d3.select("#map").append("svg")
	.attr("id", "svg")
	.attr("class", "svg")
	.on("click", function() { 
		if (dataset.clickable) {
			dehighlightLinks();
			unclick(clicked);
		};
	})
	
//Animation variables.
dataset.FadeOut = 0;
dataset.NodeSlide = 0;
dataset.FadeIn = 800;


var SidebarTitleHeight = $('#sideBarTitle').outerHeight(true) + $('.navbar').outerHeight();
var wellHeight = window.innerHeight - SidebarTitleHeight;
console.log(wellHeight);
$('#sidebar').css('min-height', window.innerHeight+"px");
$('#bio').css('max-height', wellHeight+'px');
$('#nodetable').attr("data-height", wellHeight);
$('#nodeYoutubeTable').attr("data-height", wellHeight);
$('#nodeYoutubeTable').bootstrapTable('resetView');
$('#edgeYoutubeTable').attr("data-height", wellHeight);
$('#edgeYoutubeTable').bootstrapTable('resetView');
$('#pathYoutubeTable').attr("data-height", wellHeight);
$('#pathYoutubeTable').bootstrapTable('resetView');
$('#playlistTable').attr("data-height", wellHeight);
$('#playlistTable').bootstrapTable('resetView');

$('#artistOptions').on('click', function(){
	$('#artistSearch').val(dataset.currentArtistName);
});

var URL = document.URL.split("route=");

if(URL.length !== 1){
	initFromURL = true;
	var route = URL[1].split("&seed=")[0];
	var seed = URL[1].split("&seed=")[1];	
}

init();

//Initialise the visualisation.
function init() { 
	if (initFromURL) {
		//console.log("initFromURL with " + seed +" , "+route);
		get_graph(seed, route);
	} else {
		d3.json('/start', function(error, response) {
			origin = response.origin;
			get_graph(origin+','+dataset.neighbourhoodSize, "neighbourhood");
		});
	};
};

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
	console.log(names);
	d3.select('#sideBarTitle').text(names);
	//d3.select('#pathIframe').html( function() { return '<iframe src="https://embed.spotify.com/?uri=spotify:trackset:Phonograph Radio:'+ dataset.playlist.join(',') +'&theme=white" width="'+wellWidth+'" height="'+wellHeight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>'; });
	c = 0; dataset.tableData = [];
	performRequests(c, 'path');
}

function loadArtistInfo(o) {
	dataset.currentArtistName = o.name;
	dataset.currentArtist = o.id;
	tabSwitch("node");
	d3.select('#sideBarTitle').text(o.name);
	d3.json("http://developer.echonest.com/api/v4/artist/biographies?api_key=X4WQEZFHWSIJ7OHWF&id=spotify:artist:"+o.id+"&format=json&results=1&start=0&license=cc-by-sa", function(error, response) {
		var bio = response.response.biographies[0].text;
		d3.select('#bioText').text(bio);
	});
	d3.json("http://developer.echonest.com/api/v4/artist/images?api_key=X4WQEZFHWSIJ7OHWF&id=spotify:artist:"+o.id+"&format=json&results=1&start=0", function(error, response) {
		var image = response.response.images[0].url;
		d3.select('#artistImage').html( function() { return '<img src="'+image+'" style="max-width: 180px; max-height: 240p" class="img-thumbnail center-block"/>'; });
	});
	//d3.select('#nodeIframe').html('<iframe src="https://embed.spotify.com/?uri=spotify:artist:'+o.id+'&theme=white" width="'+wellWidth+'" height="'+wellHeight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>');

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
		dataset.trackNames = [];
		dataset.artistNames = [];
		for (track of response.tracks) {
			dataset.trackNames.push(track.name);
			artists = [];
			for (artist of track.artists) {
				artists.push(artist.name);
			};
			dataset.artistNames.push(artists);
		};
		c = 0; dataset.tableData = [];
		//console.log(dataset.trackNames, dataset.artistNames);
		performRequests(c, 'node');
	});
};

/*
function loadArtistInfo(o) {
	dataset.currentArtist = o.id;
	$('#travelTo').val('');
	tabSwitch("node");
	d3.select("#name").select("h3").remove();
	d3.select('#name').append("h3").text(o.name).classed('text-center', true);
	d3.json("/mbid?seed="+o.id, function(error, mbid) {
		d3.json("http://musicbrainz.org/ws/2/artist/"+mbid.mbid+"/?inc=url-rels&fmt=json", function(error, response) {
			var wiki = get_url(response.relations, "wikipedia");
			wikisplt = wiki.split('/wiki/')[1];
			var image = get_url(response.relations, "image");
			var youtube = get_url(response.relations, "youtube");
			$.getJSON("http://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&exintro=1&exchars=1000&format=json&titles="+wikisplt+"&callback=?", function (data) {
				for (key in data.query.pages) { 
					var bio = data.query.pages[key].extract;
					d3.select('#bio').select("p").remove();	
					d3.select('#bio').append("p").text(bio);
				};	
			});
			$.getJSON("http://en.wikipedia.org/w/api.php?action=query&prop=pageimages&explaintext&exintro=1&exchars=1000&format=json&titles="+wikisplt+"&callback=?", function (data) {
				for (key in data.query.pages) {
					imageref = data.query.pages[key].pageimage;
					$.getJSON("http://en.wikipedia.org/w/api.php?action=query&titles="+imageref+"&prop=imageinfo&iiprop=url&format=json&callback=?", function (data) {
						console.log(data);
					});
				};
			});
			d3.select('#artistImage').html( function() { return '<img src="'+image+'" style="max-width: 180px; max-height: 240p" class="img-thumbnail center-block"/>'; });
		});
	});
	d3.select('#nodeIframe').html('<iframe src="https://embed.spotify.com/?uri=spotify:artist:'+o.id+'&theme=white" width="300" height="380" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>');
};

*/
function get_url(relations, type) {
	for (rel of relations) {
		if (rel.type == type) {
			return rel.url.resource;
		};
	};
};

function performRequests(c, mode) {
	stNames = []; for (n of dataset.artistNames[c]) {stNames.push(standardise(n)); };
	stTrack = standardise(dataset.trackNames[c]);
	yt = yt_requestString(removeNames(stNames, stTrack), stNames.join(' '))
	d3.json(yt, function(error, ytresponse) {
		if(ytresponse.items.length !==0){
			score = calculateScore(stTrack, standardise(ytresponse.items[0].snippet.title), stNames);
		}
		else{
			score = 0;
		};
		if (score > 0.3) {
			dataset.tableData.push( {"artistNames": '<div class="disabled" style="color:grey; font-style: italic;">'+dataset.artistNames[c]+'</div>', "title": dataset.trackNames[c], "add": "<button class='btn-sm btn-sidebar addToPlaylist' type='button' value="+ytresponse.items[0].id.videoId+"><i class='el el-plus-sign'></i></button>", "play": "<button class='btn-sm btn-sidebar playNowButton' type='button' value="+ytresponse.items[0].id.videoId+"><i class='el el-play'></i></button>"} );
		}
		else{
			console.log("BAD SCORE");
			dataset.tableData.push( {"artistNames": dataset.artistNames[c], "title": dataset.trackNames[c], "add": "<button disabled class='btn-sm btn-sidebar disabled addToPlaylist' type='button'><i class='el el-plus-sign'></i></button>", "play": "<button disabled class='btn-sm btn-sidebar disabled playNowButton' type='button'><i class='el el-play'></i></button>"} );

		};
		c += 1;
		$('#'+mode+'YoutubeTable').bootstrapTable('load', dataset.tableData);
		$('#'+mode+'YoutubeTable').bootstrapTable('hideLoading');
		if (c < dataset.trackNames.length) { 
			performRequests(c, mode); 
		}
		else { 
			if (dataset.tableData.length == 0) {
				dataset.tableData.push({
					"title": 'No songs found in Database', 
					"add": "", 
					"play":""
				}
			)};
			$('#'+mode+'YoutubeTable').bootstrapTable('load', dataset.tableData);
			//Play tracks on double click
			$('tr').dblclick(function(){
				var playNowButton = $(this).find('.playNowButton');
				console.log(playNowButton);
				if(playNowButton.attr("disabled")){
					console.log("Can't play track");
				}
				else{
					playNowButton.trigger("click");
				};
			});

		};
	});


};

function getLinkInfo(d){
	console.log(d);
	var pairIds = [dataset.newGraph.nodes[d.source].id, dataset.newGraph.nodes[d.target].id].sort().join(',');
	var names = dataset.newGraph.nodes[d.source].name +" & "+dataset.newGraph.nodes[d.target].name;
	d3.json("/edgeLookup?seed="+pairIds, function(error, response) {
		//console.log(response);
		tracks = response.trackIds.join(',');
		tabSwitch("edge");
		d3.select('#sideBarTitle').text(names);
		//d3.select('#edgeIframe').html( function() { return '<iframe src="https://embed.spotify.com/?uri=spotify:trackset:Phonograph Radio:'+tracks +'&theme=white" width="'+wellWidth+'" height="'+wellHeight+'" frameborder="0" allowtransparency="true" allowtransparency="true"></iframe>'; });
		c = 0; dataset.tableData = []; dataset.trackNames = response.trackNames; dataset.artistNames = response.artistNames;
		performRequests(c, 'edge');
	});	
}

function clickLink(d) {
	$('#edgeYoutubeTable').bootstrapTable('showLoading');
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

function dehighlightLinks() {
	d3.selectAll(".link").transition().duration(500)
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
		return (clicked.id == 'a'+dataset.oldGraph.nodes[d.source].id) || (clicked.id == 'a'+dataset.oldGraph.nodes[d.target].id);
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

function pathPositions(start, graph, newIds, width, height) {
	dataset.trackNames = []; dataset.artistNames = [];
	dataset.pathOrder = [newIds.indexOf(start)]; c = 0; n = newIds.length;
	while (c < n - 1) { dataset.pathOrder.push(nextNode(graph, dataset.pathOrder)); c += 1};
	newY = height/2 - 10; c = 0; xInt = d3.min([(width - 160)/(n-1), width/5]);
	totalLength = xInt*(n-1); offset = width/2 - totalLength/2;
	while (c < n) {
		graph.nodes[dataset.pathOrder[c]].pos[0] = offset + c*xInt; graph.nodes[dataset.pathOrder[c]].pos[1] = newY; c += 1;
	};
	return graph;
};

function nextNode(graph, pathOrder) {
	for (link of graph.links) {
		if ( (link.source == [dataset.pathOrder[dataset.pathOrder.length-1]]) || (link.target == [dataset.pathOrder[dataset.pathOrder.length-1]]) ) {
			if (dataset.pathOrder.indexOf(link.source) == -1 ) {
				dataset.playlist.push(link.track.id); dataset.trackNames.push(link.track.name); dataset.artistNames.push(link.track.artists);
				return link.source;
			};
			if (dataset.pathOrder.indexOf(link.target) == -1 ) {
				dataset.playlist.push(link.track.id); dataset.trackNames.push(link.track.name); dataset.artistNames.push(link.track.artists);
				return link.target;
			};
		};
	};
};

function tabSwitch(pane) {
	$('#artistSearch').val("");
	$('#info').toggle(true);
	$('#playlistPane').toggle(false);

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

//Search bar.
$( ".autocomplete" ).autocomplete({
	source: function(request, response) {
		$.getJSON('/autocomplete?terms='+request.term.split(' ').join(','), function (data) {
			response(data.response);
		});
	},
    select: function(event, ui) {
    	this.value = '';
    	origin = ui.item.value;
    	get_graph(origin+','+dataset.neighbourhoodSize, "neighbourhood");
    	event.preventDefault();
    },
    delay: 100,
    messages: {
        noResults: 'No artists found.',
        results: function() {}
    },
});

//Search bar.
$( "#travelTo" ).autocomplete({
	source: function(request, response) {
		$.getJSON('/autocomplete?terms='+request.term.split(' ').join(','), function (data) {
			response(data.response);
		});
	},
    select: function(event, ui) {
    	this.value = '';
    	destination = ui.item.value;
    	get_graph(dataset.currentArtist+','+destination, "path");
    	event.preventDefault();
    },
    delay: 100,
    messages: {
        noResults: 'No artists found.',
        results: function() {}
    },
});

//Search bar.
$( "#genreSearch" ).autocomplete({
	source: function(request, response) {
		$.getJSON('/genresearch?terms='+request.term.split(' ').join(','), function (data) {
			response(data.response);
		});
	},
    select: function(event, ui) {
    	this.value = '';
    	get_graph(ui.item.value+','+dataset.neighbourhoodSize, "genresubgraph");
    	event.preventDefault();
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
	dataset.sidebars.splice(1+dataset.currentSidebar, dataset.sidebars.length-dataset.currentSidebar, [cat, object]);
	dataset.currentSidebar=dataset.sidebars.length-1;
}

$('#artistAdd').on('click', function() { //console.log(dataset.customList);
	if (dataset.customList.indexOf(dataset.currentArtist) == -1) {
		dataset.customList.push(dataset.currentArtist);
	};
});

$('#generateSubgraph').on('click', function() {
	ids = dataset.customList.join(',');
	seed = (ids+[dataset.neighbourhoodSize]).join(',');
	dataset.customList = [];
	get_graph(seed, "custom");
});

$('#graphBack').on('click', function() {
	if (dataset.currentGraph < dataset.graphs.length) { 
		dataset.currentGraph += 1;
		start_Vis(dataset.graphs[dataset.currentGraph]);
	};
});

$('#graphForward').on('click', function() {
	if (dataset.currentGraph > 0) {
		dataset.currentGraph -= 1;
		start_Vis(dataset.graphs[dataset.currentGraph]);
	};
});
function sideBarBack(){
	console.log(dataset.currentSidebar);
	console.log(dataset.sidebars);
	if (dataset.currentSidebar < dataset.sidebars.length && dataset.currentSidebar > 0) {
		console.log("Going Back"); 
		dataset.currentSidebar -= 1;
		var previousSidebar = dataset.sidebars[dataset.currentSidebar];
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
	if (dataset.currentSidebar  < dataset.sidebars.length-1) {
		console.log("Going Forward");
		dataset.currentSidebar += 1;
		var nextSidebar = dataset.sidebars[dataset.currentSidebar]
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
	if (dataset.nework != 'full') {
		dataset.network = 'full';
		init(dataset.network);
	};
});

$('a[href="#sampleNetwork"]').click(function() {
	if (dataset.nework != 'sample') {
		dataset.network = 'sample';
		init(dataset.network);
	};
});

$('.ns').click(function() {
	////console.log(dataset.neighbourhoodSizeBTN);
	d3.select(dataset.neighbourhoodSizeBTN).classed({'btn-default':true, 'btn-primary':false})
	d3.select(this).classed({'btn-default':false, 'btn-primary':true});
	dataset.neighbourhoodSizeBTN = "#"+this.id;
	if ( (dataset.neighbourhoodSize!=this.id.substring(1))&&(dataset.clickable) ) {
		dataset.neighbourhoodSize = this.id.substring(1);
		get_graph(origin+','+dataset.neighbourhoodSize, "neighbourhood");
	};
});

$('.zo').click(function() { console.log('click');
	if ((dataset.zoomLevel < 4)&&(dataset.clickable)) {
		dataset.zoomLevel += 1;
		get_graph(origin+','+dataset.neighbourhoodSize+','+dataset.zoomLevel, "zoom");
	};
});

$('.zi').click(function() {
	if ( (dataset.zoomLevel > 1)&&(dataset.clickable) ) {
		dataset.zoomLevel -=1 ;
		if (dataset.zoomLevel > 1) {
			get_graph(origin+','+dataset.neighbourhoodSize+','+dataset.zoomLevel, "zoom");
		} else {
			get_graph(origin+','+dataset.neighbourhoodSize, "neighbourhood");
		};
	};
});

$('#urlShare').click(function(){
	if (typeof location.origin === 'undefined'){
    	location.origin = location.protocol + '//' + location.host;
	}
	console.log(location.origin);

	d3.select('#URL').property({'value': location.origin+'/?route='+route+'&seed='+seed});
});

$('#artistOptions').on('click', function(){
	var totalWidth = $('#searchBar').width() + $('#artistOptions').width();
	$('#travelTo').width(totalWidth);
});