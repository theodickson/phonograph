//Main function. Called whenever the window is resized or a new graph is received.
function start_Vis(graph) {

	svg.transition().duration(1000).style("opacity", 1)

	svg.attr("width", gv.width).attr("height", gv.height);

	//Define the range of width and height on the svg that we allow nodes to occupy:
	if (gv.width >= gv.height) {
		var hRange = [30, gv.height - 30];
		var wRange = [gv.width/2 - gv.height/2, gv.width/2 +  gv.height/2];
	} else {
		var wRange = [30, gv.width-30];
		var hRange = [gv.height/2 - gv.width/2, gv.height/2 +  gv.width/2];
	};

	if ((graph.nodes.length < 10)&&(gv.route!='path')) { // This shrinks the available space for nodes in cases where < 10 nodes are returned.
		var boxScale = d3.scale.linear().domain([9,1]).range([0.1,0.5]);
		var box = boxScale(graph.nodes.length);
		var hRange = [gv.height*box, gv.height*(1-box)];
		var wRange = [gv.width*box, gv.width*(1-box)];
	}

	var weights = [];
	for (d of graph.links) { weights.push(d.weight); };
	var linkCount = graph.links.length

	var maxWidthScale = d3.scale.linear().domain([40,120]).range([0,1])
	linkAdjustment = maxWidthScale(linkCount) //adjust the range for the link widths according to total number of links - with many links we want them all to be thinner.
	gv.widthScale = d3.scale.linear()
						.domain([d3.min(weights), d3.max(weights)])	
						.range([1-linkAdjustment/2, 2-linkAdjustment]);	


	//Determine which nodes were already present. 
	toStay = [];
	oldPos = [];
	newPos = [];
	if (gv.oldGraph) { //Don't do this if this is the first graph loaded.
		for (var n in gv.oldGraph.nodes) {
			if (n in graph.nodes) {
				toStay.push(n);
				//Record previous and proposed next positions of the node for use in the optimise rotation routine.
				oldPos.push(gv.oldGraph.nodes[n].pos);
				newPos.push(graph.nodes[n].pos); 
			};
		};
	};
	
	/*Now optimise the rotation of the already-present nodes if this isn't path mode. Optimise rotation finds the rotation about the centre of the svg which results in the
	already present nodes travelling the least cumulative distance.*/
	if ( (gv.route!="path")&&(gv.rotate) ) { 
		graph = optimiseRotation(oldPos, newPos, graph);
	} else if (gv.route == 'path') {
		graph = pathPositions(graph, newIds, gv.width, gv.height); //pathPositions aligns the nodes along the x-axis in order from source to destination.
	};
	
	/*The optimise rotation function adds to the graph object the final xRange and yRange for the position value. Now we can define the scale which takes these
	values and maps them to their position on the svg.*/

	if (gv.route != "path") {
		var wScale = d3.scale.linear().domain(graph.xRange).range(wRange);
		var hScale = d3.scale.linear().domain(graph.yRange).range(hRange);
	};

	gv.newGraph = graph; //Make the graph a global for use in other functions.

	/*If we don't assign the current links a new class before removing them, sometimes it removes the new links as the transitions and those 
	links being appended are basically concurrent. There is no benefit to only removing links which disappear its easier to just remove them all.
	Note: Fade out isn't happening, can't figure out why.*/
	d3.selectAll("line").attr('class', 'oldLink'); 
	d3.selectAll(".oldLink").transition().duration(gv.fadeOut).style("stroke-width", 0).remove();

	for (n of toStay) { //Move the already present nodes to their new positions. This is necessary as d3.data().enter() does not act on already present elements.
		d3.select('#a'+n).transition().delay(gv.fadeOut).duration(gv.nodeSlide)
			.attr("transform", "translate("+wScale(graph.nodes[n].pos[0])+","+hScale(graph.nodes[n].pos[1])+")")
		d3.select('#a'+n).select('circle').transition().delay(gv.fadeOut).duration(gv.nodeSlide)
			.attr("r", function(d) { return nodeScale(d.value.popularity)});
		d3.select('#a'+n).select('.firstLabel').transition().delay(gv.fadeOut).duration(gv.nodeSlide)
			.style("font-size", function(d) { return labelFontSize(d,1); });
		d3.select('#a'+n).select('.secondLabel').transition().delay(gv.fadeOut).duration(gv.nodeSlide)
			.style("font-size", function(d) { return labelFontSize(d,1); });


	};


	/*Add the nodes and links. Note that graph.nodes is now an object of the form {id: {name, popularity, genre,pos}}. This means that the values are always
	callable directly from an id, as opposed to messing around with indices.*/

	gv.node = gv.nodeLayer.selectAll(".node")
			/*.data() needs to act on an array, so d3.entries() turns the object into an array of objects of the form {key: id, value: {name, popularity, genre,pos}}
			The function is a 'matching' function. For each element in the array, if its id matches an already present element with class .node, it will update its data*/
			.data(d3.entries(graph.nodes), function(d,i) { return d.key; }) 
			.enter() //this tells D3 to only do the following on .node elements which did not match an id of an already-present node. 
			.append("g")
			.attr("class", "node")
			.attr("id", function(d) { return 'a' + d.key }) //HTML ids must start with an alphabetical character. 
			.attr("transform", function(d) { return 'translate('+wScale(d.value.pos[0])+','+hScale(d.value.pos[1])+')' })
			.style("opacity",0)
			.on("click", function(d) {
				if (gv.clickable) {
					if (gv.clickedNode == d.key) {
						doubleClickNode(d);
					} else {
						clickNode(d);
					};
				};
				d3.event.stopPropagation(); 
			})
			.on("dblclick", function(d) { 
				d3.event.stopPropagation();
				if (gv.clickable) {
					doubleClickNode(d);
				}
			})
			.on("mouseenter", function(d) {
				if ((gv.clickable)&&(gv.clickedNode!=d.key)) {
					d3.select('#a'+d.key).select('.firstLabel').transition().delay(750).duration(500)
						.style('font-size', function(d) {
							return labelFontSize(d,1.05)
					})
					d3.select('#a'+d.key).select('.secondLabel').transition().delay(750).duration(500)
						.style('font-size', function(d) {
							return labelFontSize(d,1.05)
					})
				};
			})
			.on("mouseleave", function(d) {
				if ((gv.clickable)&&(gv.clickedNode!=d.key)) {
					d3.select('#a'+d.key).select('.firstLabel').transition().duration(100)
						.style('font-size', function(d) {
							return labelFontSize(d,1)
					})
					d3.select('#a'+d.key).select('.secondLabel').transition().duration(100)
						.style('font-size', function(d) {
							return labelFontSize(d,1)
					})
				};
			})

	//Note that now when functions act on data bound to nodes, d is of the new form {key: id, value: {}} so d.id is now d.key, and d.name is now d.value.name, etc.

	gv.node.append("circle")
		.attr("class", function(d) {
			return "ncircle "+d.value.genre;
		})
		.attr("r", function(d) {
			/*if (d.key == gv.origin) {
					return 30;
				};*/
			return nodeScale(d3.max([1,d.value.popularity]));
		})
		.attr("stroke-width", 2);
	
	gv.node.append("text")
		.attr("class", "firstLabel")
		.attr("dy", function(d) {return firstLabelHeight(d); })
		.attr("text-anchor", "middle")
		.style("font-size", function(d) {
			/*if (d.key == gv.origin) {
				return "22px";
			};*/
			return labelFontSize(d,1); })
		.text(function(d) {
			return firstLabel(d);
		});	
	
	gv.node.append("text")
		.attr("class", "secondLabel")
		.attr("dy", function(d) { return "0.8em"; })
		.attr("text-anchor", "middle")
		.style("font-size", function(d) {
			/*if (d.key == gv.origin) {
				return "22px";
			};*/
			return labelFontSize(d,1); })
		.text(function(d) {
			return secondLabel(d);
		});	
	
	//Initialise the fadeIn for the new nodes. This technically fades in all the nodes but obviously nothing happens to the already present nodes.
	gv.node.transition().delay(gv.fadeOut+gv.nodeSlide).duration(gv.fadeIn).style("opacity",1);

	//The following block removes the nodes by instead using the exit() function, which executes the removal code only on nodes *not* matching an ID of the already present nodes.
	gv.nodeLayer.selectAll(".node")
			.data(d3.entries(graph.nodes), function(d,i) { return d.key; })
			.exit()
			.transition().duration(gv.fadeOut).style("opacity", 0).remove();

	//Add the links. They don't need any event handlers, all the events happen on the link wrappers placed over them.
	gv.link = gv.linkLayer.selectAll(".link")
		.data(graph.links).enter().append("line")
		.attr("class", "link")
		//Give them a unique ID: (will be useful for acting on the link(s) corresponding to the currently playing track.)
		.attr("id", function(d) {
			var link_ids = [d.source, d.target];
			link_ids.sort()
			return 'L'+link_ids.join('-');
		})
		.attr("x1", function(d) { return wScale(graph.nodes[d.source].pos[0]); })
		.attr("y1", function(d) { return hScale(graph.nodes[d.source].pos[1]); })
		.attr("x2", function(d) { return wScale(graph.nodes[d.target].pos[0]); })
		.attr("y2", function(d) { return hScale(graph.nodes[d.target].pos[1]); })
		.style("stroke-width", 0); //Start them with stroke width 0 so they only appear when we want them.

	//Now we add link wrappers. They are much wider but invisible, and contain the link event handlers, so that hovering and selecting links is easier.
	gv.linkWrapper = gv.linkLayer.selectAll(".linkWrapper")
		.data(graph.links).enter().append("line")
		.attr("class", "linkWrapper")
		//Give them a unique ID: (will be useful for acting on the link(s) corresponding to the currently playing track.)
		.attr("id", function(d) {
			var link_ids = [d.source, d.target];
			link_ids.sort()
			return 'LW'+link_ids.join('-');
		})
		.attr("x1", function(d) { return wScale(graph.nodes[d.source].pos[0]); })
		.attr("y1", function(d) { return hScale(graph.nodes[d.source].pos[1]); })
		.attr("x2", function(d) { return wScale(graph.nodes[d.target].pos[0]); })
		.attr("y2", function(d) { return hScale(graph.nodes[d.target].pos[1]); })
		.style("stroke-width", 15)
		.on("mouseenter", function(d) {
			var linkId = '#L'+[d.source,d.target].sort().join('-')
			if (gv.clickable) {
				if (clickedAdjacent(d)) {
					d3.select(linkId).transition().delay(60).duration(30).style("stroke-width", function(d) { return gv.widthScale(d.weight)*4; })
				} else {
					d3.select(linkId).transition().delay(60).duration(30).style("stroke-width", function(d) { return gv.widthScale(d.weight)*3;; })
				};
			};
		})
		.on("mouseleave", function(d) {
			var linkId = '#L'+[d.source,d.target].sort().join('-')
			if (gv.clickable) {
				if (clickedAdjacent(d)) { 
					d3.select(linkId).transition().duration(20).style("stroke-width", function() { return gv.widthScale(d.weight)*2; });
				} else {
					d3.select(linkId).transition().duration(20).style("stroke-width", function() { return gv.widthScale(d.weight); });
				};
			}
		})
		.on("click", function(d) {
				if (gv.clickable) {
					clickLink(d);
				};
			});

	gv.oldGraph = graph; //Assign this graph to oldGraph, for use the next time startVis is called.
	
	//Set a timer for the code we want to execute only after the node animations have finished.
	setTimeout( function() {
		dehighlightLinks(); //this fades in the links, since dehighlightLinks actually just returns all links to their base width as dictated by the linkWidth scale.
		if (gv.currentArtist) {
			loadArtistInfo();
		};
		gv.clickable = true;
		gv.clickedNode = null; 
		//clickNode(gv.origin);
	}, gv.fadeOut+gv.fadeIn+gv.nodeSlide);

	//Return the animation variables to their defaults, in case this was the first time or a resize.
	gv.fadeOut = 500;
	gv.fadeIn = 500;
	gv.nodeSlide = 900;
	gv.linkFadeIn = 400;

};	

//Reload function is called whenever a new graph is requested.
function reload() {
	gv.rotate = true; //Enable rotation optimisation since we are loading a new graph.
	gv.clickable = false;
	gv.linkFadeIn = 400;

	svg.transition().delay(500).duration(1500).style("opacity", 0.3)

	d3.json(flaskURL(), function(error, graph) {
		if (graph.origin) {
			gv.origin = graph.origin; 
			gv.currentArtist = graph.origin;
		} else {
			gv.origin = graph.origin;
			gv.currentArtist = null; //ensures loadArtist is not called, since there is no origin.
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
	return(url);
}

//Set up (before the first graph is called)

//Initialise main global variable variables:
var gv = {};
gv.route = "neighbourhood"
gv.origin = null;
gv.genre = null;
gv.term = null;
gv.source = null;
gv.destination = null;
gv.pathOrder = [];
gv.currentService = "youtube";
gv.playlist = [];
gv.size = 20;
gv.clickable = true
gv.clickedNode = null;
gv.currentArtist = null;
gv.currentLink = null;
gv.clickedRadius = 30;
gv.clickedStrokeWidth = 4;
gv.rotate = true;

//initalise animation variables. These start with different values from the default as there is no fading out or sliding to be done the first time.
gv.fadeOut = 0;
gv.fadeIn = 1200;
gv.nodeSlide = 0;
gv.linkFadeIn = 400;

resize(); //Calling the resize function initialises the globals derived from the window dimensions.

//Add the svg canvas and its click listeners:
var svg = d3.select("#map").append("svg")
	.attr("id", "svg")
	.attr("class", "svg")
	.on("click", function() { 
		if (gv.clickable) {
			unclickNode();
		};
		if ($('#playlistDropdown').hasClass("open")) {
			$('#playlistICON').trigger("click");
		};
	})

/*An SVG element is 'on top' of every other element that appears before it in the DOM, it doesn't technically matter what order they were added.
Hence the following layout allows links to be added at any time to the linkLayer and they will always appear below anything in the nodeLayer*/
gv.linkLayer = svg.append("g"); 
gv.nodeLayer = svg.append("g");
	
/*Add a listener for window resizing:*/
d3.select(window).on('resize', function() { 
	//Update the dimension globals:
	resize();
	//Disable rotation optimisation and clicking:
	gv.rotate = false;
	gv.clickable = false;
	//Adjust the animation variables for fast response:
	gv.fadeOut = 0;
	gv.fadeIn = 0;
	gv.nodeSlide = 300;
	gv.linkFadeIn = 100;
	//Reinitialise the visualisation. There are no new nodes and no disappearing nodes - it will just fade out the links, rescale the node positions and fade the links back in.
	start_Vis(gv.oldGraph);
});

//Get a graph and initialise the visualisation:
reload();



//Supplementary functions:

//Special scales that cap node popularity at 60: (Looks better).
function nodeScale(val) {
	var nS = d3.scale.linear()
			.domain([20, 60])
			.range([10, 20]);
	var toScale = d3.min([d3.max([val, 20]), 60]);
	return nS(toScale);
};

function labelScale(val) { 
	var lS = d3.scale.linear()
			.domain([20, 60])
			.range([14, 17]);
	var toScale = d3.min([d3.max([val, 20]), 60]);
	return lS(toScale);
};


//Node click and load functions:
function clickNode(d) {
	if (typeof(d.key)=="undefined") { id = d;} else {id = d.key;}
	gv.currentLink = null;
	highlightNode(id);
	gv.clickedNode = id;
	highlightLinks();
	if (gv.currentArtist != id) {
		gv.currentArtist = id;
		loadArtistInfo();
		tabSwitch('node');
	}
};

function highlightNode(node) {
	if (node == gv.clickedNode) { return null; }; //If the node is already clicked, do nothing.

	//Otherwise, dehighlight the previously clicked node:
	previous = d3.select('#a'+gv.clickedNode);

	previous.select('circle').transition().duration(500)
		.attr('r', function(d) {
			return nodeScale(d.value.popularity); 
		});

	previous.select('.firstLabel').transition().duration(500)
		.style('font-size', function(d) {
			return labelFontSize(d,1);
		});

	previous.select('.secondLabel').transition().duration(500)
		.style('font-size', function(d) {
			return labelFontSize(d,1); 
		})
		.attr("dy", "0.8em");

	//Now select the newly clicked node and highlight it.
	current = d3.select('#a'+node);

	current.select('circle').transition().duration(500)
		.attr('r', function(d) {
			return gv.clickedRadius; 
		});

	current.select('.firstLabel').transition().duration(500)
		.style('font-size', function(d) {
			return "22px";
		});

	current.select('.secondLabel').transition().duration(500)
		.style('font-size', function(d) {
			return "22px"; 
		})
		.attr("dy", "0.85em");

}

function loadArtistInfo() {
	d3.select('#artistImage').html("");
	d3.select('#bioText').text("");
	$('#node-title').text(gv.newGraph.nodes[gv.currentArtist].name);
	var id = gv.currentArtist;

	d3.json(imageRequestString(id), function(error, response) {
		var images = response.images;
		if ( (error)||(images.length==0)||(typeof(images)=="undefined") ){
			d3.select('#artistImage').html( function() { return imageTag(null); });
		}
		else{
			console.log(images);
			var image = response.images[0].url;
			d3.select('#artistImage').html( function() { return imageTag(image); });

		};

		setTimeout(function() {
				d3.json(bioRequestString(id), function(error, response) {
					var bios = response.response.biographies;
					if( (error)||(bios.length==0)||(typeof(bios)=="undefined") ) {
						d3.select('#bioText').text("Biography not found.");
					}
					else{
						var bio = response.response.biographies[0].text;
						d3.select('#bioText').text(bio);
					}

				});
			}, 500);
	});

	d3.json(twitterRequestString(id), function(error, response) {
		var twttrId = response.response.artist.twitter;
		if (typeof(twttrId)!= "undefined") {
			d3.select('#twitter').html(twitterTag(twttrId));
			twttr.widgets.load();
		} else {
			d3.select('#twitter').html('<p><em>Twitter account not found.</em></p>');
		};
	});

	if (gv.currentService=="spotify") {
		d3.select('#nodeIframe').html(spotifyArtistIframe(id));
	};

	if (gv.currentService == 'youtube') {
		d3.json("https://api.spotify.com/v1/artists/"+id+"/top-tracks?country=GB", function (error, response) {
			gv.requestTracks = [];
			for (track of response.tracks) {
				artistNames = [];
				for (artist of track.artists) {
					artistNames.push(artist.name);
				};
				parsedTrack = {'id': track.id, 'name': track.name, 'artists': artistNames};
				gv.requestTracks.push(parsedTrack);
			};
			gv.tableData = [];
			performRequests('node');
		});
	};
};

function doubleClickNode(d) {
	if ((d.key != gv.origin)&&(gv.clickable)) {
		gv.origin = d.key;
		gv.route = "neighbourhood"
		reload();	
	};
};

function unclickNode() {
	highlightNode(null);
	gv.clickedNode = null;
	dehighlightLinks();
}
//Edge click and load functions:
function clickLink(d) {
	d3.event.stopPropagation();
	gv.currentArtist = null; //Current artist is now null since there is no artist displayed in the sidebar.
	var linkId = [d.source,d.target].sort().join('-')
	if (gv.currentLink != linkId) { //Only do something if the link isn't already clicked.
		gv.currentLink = linkId;
		loadEdgeInfo();
		tabSwitch('edge');
	}
};	

function highlightLinks() { //enlarges links adjacent to the clicked node and disappears the rest. also disappears linkwrappers not adjacent to the clicked node.
	d3.selectAll(".link").transition().duration(500)
		.style("stroke-width", function(d) { 
			if (clickedAdjacent(d)) {
				return gv.widthScale(d.weight)*2;
			} else {return 0;};	
		});
	d3.selectAll(".linkWrapper")
		.style("stroke-width", function(d) { 
			if (clickedAdjacent(d)) {
				return 15;
			} else {return 0;};	
		});
}

function dehighlightLinks() { //Restores all link widths to their normal state.
	d3.selectAll(".link").transition().duration(gv.linkFadeIn)
		.style("stroke-width", function(d) { return gv.widthScale(d.weight); });
	d3.selectAll(".linkWrapper")
		.style("stroke-width", 15);
};


function clickedAdjacent(d) { //Determines if the source or target of the link is the currently clicked node.
	return (gv.clickedNode == d.source) || (gv.clickedNode == d.target);
};

function loadEdgeInfo(){

	var currentLinkIds = gv.currentLink.split('-')

	console.log(currentLinkIds);

	var names = gv.newGraph.nodes[currentLinkIds[0]].name +" & "+gv.newGraph.nodes[currentLinkIds[1]].name;

	console.log(names);

	d3.json("/edgeLookup?seed="+gv.currentLink, function(error, response) {
		if(gv.currentService=="spotify") {
			trackIds = [];
			for (track of response.tracks) {
				trackIds.push(track.id);
			};
			d3.select('#edgeIframe').html( function() { return spotifyIframeTag(trackIds); });
		};
		$('#edge-title').text(names);
		if(gv.currentService == "youtube") {
			gv.requestTracks = response.tracks;
			gv.tableData = [];
			performRequests('edge');
		};	
	});
};

//Window-y and tab-y functions:
function resize() {
	gv.width = $('#map').width();
	gv.nheight = $('#navbar').height();
	gv.height = window.innerHeight - gv.nheight - 115;
	gv.nwidth = $('#playlistDropdown').width();
	gv.wellheight = window.innerHeight - gv.nheight - 170 + "px";
	gv.wellwidth = $('#sidebar').width()-40;
	$('#bio').css('height', gv.wellheight);
	$('.fixed-table-container').attr({"data-height": gv.height+"px"});
	$('#bio').css('max-height', gv.wellheight+"px");
	$('.fixed-table-container').attr("data-height", gv.wellheight+"px");
	$('#playlistDD').css({"height": gv.height/2 +"px"});
	$('#sidebar').css('min-height', window.innerHeight+"px");
	$('#nodetable').attr("data-height", gv.wellheight);
	$('#nodeYoutubeTable').attr("data-height", gv.wellheight);
	$('#nodeYoutubeTable').bootstrapTable('resetView');
	$('#edgeYoutubeTable').attr("data-height", gv.wellheight);
	$('#edgeYoutubeTable').bootstrapTable('resetView');
};

function tabSwitch(pane) {
	$('#artistSearch').val("");
	$('#info').toggle(true);
	$('#playlistPane').toggle(false);
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

//jQuery:
$( ".artist" ).autocomplete({
	open:  function() {
		$('.ui-menu').width(220);
	},
	source: function(request, response) {
		$.getJSON('/autocomplete?terms='+request.term.split(' ').join(','), function (data) {
			response(data.response);
		});
	},
    select: function(event, ui) {
    	if (ui.item.id != 'null') {
    		if (ui.item.type == 'artist') {
		    	gv.origin = ui.item.id;
		    	gv.route = "neighbourhood"
		    	gv.genre = null;
		    	//resetZoomLevel();
		    	
		    } else { console.log('term');
		    	gv.term = ui.item.id
		    	gv.termLabel = ui.item.label;
		    	gv.route = "termsubgraph"
		    	gv.origin = null;
		    	gv.genre = null;
		    };
		    reload();
	    };
    }, 	
    focus: function(event, ui) {
    	if (ui.item.id == 'null') {
    		event.preventDefault();
    	}
    },
    delay: 100,
    messages: {
        noResults: 'No artists found.',
        results: function() {}
    },
});

$('#genre').change(function(){
	var newGenre = $('#genre option:selected')[0].value;
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

$('#playlistICON').on("click", function(e){
	$('#playlistDropdown').toggleClass("open");
	//$('#radioDropdown').removeClass("open");
	e.stopPropagation();
});

$('#playlistDropdown').on('hide.bs.dropdown', function (e) {
	e.preventDefault();
});

$('#shuffle').on('click', function() {
	gv.route = "neighbourhood"
	gv.origin = null;
	gv.term = null;
	gv.source = null;
	gv.destination = null;
	gv.rotate = true;
	reload();
})