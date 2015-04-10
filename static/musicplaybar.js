var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
gv.customPlaylist = [] //NOTHING IN PLAYLIST TO STARTONTENTS OF STARTING GRAPH
var currentTrack = null;

function onYouTubeIframeAPIReady() {
	player = new YT.Player('player', {
		height: '100',
		width: '640',
		videoId: 'M7lc1UVf-VE',
		events: {
			'onReady': onPlayerReady,
			'onStateChange': onPlayerStateChange
		}

	});
}

function playlistAlert(){
	$('#playlistICON').effect("highlight", {} , 500);
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
	if(gv.customPlaylist.length !=0){
		player.cueVideoById(gv.customPlaylist[0][0]);
	};
};

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;

function parseArtists(track){
	var artists = "";
	var i;
	artists = track[2];
	for(i=3; i < track.length-1;i++){
		artists = artists.concat(", ", track[i]);
	};
	if(track.length>3){
		artists = artists.concat(" and ", track[track.length-1]);
	};
	return artists;
}

function onPlayerStateChange(event) {
	console.log(event);
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
		var track = gv.customPlaylist[currentTrack];
		var artists = parseArtists(track);
		var songName = track[1];
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
	playlistAlert();
	refreshPlaylist();
	$( "#scrubberSlider" ).slider( "option", "value", 0);
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
		player.cueVideoById(gv.customPlaylist[currentTrack][0]);
	};
}

function playPreviousTrack(){
	refreshPlaylist();
	playlistAlert();
	$( "#scrubberSlider" ).slider( "option", "value", 0);
	if(currentTrack>0) {
		currentTrack -=1;
		refreshPlaylist();
		player.cueVideoById(gv.customPlaylist[currentTrack][0]);
		return true;
	}
	else{
		currentTrack = gv.customPlaylist.length-1;
		refreshPlaylist();
		player.cueVideoById(gv.customPlaylist[currentTrack][0]);
		return false;
	};
};

function playNow(e){
	refreshPlaylist();
	playlistAlert();
	$( "#scrubberSlider" ).slider( "option", "value", 0);	
	var trackData = e.currentTarget.value.split(",");
	if(trackData.length < 3){
		trackData[2] = $('#node-title').text();
	};
	console.log(trackData);
	if (currentTrack == null){
		currentTrack = 0;
		gv.customPlaylist.push(trackData);
	}
	else{
		currentTrack+=1;
		gv.customPlaylist.splice(currentTrack, 0, trackData);
		refreshPlaylist();
	};
	console.log(gv.customPlaylist[currentTrack]);
	player.cueVideoById(gv.customPlaylist[currentTrack][0]);
};

var $add = $('.add-to-playlist');
var $table = $('.youtube-table');

$add.click(function () {
	console.log("clicked add to playlist");
	console.log($(this).closest('table'));
	var addedSongs = $table.bootstrapTable('getSelections');
	console.log(addedSongs);
});

function addTrackToPlaylist(e){
	playlistAlert();
	var ID = e.currentTarget.value;
	var artist = $('#sideBarTitle').text();
	var trackName = $(e.currentTarget).parent().parent().find(">:first-child")[0].textContent;
	gv.customPlaylist.push([ID, artist, trackName]);
	refreshPlaylist();
}

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
			title: gv.customPlaylist[i][1],
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
$('#playlistPane').toggle();
$('#subgraphPane').toggle();

$('#playlistButton').on("click", function(){
	$(this).toggleClass("selected");
	$('#playlistPane').toggle();
	$('#info').toggle();
	if ($(this).hasClass("selected")) {
			$('#playlistPane').show();
			$('#info').hide();
			$('#subgraphPane').hide();
	    } else {
	        $('#playlistPane').hide();
	        $('#subgraphPane').hide();
	        $('#info').show();
	    }
	refreshPlaylist();
});

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
});
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
	        	console.log("BEFORE SLIDE CURRENT TRACK = "+currentTrack);
	        	var currentID = gv.customPlaylist[currentTrack][0];
	        	for(i=0; i<rows.length;i++){
	        		oldPos = $(rows[i]).attr("data-index");
	        		if(gv.customPlaylist[oldPos][0]==currentID){
	        			currentTrack = i;
	        		};
	        		newPlaylist[i] = gv.customPlaylist[oldPos];
	        	};
	        	console.log("CURRENT TRACK = " + currentTrack);
	        	gv.customPlaylist = newPlaylist;
	        	console.log(gv.customPlaylist);
	        	refreshPlaylist();

	        }
	    }).disableSelection();
}

function refreshPlaylist(){
	console.log("refreshing playlist");
	$playlistTable = $('#playlistTable');
	$playlistTable.bootstrapTable('load', getPlaylist())
	$playlistTable.bootstrapTable('resetView');
	makePlaylistSortable();
	console.log(gv.customPlaylist);

	//PLAY FROM PLAYLIST ON DOUBLE CLICK OF ROW
	$('#playlistTable').find('tr').dblclick(function(){
		currentTrack=$(this).attr("data-index");
		refreshPlaylist();
		player.cueVideoById(gv.customPlaylist[currentTrack][0]);
	});
	//REMOVE FROM PLAYLIST ON CLICK OF 'X'
	$('.removeFromPlaylist').on('click', function(){
		var index = $(this).closest('tr').attr("data-index");
		console.log("DELETING TRACK " +index);
		console.log("CURRENT SONG "+currentTrack);
		console.log(gv.customPlaylist);

		//IF DELETING THE ONLY SONG ON THE PLAYLIST
		if (index = 0 && gv.customPlaylist.length == 1){
			currentTrack = null; //NO CURRENT TRACK PLAYING
			while (gv.customPlaylist.length) { gv.customPlaylist.pop(); }; //DESTROY THE PLAYLIST TO BE SURE OF REMOVING ALL ERRORS
			gv.customPlaylist = [];
		}
		else if(index > -1){
			gv.customPlaylist.splice(index, 1);
			//IF DELETING THE FIRST TRACK WHICH IS ALSO PLAYING
			if(index==0 && index == currentTrack){
				console.log("deleting current track which is 1st");
				currentTrack-=1;
				playNextTrack();
			}
			//IF DELETING THE PLAYING TRACK PLAY THE PREVIOUS TRACK
			else if(index==currentTrack){
				console.log("deleting current track");
				currentTrack-=1;
				playNextTrack();
			}
			//IF DELETING A TRACK BELOW THE CURRENT TRACK EVERYTHING MOVES DOWN IN THE ARRAY
			else if(index<currentTrack){
				console.log("below track");
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
	playPreviousTrack();
});

$('body').on('click','.addToPlaylist', function (e) {
	addTrackToPlaylist(e);
      
});

$('body').on('click','.playNowButton', function (e) {
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
    	//console.log("active");
        $("#playerTrackInfo").toggleClass("marquee ellipsis");
    }
    else{
    	//console.log("unactive");
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
	console.log(currentService);
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
  	gv.currentService = newService;
  	currentService = newService;
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




























































