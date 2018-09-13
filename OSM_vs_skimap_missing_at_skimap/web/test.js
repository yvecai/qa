var map;
var mapMoving=false;
var zoom		   = 1; 
var lon			   = 0; 
var lat			   = 0; 
var stats = {};
// look for permalink
if (location.search != "") {
	var x = location.search.substr(1).split("&")
	for (var i=0; i<x.length; i++)
	{
		if (x[i].split("=")[0] == 'zoom') {zoom=x[i].split("=")[1];}
		if (x[i].split("=")[0] == 'lon') {lon=x[i].split("=")[1];}
		if (x[i].split("=")[0] == 'lat') {lat=x[i].split("=")[1];}
	}
}
// define projections
var fromProjection = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
var toProjection   = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection
var position	   = new OpenLayers.LonLat(lon,lat).transform( fromProjection, toProjection);

// gettiles for opensnowmap
function get_osm_url(bounds) {
	var res = this.map.getResolution();
	var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
	var y = Math.round((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));
	var z = this.map.getZoom();
	var limit = Math.pow(2, z);

	if (y < 0 || y >= limit) {
		return OpenLayers.Util.getImagesLocation() + "404.png";
	} else {
		x = ((x % limit) + limit) % limit;
		return this.url + z + "/" + x + "/" + y + ".png";
	}
}
function get_stats() {
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.open("GET", '../data/stats_missing_at_skimap.json');
    XMLHttp.overrideMimeType("text/plain");
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var lengthes = JSON.parse(XMLHttp.responseText);
            for (k = 0; k < Object.keys(lengthes).length; k++) {
                stats[Object.keys(lengthes)[k]] = lengthes[Object.keys(lengthes)[k]];
            }
            fillData('stats');
        }
    };
    XMLHttp.send();
    return true;

}
function fillData(divID) {
    var div = document.getElementById(divID);
    var elements = div.getElementsByClassName('data');
    for (i = 0; i < elements.length; i++) {
        elements[i].innerHTML = stats[elements[i].getAttribute('dataText')];
    }
    var progress1 = document.getElementById("downhill_progress");
    progress1.max=stats['downhill_area_count'];
    progress1.value=stats['downhill_area_meter'];
    var progress2 = document.getElementById("nordic_progress");
    progress2.max=stats['nordic_area_count'];
    progress2.value=stats['nordic_area_meter'];
    return true;
}
function init() {
    get_stats()
	map1 = new OpenLayers.Map("map1",
		{projection: new OpenLayers.Projection("EPSG:900913")
		});
    
    var BaseOpensnowmap_URL="http://www.opensnowmap.org/base_snow_map/";
	var BaseTiles = new OpenLayers.Layer.XYZ("Opensnowmap base Tiles",
        BaseOpensnowmap_URL,
        {
			getURL: get_osm_url, 
			isBaseLayer: true,
			numZoomLevels: 19,
			visibility: true,
			opacity: 1,
			transitionEffect: null
		});
        
	var pistes_overlay_URL="http://www.opensnowmap.org/pistes/";
	var PistesTiles = new OpenLayers.Layer.XYZ("Opensnowmap Pistes Tiles",
        pistes_overlay_URL,
        {
			getURL: get_osm_url, 
			isBaseLayer: false,
			numZoomLevels: 19,
			visibility: true,
			opacity: 0.5,
			transitionEffect: null
		});
        
	var local_URL1="http://www.opensnowmap.org/missing_skimaps_downhill/";
	var LocalTiles1 = new OpenLayers.Layer.XYZ("Local Tiles",
        local_URL1,
        {
			getURL: get_osm_url, 
			isBaseLayer: false,
			numZoomLevels: 19,
			visibility: true,
			opacity: 0.9,
			transitionEffect: null
		});
    
	map1.addLayer(BaseTiles);
	map1.addLayer(PistesTiles);
	map1.addLayer(LocalTiles1);
	map1.setCenter(position, zoom );
    
    
	map2 = new OpenLayers.Map("map2",
		{projection: new OpenLayers.Projection("EPSG:900913")
		});
    var BaseOpensnowmap_URL2="http://www.opensnowmap.org/base_snow_map/";
	var BaseTiles2 = new OpenLayers.Layer.XYZ("Opensnowmap base Tiles",
        BaseOpensnowmap_URL2,
        {
			getURL: get_osm_url, 
			isBaseLayer: true,
			numZoomLevels: 19,
			visibility: true,
			opacity: 1,
			transitionEffect: null
		});
        
	var pistes_overlay_URL2="http://www.opensnowmap.org/pistes/";
	var PistesTiles2 = new OpenLayers.Layer.XYZ("Opensnowmap Pistes Tiles",
        pistes_overlay_URL2,
        {
			getURL: get_osm_url, 
			isBaseLayer: false,
			numZoomLevels: 19,
			visibility: true,
			opacity: 0.5,
			transitionEffect: null
		});
	var local_URL2="http://www.opensnowmap.org/missing_skimaps_nordic/";
	var LocalTiles2 = new OpenLayers.Layer.XYZ("Local Tiles",
        local_URL2,
        {
			getURL: get_osm_url, 
			isBaseLayer: false,
			numZoomLevels: 19,
			visibility: true,
			opacity: 0.9,
			transitionEffect: null
		});
    
	map2.addLayer(BaseTiles2);
	map2.addLayer(PistesTiles2);
	map2.addLayer(LocalTiles2);
	map2.setCenter(position, zoom );
	
    
    
    map1.events.on({moveend: function (e) {
        if (mapMoving){
        return;
        }
        mapMoving = true;
        map2.zoomToExtent(map1.getExtent());
        map2.zoomTo(map1.getZoom());
        setTimeout(function () {
            // Let's wait for a while before resetting the flag, 
            //  otherwise bothe maps will glitch
            mapMoving = false;;
        }, 1000);
        
        return true;
      }
      
    });
    map2.events.on({moveend: function (e) {
        if (mapMoving){
        return;
        }
        mapMoving = true;
        map1.zoomToExtent(map2.getExtent());
        map1.zoomTo(map2.getZoom());
        setTimeout(function () {
            // Let's wait for a while before resetting the flag, 
            //  otherwise bothe maps will glitch
            mapMoving = false;;
        }, 1000);
        
        return true;
      }
      
    });
}

function handleFiles(){
	var fileList = this.files;
	var file = fileList[0];
}
