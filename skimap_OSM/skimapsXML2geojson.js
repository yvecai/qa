
var fs = require('fs');
var parser = require('xml2json');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var xmlDoc;
var skimapsData = {};
var skimaps_geoJSON = {};
init();

function init() {
    xmlDoc = fs.readFileSync('index.xml', 'utf8')
    skimapsData = parser.toJson(xmlDoc,{object: true});
    fs.writeFile("skimaps.json", JSON.stringify(skimapsData, null, 2));
    
    fs.writeFile("test", xmlDoc);
    json2geoJSON();
}

function json2geoJSON() {

    skimaps_geoJSON.type="FeatureCollection";
    skimaps_geoJSON["features"]=[];
    
    areas=skimapsData.skiAreas.skiArea;
    for (var i =0; i< areas.length; i++)
    {
        var area = areas[i];
        var feature ={};
        feature.type="Feature";
        feature.geometry={};
        feature.geometry.type="Point";
        feature.properties={"id": area.id,
                            "name": area.name};
        
        try {
            feature.geometry.coordinates=[parseFloat(area.georeferencing.lng),parseFloat(area.georeferencing.lat)];
        } catch (e) {};
        
        try {
            feature.properties.region_id=area.regions.region.id;
            feature.properties.region=area.regions.region.$t;
        } catch (e) {
            feature.properties.region_id=-1;
            feature.properties.region='empty';
            };
        
        skimaps_geoJSON.features.push(feature);
    }
    fs.writeFile("skimaps.geojson", JSON.stringify(skimaps_geoJSON, null, 2));
    
    return true;
}

