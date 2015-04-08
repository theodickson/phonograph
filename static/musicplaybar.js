var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
var customPlaylist = [['bVP_w1rQweE', 'Action Bronson', 'Random Song'], ["S2RVO_wPrKU", "KRS-One & Channel Live", "Blade"], ["81ETUwMHtqk", "KRS-One & MC Lars", "What Is Hip-Hop?"]]; // ARBITRARY STARTING MUSIC, WILL BE CHOSEN TO REFLECT CONTENTS OF STARTING GRAPH
var currentTrack = 0;

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
	player.cueVideoById(customPlaylist[0][0]);
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;
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
		var artist = customPlaylist[currentTrack][1];
		var songName = customPlaylist[currentTrack][2];
		var playerTrackInfo = artist + ' - '+ songName;
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
	if(currentTrack+1<customPlaylist.length ){
		currentTrack +=1;
	}
	else{
		currentTrack=0;
	};
	refreshPlaylist(customPlaylist);
	player.cueVideoById(customPlaylist[currentTrack][0]);
}

function playPreviousTrack(){
	$( "#scrubberSlider" ).slider( "option", "value", 0);
	if(currentTrack>0) {
		currentTrack -=1;
		refreshPlaylist(customPlaylist);
		player.cueVideoById(customPlaylist[currentTrack][0]);
		return true;
	}
	else{
		return false;
	};
};

function playNow(e){
	console.log(e);
	$( "#scrubberSlider" ).slider( "option", "value", 0);	
	var ID = e.currentTarget.value;
	console.log(ID);
	var artist = $('#sideBarTitle').text();
	console.log(artist);
	var trackName = $(e.currentTarget).parent().parent().find(">:first-child")[0].textContent;
	currentTrack+=1;
	customPlaylist.splice(currentTrack, 0, [ID, artist, trackName]);
	refreshPlaylist(customPlaylist);
	player.cueVideoById(customPlaylist[currentTrack][0]);
};

function addTrackToPlaylist(e){
	var ID = e.currentTarget.value;
	var artist = $('#sideBarTitle').text();
	var trackName = $(e.currentTarget).parent().parent().find(">:first-child")[0].textContent;
	console.log(trackName);
	customPlaylist.push([ID, artist, trackName]);
}

addPlaySymboltoPlayingTrack=function(i, currentTrack){
	if(i==currentTrack){
		return '<i class="el el-play"></i>'+customPlaylist[i][1] + ' - ' + customPlaylist[i][2];
	}
	else{
		return customPlaylist[i][1] + ' - ' + customPlaylist[i][2];
	};
};

getPlaylist = function(){
	var playlistData = [];
	for(i in customPlaylist){
		playlistData.push({
			track: addPlaySymboltoPlayingTrack(i, currentTrack),
			option: '<button class="btn-sm btn-sidebar optionPlaylist" id="option'+customPlaylist[i][0]+'"><span class="glyphicon glyphicon-option-horizontal"></span></button>',
			remove: '<button class="btn-sm btn-sidebar removeFromPlaylist" id="remove'+customPlaylist[i][0]+'"><i class="el el-remove-sign"></i></button>',
			info: customPlaylist[i]
			
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
	refreshPlaylist(customPlaylist);
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
	refreshPlaylist(customPlaylist);
});
/*
$('#subgraphButton').on("click", function(){
	$(this).toggleClass("selected");
	$('#info').toggle();
	$('#playlistPane').toggle();
	refreshPlaylist(customPlaylist);
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
	        	var currentID = customPlaylist[currentTrack][0];
	        	for(i=0; i<rows.length;i++){
	        		oldPos = $(rows[i]).attr("data-index");
	        		if(customPlaylist[oldPos][0]==currentID){
	        			currentTrack = i;
	        		};
	        		newPlaylist[i] = customPlaylist[oldPos];
	        	};
	        	console.log("CURRENT TRACK = " + currentTrack);
	        	customPlaylist = newPlaylist;
	        	console.log(customPlaylist);
	        	refreshPlaylist();

	        }
	    }).disableSelection();
}

function refreshPlaylist(customPlaylist){
	console.log("refreshing playlist");
	$playlistTable = $('#playlistTable');
	$playlistTable.bootstrapTable('load', getPlaylist())
	$playlistTable.bootstrapTable('resetView');
	makePlaylistSortable();

	//PLAY FROM PLAYLIST ON DOUBLE CLICK OF ROW
	$('#playlistTable').find('tr').dblclick(function(){
		currentTrack=$(this).attr("data-index");
		refreshPlaylist(customPlaylist);
		player.cueVideoById(customPlaylist[currentTrack][0]);
	});
	//REMOVE FROM PLAYLIST ON CLICK OF 'X'
	$('.removeFromPlaylist').on('click', function(){
		var index = $(this).closest('tr').attr("data-index");
		//IF TRACK FOUND ON PLAYLIST AND IN CUSTOMPLAYLIST ARRAY THEN
		if(index > -1){
			customPlaylist.splice(index, 1);
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
		};

		//REFRESH THE PLAYLIST TO REFLECT THE CHANGED ARRAY
		refreshPlaylist(customPlaylist);
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
    	console.log("active");
        $("#playerTrackInfo").toggleClass("marquee ellipsis");
    }
    else{
    	console.log("unactive");
    };
});

var navBarElementWidth = $('#consoleElement').width();
var bottomLeftNavWidth = $('#bottomLeftNav').width();
var scrubberSliderWidth = bottomLeftNavWidth - (8*navBarElementWidth);
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
var currentService = dataset.currentService; //INITIAL SERVICE IS YOUTUBE BY DEFAULT
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
  	dataset.currentService = newService;
  	currentService = newService;
})






























































