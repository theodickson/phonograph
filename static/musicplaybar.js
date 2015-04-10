gv.customPlaylist = [] //NOTHING IN PLAYLIST TO STARTONTENTS OF STARTING GRAPH
var currentTrack = null;

// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: 'M7lc1UVf-VE',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function radioMode(){
	$('#previous').disabled=true;
	$('#radioICON').trigger("click");
	$("#tuneIn").hide(500);
	$("#upNext").show(500);
	$("#track1").text("");
};

function playlistMode(){
	$('#previous').disabled=false;
	$('#playlistICON').trigger("click");
	$("#tuneIn").show(500);
	$("#upNext").hide(500);
	$("#track1").text("Up Next: ");
}

function playlistAlert(){
	$('#playlistICON').effect("highlight", {} , 500);
};

function radioAlert(){
	$('#radioICON').effect("highlight", {} , 500);
};

function secondsToString(s){
	var minutes = Math.floor(s / 60);
	var seconds = Math.floor(s - (minutes * 60));
	if(seconds<10){
		return minutes +".0"+seconds;
	}
	else{
		return minutes+"."+seconds;
	};

};

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
	//WHEN YT READY LOAD RADIO 
	loadRadio(true);
};

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;

function parseArtists(track){
	var i;
	artists = track.artists;
	var artistString = artists[0];
	for(i=1; i < artists.length-1;i++){
		artistString = artistString.concat(", ", artists[i]);
	};
	if(artists.length>1){
		artistString = artistString.concat(" and ", artists[artists.length-1]);
	};
	return artistString;
}

function onPlayerStateChange(event) {
	//console.log(event);
	if(event.data == 3 || event.data == -1){
		$('#play-pause').children().hide();
		$('#bufferingsong').show();
	}

	//if new video cued and ready, play the video

	else if(event.data == 0){
		$('#play-pause').children().hide();
		$('#bufferingsong').show();
		playNextTrack();
	}
	else if(event.data == 5){
		$('#play-pause').children().hide();
		$('#bufferingsong').show();
		var track = [];
		if(gv.playMode == "radio"){
			//console.log(track);
			track = gv.nowPlaying;
		}
		else{
			track = gv.customPlaylist[currentTrack];
			console.log(track);
		};
		var artists = parseArtists(track);
		var songName = track.name;
		var playerTrackInfo = artists + ' - '+ songName;
		$('#playerTrackInfo').text(playerTrackInfo);
		player.playVideo();
	}
	else if(event.data == 1){
		$('#play-pause').children().hide();
		$('#pausesong').show();
		var currentpercentage = 0;
		$('#currentTime').text("0.00");
		var duration = player.getDuration();
		$('#duration').text(secondsToString(duration));
		var scrubberMOVE = setInterval(function () {
			var time = Math.floor(player.getCurrentTime());
			$('#currentTime').text(secondsToString(time));
			currentpercentage = 100*player.getCurrentTime()/player.getDuration();
			//console.log(currentpercentage);
			$( "#scrubberSlider" ).slider( "option", "value", currentpercentage);	
		}, 1000);
		$('#bufferingsong').hide();
		$('#pausesong').show();
	};
}

function playNextTrack(){
	$( "#scrubberSlider" ).slider( "option", "value", 0);
	if(gv.playMode == "playlist"){
		playlistAlert();
		refreshPlaylist();
		if(gv.customPlaylist.length == 0){
			refreshPlaylist();
			player.stopVideo();
			$('#playerTrackInfo').text("");
		}
		else{
			if(currentTrack+1<gv.customPlaylist.length ){
				currentTrack +=1;
			}
			else{
				currentTrack=0;
			};
			refreshPlaylist();
			player.cueVideoById(gv.customPlaylist[currentTrack].youtubeId);
		};	
	}
	else if(gv.playMode == "radio"){
		radioAlert();
		performRadioRequests("upNext");
		player.cueVideoById(gv.nowPlaying.youtubeId);
	};
	
}

function playPreviousTrack(){
	refreshPlaylist();
	playlistAlert();
	$( "#scrubberSlider" ).slider( "option", "value", 0);
	if(currentTrack>0) {
		currentTrack -=1;
		refreshPlaylist();
		player.cueVideoById(gv.customPlaylist[currentTrack].youtubeId);
		return true;
	}
	else{
		currentTrack = gv.customPlaylist.length-1;
		refreshPlaylist();
		player.cueVideoById(gv.customPlaylist[currentTrack].youtubeId);
		return false;
	};
};

function playNextFromDropdown(track){
	playlistMode();
	gv.playMode = "playlist";
	if (currentTrack == null){
		currentTrack = 0;
		gv.customPlaylist.push(track);
		player.cueVideoById(track.youtubeId);
	}
	else{
		gv.customPlaylist.splice(currentTrack+1, 0, track);
		gv.currentTrack += 1;
		refreshPlaylist();
	};
	refreshPlaylist();
}
function addTrackToPlaylist(track){
	if(currentTrack == null){
		playNextFromDropdown(track);
	}
	else{
		gv.customPlaylist.push(track);
	};
	refreshPlaylist();
};

function playNext(e){
	playlistAlert();
	var trackData = e.currentTarget.value.split("|");
	console.log(trackData);
	if(typeof trackData[2] === 'undefined'){
	  trackData[2] = "Artist";
	};
	var track = {
		"youtubeId" : trackData[0],
		"name" : trackData[1],
		"artists" : trackData[2].split("*")
	};
	if(!trackData[2]){
		track.artists = "Artist";
	};
	//console.log(trackData);
	if (currentTrack == null){
		currentTrack = 0;
		gv.customPlaylist.push(track);
	}
	else{
		gv.customPlaylist.splice(currentTrack+1, 0, track);
		gv.currentTrack += 1;
		refreshPlaylist();
	};
	refreshPlaylist();
};

function playNow(e){
	playNext(e);
	playNextTrack();
};


addPlaySymboltoPlayingTrack=function(i){
	if(i==currentTrack){
		return '<i class="el el-play"></i>';
	}
	else{
		return " ";
	};
};

getPlaylist = function(){
	var playlistData = [];
	for(i in gv.customPlaylist){
		playlistData.push({
			playing: addPlaySymboltoPlayingTrack(i),
			artist: parseArtists(gv.customPlaylist[i]),
			name: gv.customPlaylist[i].name,
			option: '<button class="btn-sm btn-sidebar optionPlaylist" id="option'+gv.customPlaylist[i][0]+'"><span class="glyphicon glyphicon-option-horizontal"></span></button>',
			remove: '<button class="btn-sm btn-sidebar removeFromPlaylist" id="remove'+gv.customPlaylist[i][0]+'"><i class="el el-remove-sign"></i></button>',
			info: gv.customPlaylist[i]
		});
	};
	return playlistData;
}

$('#playlistTable').bootstrapTable({
        data: getPlaylist()
    });


//Subgraph not ready yet
/*$('#subgraphPane').toggle();*/

/* SUBGRAPH NOT READY YET
$('#subgraphButton').on("click", function(){
	$(this).toggleClass("selected");
	$('#subgraphPane').toggle();
	$('#info').toggle();
	if ($(this).hasClass("selected")) {
			$('#subgraphPane').show();
			$('#info').hide();
			$('#playlistPane').hide();
	    } else {
	        $('#playlistPane').hide();
	        $('#subgraphPane').hide();
	        $('#info').show();
	    }
	refreshPlaylist();
});*/
/*
$('#subgraphButton').on("click", function(){
	$(this).toggleClass("selected");
	$('#info').toggle();
	$('#playlistPane').toggle();
	refreshPlaylist();
})
*/
$('td, th', '#playlistTable').each(function () {
    var cell = $(this);
    cell.width(cell.width());
});

function makePlaylistSortable(){
	$('#playlistTable tbody').sortable({
	        items: '> tr',
	        forcePlaceholderSize: true,
	        placeholder:'must-have-class',
	        axis: 'y',
	        start: function (event, ui) {
	            // Build a placeholder cell that spans all the cells in the row
	            var cellCount = 0;
	            $('td, th', ui.helper).each(function () {
	                // For each TD or TH try and get it's colspan attribute, and add that or 1 to the total
	                var colspan = 1;
	                var colspanAttr = $(this).attr('colspan');
	                if (colspanAttr > 1) {
	                    colspan = colspanAttr;
	                }
	                cellCount += colspan;
	            });

	            // Add the placeholder UI - note that this is the item's content, so TD rather thanTR
	            ui.placeholder.html('<td colspan="' + cellCount + '">&nbsp;</td>');
	        },
	        update: function( event, ui ) {
	        	var rows = $('#playlistTable').find('tr[data-index]');
	        	var newPlaylist = [];
	        	//console.log("BEFORE SLIDE CURRENT TRACK = "+currentTrack);
	        	var currentID = gv.customPlaylist[currentTrack].youtubeId;
	        	for(i=0; i<rows.length;i++){
	        		oldPos = $(rows[i]).attr("data-index");
	        		if(gv.customPlaylist[oldPos].youtubeId==currentID){
	        			currentTrack = i;
	        		};
	        		newPlaylist[i] = gv.customPlaylist[oldPos];
	        	};
	        	//console.log("CURRENT TRACK = " + currentTrack);
	        	gv.customPlaylist = newPlaylist;
	        	//console.log(gv.customPlaylist);
	        	refreshPlaylist();

	        }
	    }).disableSelection();
}

function refreshPlaylist(){
	//console.log("refreshing playlist");
	$playlistTable = $('#playlistTable');
	$playlistTable.bootstrapTable('load', getPlaylist())
	$playlistTable.bootstrapTable('resetView');
	makePlaylistSortable();
	//console.log(gv.customPlaylist);

	//PLAY FROM PLAYLIST ON DOUBLE CLICK OF ROW
	$('#playlistTable').find('tr').dblclick(function(){
		console.log("doubleclicked playlist");
		currentTrack=$(this).attr("data-index");
		refreshPlaylist();
		gv.playMode = "playlist";
		playlistMode();
		player.cueVideoById(gv.customPlaylist[currentTrack][0]);
	});
	//REMOVE FROM PLAYLIST ON CLICK OF 'X'
	$('.removeFromPlaylist').on('click', function(e){
		var index = $(this).closest('tr').attr("data-index");
		//console.log("INDEX ofDELETION : "+index +"    INDEX OF CURRENT "+currentTrack);
		//IF DELETING THE ONLY SONG ON THE PLAYLIST
		if (index == 0 && gv.customPlaylist.length == 1){
			currentTrack = null; //NO CURRENT TRACK PLAYING
			while (gv.customPlaylist.length) { gv.customPlaylist.pop(); }; //DESTROY THE PLAYLIST TO BE SURE OF REMOVING ALL ERRORS
			gv.customPlaylist = [];
		}
		else if(index > -1){
			//console.log(gv.customPlaylist);
			//console.log("DELTING INDEX: "+index);
			gv.customPlaylist.splice(index, 1);
			//IF DELETING THE FIRST TRACK WHICH IS ALSO PLAYING
			if(index==0 && index == currentTrack){
				//console.log("deleting current track which is 1st");
				currentTrack-=1;
				playNextTrack();
			}
			//IF DELETING THE PLAYING TRACK PLAY THE PREVIOUS TRACK
			else if(index==currentTrack){
				//console.log("deleting current track");
				currentTrack-=1;
				playNextTrack();
			}
			//IF DELETING A TRACK BELOW THE CURRENT TRACK EVERYTHING MOVES DOWN IN THE ARRAY
			else if(index<currentTrack){
				//console.log("below track");
				currentTrack-=1;
			}
			//IF DELETING A TRACK ABOVE THE CURRENT TRACK THE CURRENT TRACKS POSITION STAYS THE SAME
			else{
				;
			};
		}
		else{
			alert("ERROR IN REMOVIJNG FROM PLAYLIST, PLEASE LOG ERROR");
		};

		//REFRESH THE PLAYLIST TO REFLECT THE CHANGED ARRAY
		refreshPlaylist();
		e.preventDefault()
	});
}

$('#play-pause').click(function(){
	var playstate = player.getPlayerState();
	if(playstate <= 0 || playstate==2){
		player.playVideo();
		$(this).children().hide();
		$('#pausesong').show();
	}

	else if(playstate == 1){
		player.pauseVideo();
		$(this).children().hide();
		$('#playsong').show();
	}

	else if(playstate == 3|| playstate == 5){
		$(this).children().hide();
		$('#bufferingsong').show();
	}

	else{
		alert("ERROR IN PLAYER");
	};
});

$('#next').click(function(){
	playNextTrack();
});

$('#previous').click(function(){
	if (gv.mode = 'playlist') {
		playPreviousTrack();
	};
});

$('body').on('click','.addToPlaylist', function (e) {
	addTrackToPlaylist(e);    
});

$('body').on('click','.playNowButton', function (e) {
	gv.playMode = 'playlist';
	playlistMode();

	playNow(e);
});

function setVolIcon(){
	var vol = $( "#volumeSlider" ).slider( "option", "value" );
	if(vol>60){
		$('#VolUp').show();
		$('#VolDown').hide();
		$('#VolMute').hide();
	}
	else if(vol>0){
		$('#VolUp').hide();
		$('#VolDown').show();
		$('#VolMute').hide();
	}
	else{
		$('#VolUp').hide();
		$('#VolDown').hide();
		$('#VolMute').show();
	};

};

var currentVol;

$('#volumeButton').on('click', function(){
	if($( "#volumeSlider" ).slider( "option", "value" )==0){
		$( "#volumeSlider" ).slider( "option", "value", currentVol);
		player.setVolume(currentVol);
		setVolIcon();

	}
	else{
		currentVol = $( "#volumeSlider" ).slider( "option", "value" );
		$( "#volumeSlider" ).slider( "option", "value", 0 );
		player.setVolume(0);
		setVolIcon();
	};
});

$('#VolUp').hide();
$('#VolDown').show();
$('#VolMute').hide();

$('#volumeSlider').slider({
	orientation: "vertical",
	range: "min",
	min: 0,
	max: 100,
	value: 60,
	create: function(event, ui){
		$(this).find('.ui-slider-handle').hide();
	},
	slide: function( event, ui ) {
		player.setVolume(ui.value);
		setVolIcon();
		if(ui.value==0){
			$('#VolUp').hide();
			$('#VolDown').hide();
			$('#VolMute').show();
		};

	}    
});

$('#scrubberSlider').slider({
	orientation: "horizonal",
	range: "min",
	min: 0,
	max: 100,
	value: 0,
	create: function(event, ui){
		$(this).find('.ui-slider-handle').css({
			"height": "0.7em", 
			"width": "0.7em"
		});
	},
	slide: function( event, ui ) {
		player.seekTo(ui.value*player.getDuration()/100, true);
		
	}

});

//$('.ui-slider-handle').hide();

function isEllipsisActive(e) {
    return (e[0].offsetWidth < e[0].scrollWidth);
}
$("#INFO").hover(function () {
    if(isEllipsisActive($('#playerTrackInfo')) || $('#playerTrackInfo').hasClass('marquee')){
    	////console.log("active");
        $("#playerTrackInfo").toggleClass("marquee ellipsis");
    }
    else{
    	////console.log("unactive");
    };
});

var navBarElementWidth = $('#consoleElement').width();
var bottomLeftNavWidth = $('#bottomLeftNav').width();
var scrubberSliderWidth = bottomLeftNavWidth - (10*navBarElementWidth);
var totalWidth = $( window ).width();
var playerInfoWidth = totalWidth - bottomLeftNavWidth - 2*navBarElementWidth;
$('#scrubberSlider').width(scrubberSliderWidth);
$('#INFO').width(playerInfoWidth);
$('#playerTrackInfo').width(playerInfoWidth);

$('#volumeButton').mouseover(function(){
	if($('#VolMute').is(":visible")){
	}
	else{
		$('#volumeButton').dropdown('toggle');	
	};
});

//CHECK FOR SERVICE
var currentService = gv.currentService; //INITIAL SERVICE IS YOUTUBE BY DEFAULT
$('.spotify').hide();

$('.service-choice').on('click', function(){
	//console.log(currentService);
	var newService = $(this).attr("id").replace("service-choice-", "");
	var newIcon = $(this).children('i').clone();
	$('#service-choice-displayed').children().first().replaceWith(newIcon);
	$('.'+currentService).hide();
	$('.'+newService).show().filter('li').each(function(){
		$(this).find('a').tab('show');
	});
	$('.content-'+currentService).hide();
	$('.content-'+newService).show();
  	//IF SWITCHING OUT OF YT THEN PAUSE THE YT MUSIC
  	if (gv.currentService != newService) {
  		gv.currentService = newService;
	  	if(newService!="youtube"){
	  		player.pauseVideo();
	  		$('#playsong').toggle(true);
	  		$('#pausesong').toggle(false);
	  		$('#bufferingsong').toggle(false);
	  	};
	  	//IF SWITICHING OUT OF SPOTIFY THEN DESTROY SPOTIFY IFRAMES
	  	if(newService!="spotify"){
	  		$('.spotify').find('iframe').remove();
	  	};
	  	if (gv.currentLink) {
	  		loadEdgeInfo();
	  	};
	  	if (gv.currentArtist) {
	  		loadArtistInfo();
	  	};
	};
});

//REFRESH PLAYLIST ON OPEN
$('#playlistDropdown').on('click', function(){
	refreshPlaylist();
});

//HIDE YOUTUBE
$('.videoWrapper').hide();

$('body')
.on( 'click', '.dropdown-menu', function (e){
    e.stopPropagation();
});

//IF MODE IS RADIO PLAY THE RADIO
function phonograph(){
	gv.radioStarted = true;
	console.log(gv.nowPlaying);
	player.cueVideoById(gv.nowPlaying.youtubeId);
}

//SWTICH TO RADIO MODE ON TUNE IN BUTTON
$('#tuneIn').on("click", function(){
	gv.playMode = "radio";
	radioMode();
	player.cueVideoById(gv.upNext.youtubeId);
});
























































