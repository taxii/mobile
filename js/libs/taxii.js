$(document).bind("mobileinit", function() {
    $.mobile.allowCrossDomainPages = true;
    $.mobile.loader.prototype.options.text = "loading";
    $.mobile.loader.prototype.options.textVisible = true;
    $.mobile.loader.prototype.options.theme = "b";
    $.mobile.buttonMarkup.hoverDelay = 100;
    $.mobile.phonegapNavigationEnabled = true;

});

document.addEventListener("deviceready", onDeviceReady, false);
 //$(document).bind( 'pageinit', onDeviceReady);

document.addEventListener("backbutton", function(e) {
    if ($.mobile.activePage.is('#mainPage')) {
	e.preventDefault();
	navigator.app.exitApp();
    } else {
	navigator.app.backHistory();
    }
}, false);

$(document).ajaxStart(function() {
    $.mobile.loading('show');
});

$(document).ajaxStop(function() {
    $.mobile.loading('hide');
});

var frommap;
var fromPlace;
var toPlace;
var requestFunction;
var orgUpdate;
var destUpdate;
var requestStatusFunction;
var faresUrl = 'http://dev01.taxii.co.za:8080/engine/fares';

function onDeviceReady() {
    setControlActions();
    showOnlyPage('mainPage');
    var custId = window.localStorage.getItem("custId");
    if (custId == null) {
	showOnlyPage('loginPage');
    } else {
	checkForActiveFare(window.localStorage.getItem("custId"), function (fares) {
	    onActiveFares(fares);
	});
    }

}

function displayTime(currentTime) {
    var str = "";

    var str = currentTime.getDay()+"-"+currentTime.getMonth()+"-" + currentTime.getFullYear() + " ";

    var hours = currentTime.getHours()
    var minutes = currentTime.getMinutes()
    var seconds = currentTime.getSeconds()

    if (minutes < 10) {
        minutes = "0" + minutes
    }
    if (seconds < 10) {
        seconds = "0" + seconds
    }
    str += hours + ":" + minutes + ":" + seconds + " ";
    if(hours > 11){
        str += "PM"
    } else {
        str += "AM"
    }

    return str;
}

function showOnlyPage(page) {
    var pages = [ 'mainPage', 'confirmPage', 'from-art-3', 'menu', 'taxiHere', 'loginPage', 'noActive', 'fareListPage', 'registerPage' ]
    document.getElementById(page).style.display = "block";
    for (i = 0; i < pages.length; i++) {
	if (pages[i] != page) {
	    document.getElementById(pages[i]).style.display = "none";
	}
    }

}

function initializeMainPage() {
    showOnlyPage('mainPage');
    document.getElementById('fromInput').style.display = "block";
    document.getElementById('from_map_canvas').style.display = "block";
    //if ($('#time').val() == '') {
	//$('#time').val(new Date());

	//$('#time').data('datebox').options.defaultPickerValue = new Date();

	  // Set minDays to disallow anything earlier
	 // $('#time').data('datebox').options.minDays = diff;
    //}

    if ($('#from').val() == '') {
	navigator.geolocation.getCurrentPosition(onGetCurrentPositionSuccess, onGetCurrentPositionError, {enableHighAccuracy: false});
	$.mobile.loading('show');
    }

}


function onActiveFares(fares) {
    if (fares == null || fares == '' || fares.length == 0 ) {
	initializeMainPage();
    }
    else if(fares != null && fares.length == 1) {
	fareStatusRequest(fares[0]);
    }
    else if(fares != null && fares.length > 1) {
	 getFaresTemplate(fares);
    }
    else {
	initializeMainPage();
    }

}
function updateFaresTable(fares) {
    var text = buildFareList(fares);
    $('#faresList').empty().append(text);
    showOnlyPage('fareListPage');
    requestStatusFunction = setTimeout(function() {
	checkForActiveFare(window.localStorage.getItem("custId"), function(fares) {
	    $('#faresList').empty().append(buildFareList(fares));
	    showOnlyPage('fareListPage');
	});
    }, 10000);
}


function buildFareList(fares) {
    return _.template( $( "#fare-tmpl" ).html(), {"fares": fares});
}
function getFaresTemplate(fares) {
    $.ajax({
        url: "tmpl/fares.tmpl",
        dataType: "html",
        success: function( data ) {
            $( "head" ).append( data );
            updateFaresTable(fares);
        }
    });
}

function checkForActiveFare(custId, onActiveFare) {
    $.ajax({
	url : faresUrl + '/active?customer=' + custId,
	contentType : "application/json",
	dataType : "json",
	type : "GET",
	beforeSend : function(xhr1) {
	    xhr1.setRequestHeader("Authorization", "Basic " + Base64.encode("dev@taxii.co.za:dev"));
	    xhr1.setRequestHeader("Accept", "application/json");
	},
	success : function(data) {
	    onActiveFare(data);
	},
	error : function(error) {
	    alert('checkForActiveFare error'+JSON.stringify(error));
	    console.log(error);
	    onActiveFare(null);
	}
    });

}

function setControlActions() {
    $('#loginButton').click(function(event) {
	window.localStorage.setItem("custId", $('#username').val());
	checkForActiveFare(window.localStorage.getItem("custId"), function (fares) {
	    onActiveFares(fares);
	});

    });

    $('#activeFare').click(function(event) {
	checkForActiveFare(window.localStorage.getItem("custId"), function (fares) {
	    onActiveFares(fares);
	});
    });

    $('#register').click(function(event) {

	var userInfo = '{ "cellphone": "'+ $('#phone').val() + '", "email": "'+ $('#email').val() + '","firstName": "'+ $('#firstName').val() + '",'
	+'"lastName": "' + $('#lastName').val() + '","password": "' + document.getElementById('password').value + '"}';
	alert(userInfo);
	registerUser(userInfo);
    });


    $('#registerRequest').click(function(event) {
	showOnlyPage('registerPage');
    });


    $('#menuNew').click(function(event) {
	clearTimeout(requestFunction);
	clearTimeout(requestStatusFunction);
	initializeMainPage();
	$.mobile.loading('hide');
	$('#fromTab').click();
    });
    $('#noActiveNew').click(function(event) {
	$('#menuNew').click();
    });

    $('#show').click(function(event) {
	var org = new google.maps.LatLng(parseFloat($('#fromLat').val()), parseFloat($('#fromLng').val()));
	var dest = new google.maps.LatLng(parseFloat($('#toLat').val()), parseFloat($('#toLng').val()));
	showRouteOnMap(org, dest, 'route_map_canvas');
    });

    $('#backConfirmPage').click(function(event) {
	showOnlyPage('mainPage');
    });

    $('#menuButton').click(function(event) {
	showOnlyPage('menu');
    });

    $('#exit').click(function(event) {
	navigator.notification.confirm('Are you sure you want to exit?', // message
	exitApplication, // callback to invoke with index of button pressed
	'Exit confirm', // title
	'Exit,Cancel' // buttonLabels
	);

    });

    $('#showTaxiStatus').click(function(event) {
	showRouteOnMap(orgUpdate, destUpdate, 'status_map_canvas');
    });

    $('#request').click(
	    function(event) {
		event.preventDefault();
		var picKUp = $('#time').val();
		var fareInfo = '{ "customer": "'+ window.localStorage.getItem("custId") + '",'
		+'"pickupTime": "' + new Date().getTime() + '",'
		+'"pickup" : { "latitude" : "' + $('#fromLat').val() + '", "longitude" : "' + $('#fromLng').val() + '" , "address": "'+$('#from').val()+'"   },'
		+'"dropOff" : { "latitude" : "' + $('#toLat').val() + '", "longitude": "' + $('#toLng').val() + '", "address": "'+$('#to').val()+'" }'
		+ '}';
		requestFare(fareInfo);
	    });

    $('#fromTab').click(function(event) {
	document.getElementById('fromInput').style.display = "block";
	document.getElementById('from_map_canvas').style.display = "block";
	document.getElementById('toInput').style.display = "none";
	document.getElementById('timeInput').style.display = "none";

	var lat = parseFloat($('#fromLat').val());
	var lng = parseFloat($('#fromLng').val());
	var latlng = new google.maps.LatLng(lat, lng);

	var mapOptions = {
	    center : latlng,
	    zoom : 13,
	    mapTypeId : google.maps.MapTypeId.ROADMAP
	};
	frommap = new google.maps.Map(document.getElementById('from_map_canvas'), mapOptions);
	var size = scale($(window).width(), $(window).height(), 0, 1);
	var w = size.width;
	var h = size.height;
	var mapHeight = Math.floor((70 / 100) * h);
	var mapWidth = Math.floor((90 / 100) * w);

	$('#from_map_canvas').width(mapWidth);
	$('#from_map_canvas').height(mapHeight);

	google.maps.event.trigger(frommap, 'resize');

	var infowindow = new google.maps.InfoWindow();
	var marker = new google.maps.Marker({
	    map : frommap
	});
	var image = new google.maps.MarkerImage(place.icon, new google.maps.Size(71, 71), new google.maps.Point(0, 0), new google.maps.Point(17, 34), new google.maps.Size(35, 35));
	marker.setIcon(image);
	marker.setPosition(latlng);
	infowindow.setContent(fromPlace);
	infowindow.open(frommap, marker);

    });

    $('#toTab').click(function(event) {

	document.getElementById('timeInput').style.display = "none";
	document.getElementById('fromInput').style.display = "none";
	document.getElementById('toInput').style.display = "block";
	document.getElementById('from_map_canvas').style.display = "block";

	if ($('#toLat').val() != '') {
	    var lat = parseFloat($('#toLat').val());
	    var lng = parseFloat($('#toLng').val());
	    var latlng = new google.maps.LatLng(lat, lng);

	    var mapOptions = {
		center : latlng,
		zoom : 13,
		mapTypeId : google.maps.MapTypeId.ROADMAP
	    };
	    frommap = new google.maps.Map(document.getElementById('from_map_canvas'), mapOptions);
	    var size = scale($(window).width(), $(window).height(), 0, 1);
	    var w = size.width;
	    var h = size.height;
	    var mapHeight = Math.floor((70 / 100) * h);
	    var mapWidth = Math.floor((90 / 100) * w);

	    $('#from_map_canvas').width(mapWidth);
	    $('#from_map_canvas').height(mapHeight);

	    google.maps.event.trigger(frommap, 'resize');
	    var infowindow = new google.maps.InfoWindow();
	    var marker = new google.maps.Marker({
		map : frommap
	    });

	    var image = new google.maps.MarkerImage(place.icon, new google.maps.Size(71, 71), new google.maps.Point(0, 0), new google.maps.Point(17, 34), new google.maps.Size(35, 35));
	    marker.setIcon(image);
	    marker.setPosition(latlng);

	    infowindow.setContent(toPlace);
	    infowindow.open(frommap, marker);
	}

    });

    $('#accept').click(function(event) {
	event.preventDefault();
	acceptFare();
    });

    $('#timeTab').click(function(event) {
	document.getElementById('from_map_canvas').style.display = "none";
	document.getElementById('fromInput').style.display = "none";
	document.getElementById('toInput').style.display = "none";
	document.getElementById('timeInput').style.display = "block";

    });

    // tabs
    $(document).delegate('.ui-navbar a', 'click', function() {
	$(this).addClass('ui-btn-active');
	$('.content_div').hide();
	$('#' + $(this).attr('data-href')).show();
    });

}

function exitApplication(buttonIndex) {
    if (buttonIndex == 1) {
	navigator.app.exitApp();
    }
}



function requestFare(fareInfo) {
    console.log(fareInfo);
    $.ajax({
	url : faresUrl,
	contentType : "application/json",
	dataType : "json",
	type : "POST",
	data : fareInfo,
	beforeSend : function(xhr1) {
	    xhr1.setRequestHeader("Authorization", "Basic " + Base64.encode("dev@taxii.co.za:dev"));
	    xhr1.setRequestHeader("Accept", "application/json");
	},
	success : function(data) {
	    if (data && data.uuid) {
		$('#uuid').val(data.uuid);
	    }
	    $('#timeDetails').text($('#time').val());
	    $('#fromDetails').text($('#from').val());
	    $('#toDetails').text($('#to').val());

	    $('#durDetails').text(data.duration);
	    $('#disDetails').text(data.distance);
	    $('#costDetails').text(data.amount);
	    showOnlyPage('confirmPage');

	},
	error : function(error) {
	    alert('error' + error);
	    showOnlyPage('mainPage');
	    alert(JSON.stringify(error));
	    console.log(error);
	}
    });
}

function acceptFare() {
    $.ajax({
	url : faresUrl +'/' + $('#uuid').val() + '/ACCEPTED',
	contentType : "application/json",
	dataType : "json",
	type : "PUT",
	beforeSend : function(xhr1) {
	    xhr1.setRequestHeader("Authorization", "Basic " + Base64.encode("dev@taxii.co.za:dev"));
	    xhr1.setRequestHeader("Accept", "application/json");
	},

	success : function(data) {
	    var fare = data;
	    showOnlyPage('from-art-3');
	    if (fare) {
		fareStatusRequest(fare)
	    }

	},

	error : function(error) {
	    showOnlyPage('from-art-3');
	    alert(JSON.stringify(error));
	    console.log(error);
	}
    });
}

function registerUser(userInfo) {

    $.ajax({
	url : 'http://dev01.taxii.co.za:8080/engine/customers',
	contentType : "application/json",
	dataType : "json",
	type : "POST",
	data : userInfo,
	beforeSend : function(xhr1) {
	    xhr1.setRequestHeader("Authorization", "Basic " + Base64.encode("dev@taxii.co.za:dev"));
	    xhr1.setRequestHeader("Accept", "application/json");
	},

	success : function(data) {

	    window.localStorage.setItem("custId", $('#email').val());
	    alert(JSON.stringify(data));
	    initializeMainPage();

	},

	error : function(error) {
	    showOnlyPage('registerPage');
	    alert(JSON.stringify(error));
	    console.log(error);
	}
    });

}
function fareStatusRequest(fare) {

    $.ajax({
	url : faresUrl +'/' + fare.uuid + '/state',
	contentType : "application/json",
	dataType : "json",
	type : "GET",
	beforeSend : function(xhr1) {
	    xhr1.setRequestHeader("Authorization", "Basic " + Base64.encode("dev@taxii.co.za:dev"));
	    xhr1.setRequestHeader("Accept", "application/json");
	},
	success : function(data) {
	    showOnlyPage('from-art-3');
	    var farestate = data;
	    if (farestate) {
		if (farestate.distance) {
		    $('#distance').text(farestate.distance);
		}
		if (farestate.eta) {
		    $('#eta').text(farestate.eta);
		}
		if (farestate.location) {
		    $('#location').text(farestate.location.address);
		    $('#operator').text(farestate.operator.firstName + ' ' + farestate.operator.lastName);
		    $('#vehicle').text(farestate.taxi.registration);
		    orgUpdate = new google.maps.LatLng(parseFloat(farestate.location.latitude), parseFloat(farestate.location.longitude));
		    destUpdate = new google.maps.LatLng(parseFloat(fare.pickup.latitude), parseFloat(fare.pickup.longitude));
		}

		if (farestate.status == 'PICKED_UP') {
		    clearTimeout(requestFunction);
		    clearTimeout(requestStatusFunction);
		    showOnlyPage('taxiHere');

		} else {
		    requestFunction = setTimeout(function() {
			fareStatusRequest(fare);
		    }, 10000);
		}
	    }

	},
	error : function(error) {
	    alert(JSON.stringify(error));
	    console.log(error);
	    showOnlyPage('from-art-3');
	}
    });

}




/**** UTILITY ***/
function showRouteOnMap(org, dest, map_canvas) {

    if(org){
    var myOptions = {
	zoom : 13,
	center : org,
	mapTypeId : google.maps.MapTypeId.ROADMAP
    };
    var size = scale($(window).width(), $(window).height(), 0, 1);
    var w = size.width;
    var h = size.height;
    var mapHeight = Math.floor((80 / 100) * h);
    var mapWidth = Math.floor((90 / 100) * w);

    $("#" + map_canvas).width(mapWidth);
    $("#" + map_canvas).height(mapHeight);
    var map = new google.maps.Map(document.getElementById(map_canvas), myOptions);


    //google.maps.event.trigger(map, 'resize');

    var rendererOptions = {
	map : map
    };
    var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
    var request = {
	origin : org,
	destination : dest,
	travelMode : google.maps.DirectionsTravelMode.DRIVING
    };

    directionsService = new google.maps.DirectionsService();
    directionsService.route(request, function(response, status) {
	if (status == google.maps.DirectionsStatus.OK) {
	    directionsDisplay.setDirections(response);
	} else
	    alert('Failed to get route details');
    });
    }
    else {
	alert('Still fetching map data.');
    }

}
function scale(width, height, padding, border) {
    var scrWidth = $(window).width() - 30, scrHeight = $(window).height() - 30, ifrPadding = 2 * padding, ifrBorder = 2 * border, ifrWidth = width + ifrPadding + ifrBorder, ifrHeight = height
	    + ifrPadding + ifrBorder, h, w;

    if (ifrWidth < scrWidth && ifrHeight < scrHeight) {
	w = ifrWidth;
	h = ifrHeight;
    } else if ((ifrWidth / scrWidth) > (ifrHeight / scrHeight)) {
	w = scrWidth;
	h = (scrWidth / ifrWidth) * ifrHeight;
    } else {
	h = scrHeight;
	w = (scrHeight / ifrHeight) * ifrWidth;
    }
    return {
	'width' : w - (ifrPadding + ifrBorder),
	'height' : h - (ifrPadding + ifrBorder)
    };
}

var onGetCurrentPositionSuccess = function(position) {

    var lat = parseFloat(position.coords.latitude);
    var lng = parseFloat(position.coords.longitude);
    var latlng = new google.maps.LatLng(lat, lng);

    var mapOptions = {
	center : latlng,
	zoom : 13,
	mapTypeId : google.maps.MapTypeId.ROADMAP
    };
    frommap = new google.maps.Map(document.getElementById('from_map_canvas'), mapOptions);

    var size = scale($(window).width(), $(window).height(), 0, 1);
    var w = size.width;
    var h = size.height;
    var mapHeight = Math.floor((70 / 100) * h);
    var mapWidth = Math.floor((90 / 100) * w);

    $('#from_map_canvas').width(mapWidth);
    $('#from_map_canvas').height(mapHeight);
    google.maps.event.trigger(frommap, 'resize');

    $('#fromLat').val(lat);
    $('#fromLng').val(lng);

    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
	'latLng' : latlng
    }, function(results, status) {
	if (status == google.maps.GeocoderStatus.OK) {
	    if (results[0]) {
		$('#from').val(results[0].formatted_address);
	    }
	}
    });

    var countryoptions = {
	componentRestrictions : {
	    country : 'za'
	},
	types : [ 'geocode' ]
    };
    var frominput = document.getElementById('from');
    var fromautocomplete = new google.maps.places.Autocomplete(frominput, countryoptions);
    fromautocomplete.bindTo('bounds', frommap);

    var toinput = document.getElementById('to');
    var toautocomplete = new google.maps.places.Autocomplete(toinput, countryoptions);
    toautocomplete.bindTo('bounds', frommap);

    var infowindow = new google.maps.InfoWindow();
    var marker = new google.maps.Marker({
	map : frommap
    });

    google.maps.event.addListener(fromautocomplete, 'place_changed', function() {
	infowindow.close();
	marker.setVisible(false);
	// frominput.className = '';
	var place = fromautocomplete.getPlace();
	if (!place.geometry) {
	    // Inform the user that the place was not found and
	    // return.
	    // frominput.className = 'notfound';
	    alert("Place not found, make sure street name is spelled correctly");
	    return;
	}

	// If the place has a geometry, then present it on a
	// map.
	if (place.geometry.viewport) {
	    frommap.fitBounds(place.geometry.viewport);
	} else {
	    frommap.setCenter(place.geometry.location);
	    frommap.setZoom(17); // Why 17? Because it looks
	    // good.
	}
	var image = new google.maps.MarkerImage(place.icon, new google.maps.Size(71, 71), new google.maps.Point(0, 0), new google.maps.Point(17, 34), new google.maps.Size(35, 35));
	marker.setIcon(image);
	marker.setPosition(place.geometry.location);
	$('#fromLat').val(place.geometry.location.lat());
	$('#fromLng').val(place.geometry.location.lng());

	var address = '';
	if (place.address_components) {
	    address = [ (place.address_components[0] && place.address_components[0].short_name || ''), (place.address_components[1] && place.address_components[1].short_name || ''),
		    (place.address_components[2] && place.address_components[2].short_name || '') ].join(' ');
	}
	fromPlace = '<div><strong> From ' + place.name + '</strong><br>' + address;
	infowindow.setContent('<div><strong> From ' + place.name + '</strong><br>' + address);
	infowindow.open(frommap, marker);
	$.mobile.loading('hide');

    });

    google.maps.event.addListener(toautocomplete, 'place_changed', function() {
	infowindow.close();
	marker.setVisible(false);
	// toinput.className = '';
	var place = toautocomplete.getPlace();
	if (!place.geometry) {
	    // Inform the user that the place was not found and
	    // return.
	    // toinput.className = 'notfound';
	    alert("Place not found, make sure street name is spelled correctly");
	    return;
	}
	// If the place has a geometry, then present it on a
	// map.
	if (place.geometry.viewport) {
	    frommap.fitBounds(place.geometry.viewport);
	} else {
	    frommap.setCenter(place.geometry.location);
	    frommap.setZoom(17); // Why 17? Because it looks
	    // good.
	}
	var image = new google.maps.MarkerImage(place.icon, new google.maps.Size(71, 71), new google.maps.Point(0, 0), new google.maps.Point(17, 34), new google.maps.Size(35, 35));
	marker.setIcon(image);
	marker.setPosition(place.geometry.location);
	$('#toLat').val(place.geometry.location.lat());
	$('#toLng').val(place.geometry.location.lng());

	var address = '';
	if (place.address_components) {
	    address = [ (place.address_components[0] && place.address_components[0].short_name || ''), (place.address_components[1] && place.address_components[1].short_name || ''),
		    (place.address_components[2] && place.address_components[2].short_name || '') ].join(' ');
	}
	toPlace = '<div><strong> To ' + place.name + '</strong><br>' + address;
	infowindow.setContent('<div><strong>To ' + place.name + '</strong><br>' + address);
	infowindow.open(frommap, marker);

    });

}
var onGetCurrentPositionError = function(error) {
    console.log("Couldn't get geo coords from device" + error);
    alert(JSON.stringify(error));
    console.log(JSON.stringify(error));
}