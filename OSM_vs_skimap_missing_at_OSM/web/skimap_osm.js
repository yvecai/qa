
var dataReport;
var far = 10;
var close = 5;
var stats = {};

function init() {
    get_stats();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/dataReport.json', true);
    xhr.overrideMimeType("text/plain");
    xhr.timeout = 5000; // time in milliseconds
    
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4  && xhr.status === 200) {
      resp = this.responseText;
      console.log('received');
      dataReport = JSON.parse(resp);
      console.log('parsed');
      buildHTML();
     }
    };
    
    xhr.ontimeout = function (e) {
      alert('Timeout')
    };
    xhr.send(null);
}
function get_stats() {
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.open("GET", 'data/stats_missing_at_osm.json');
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
    return true;
}
function countskiAreas(regionObj)
{
    var cnt = 0;
    var okPisteCnt = 0;
    var okLiftCnt = 0;
    if (typeof(regionObj.skiAreas) !== 'undefined')
    {
        if (regionObj.name != "Fantasy Land")
        {
            for (a in regionObj.skiAreas) {
                
                var skiArea = regionObj.skiAreas[a];
                var closestPiste = Math.min(skiArea.closestDownhill, skiArea.closestNordic);
                var closestLift = skiArea.closestLift;
                
                if (skiArea.operating_status == 'operating' || skiArea.operating_status == 'unknown')
                    cnt += 1;
                    if (closestPiste / 1000 < close) 
                        okPisteCnt +=1;
                    if (closestLift / 1000 < close)
                        okLiftCnt +=1;
            }
        }
    }
    for (elt in regionObj) 
    {
        if (typeof(regionObj.type) !== 'undefined') 
        {
            newCnt = countskiAreas(regionObj[elt]);
            cnt += newCnt[0];
            okPisteCnt += newCnt[1];
            okLiftCnt += newCnt[2];
        }
        
    }
    
    return [cnt, okPisteCnt, okLiftCnt]
}

function cntHTML(object) {
        var newCnt = countskiAreas(object);
        
        var cnt = newCnt[0];
        var okPisteCnt = newCnt[1];
        var okLiftCnt = newCnt[2];
        
        var counter = document.createElement("div");
        counter.classname = "counter";
        
        var values = document.createElement("span");
        values.classname = "counterValues";
        values.innerHTML = 'Out of ' + cnt.toString() + ' Skimaps.org operating ski areas, ' + okPisteCnt.toString() +' are close to OSM pistes, ' + okLiftCnt.toString() +' are close to OSM lifts';
        
        
        var progress = document.createElement("progress");
        progress.classname = "pistesProgress";
        progress.value = okPisteCnt;
        progress.max = cnt ;
        
        var progressLifts = document.createElement("progress");
        progressLifts.classname = "liftProgress";
        progressLifts.value = okLiftCnt;
        progressLifts.max = cnt ;
        
        var ppc = document.createElement("span");
        ppc.classname = "percent";
        ppc.innerHTML = (okPisteCnt / cnt *100).toFixed().toString() + '% are close to OSM pistes';
        
        var lpc = document.createElement("span");
        lpc.classname = "percent";
        lpc.innerHTML = (okLiftCnt / cnt *100).toFixed().toString() + '% are close to OSM lifts';
        
        counter.append(values);
        counter.append(document.createElement("br"));
        counter.append(progress);
        counter.append(ppc);
        counter.append(progressLifts);
        counter.append(lpc);
        return counter
}
function buildHTML() {
    
    var summary = document.createElement("div");
    var H1 = document.createElement("H1");
    H1.innerHTML = 'Worldwide';
    summary.append(H1);
    
    summary.append( cntHTML(dataReport) );
    summary.className = "summary";
    var rightDiv = document.getElementById('right');
    rightDiv.appendChild(summary);
    
    rightDiv.appendChild(document.createElement("hr"));
    
    for (var level1Id in dataReport)
    {
        if (dataReport[level1Id].name == null)
            continue
        var level1RegionElt = document.createElement("details");
        level1RegionElt.className = "level1"
        var level1RegionEltSum = document.createElement("summary");
        var H1 = document.createElement("H1");
        H1.innerHTML = dataReport[level1Id].name;
        if (dataReport[level1Id].name == '-1')
            H1.innerHTML = 'Not sorted';
            
        level1RegionEltSum.append(H1);
        
        level1RegionEltSum.append( cntHTML(dataReport[level1Id]) );
        
        level1RegionElt.appendChild(level1RegionEltSum);
        rightDiv.appendChild(level1RegionElt);
        
        for (var level2Id in dataReport[level1Id])
        {
            if (level2Id != '-1' ){
                if (dataReport[level1Id][level2Id].type == 'level2')
                {

                    var level2RegionElt = document.createElement("details");
                    level2RegionElt.className = "level2"
                    var level2RegionEltSum = document.createElement("summary");
                    
                    var H2 = document.createElement("H2");
                    H2.innerHTML = dataReport[level1Id][level2Id].name;
                    level2RegionEltSum.append(H2);
                    
                    var newCnt = countskiAreas(dataReport[level1Id][level2Id]);
        
                    level2RegionEltSum.append( cntHTML(dataReport[level1Id][level2Id]) );
                    
                    level2RegionElt.appendChild(level2RegionEltSum);
                    
                    level1RegionElt.appendChild(level2RegionElt);
                    
                    // scan for sublevel3 here
                    for (var level3Id in dataReport[level1Id][level2Id])
                    {
                        if (dataReport[level1Id][level2Id][level3Id].type == 'level3')
                        {
                            if (dataReport[level1Id][level2Id][level3Id].name != "Fantasy Land") 
                            {
                                var level3RegionElt = document.createElement("details");
                                level3RegionElt.className = "level3"
                                var level3RegionEltSum = document.createElement("summary");
                                
                                var H3 = document.createElement("H3");
                                H3.innerHTML = dataReport[level1Id][level2Id][level3Id].name;
                                level3RegionEltSum.append(H3);
                            
                                level3RegionEltSum.append( cntHTML(dataReport[level1Id][level2Id][level3Id]) );
                                level3RegionElt.appendChild(level3RegionEltSum);
                                
                                level2RegionElt.appendChild(level3RegionElt);
                                
                                var skiAreas = dataReport[level1Id][level2Id][level3Id].skiAreas;
                                populateSkiAreas(level3RegionElt, skiAreas);
                            }
                        }
                    }
                }
            }
            else 
            {
                for (var level3Id in dataReport[level1Id]['-1'])
                {
                    if (dataReport[level1Id]['-1'][level3Id].type == 'level3')
                    {
                        if (dataReport[level1Id]['-1'][level3Id].name != "Fantasy Land") 
                        {
                            var level3RegionElt = document.createElement("details");
                            level3RegionElt.className = "level3"
                            var level3RegionEltSum = document.createElement("summary");
                        
                            var H3 = document.createElement("H3");
                            H3.innerHTML = dataReport[level1Id]['-1'][level3Id].name;
                            level3RegionEltSum.append(H3);
                            
                                level3RegionEltSum.append( cntHTML(dataReport[level1Id]['-1'][level3Id]));
                            level3RegionElt.appendChild(level3RegionEltSum);
                            
                            level1RegionElt.appendChild(level3RegionElt);
                            var skiAreas = dataReport[level1Id][level2Id][level3Id].skiAreas;
                            populateSkiAreas(level3RegionElt, skiAreas);
                        }
                    }
                }
            }
        }
        
    }
}

function populateSkiAreas(element, skiAreas) {
    for (a in skiAreas) {
        var skiArea = skiAreas[a];
        var skiAreaElt = document.createElement("span");
        skiAreaElt.className = "skiArea";
        skiAreaElt.innerHTML = skiArea.name+'&nbsp;&nbsp;';
        element.appendChild(skiAreaElt);
        
        var img1 = document.createElement('img');
        img1.src='alpine-nb-20.png';
        var text1 = document.createElement("span");
        text1.innerHTML = (skiArea.closestDownhill / 1000).toFixed().toString()+'km&nbsp;';
        text1.className = "distance";
        var img2 = document.createElement('img');
        img2.src='nordic-nb-20.png';
        var text2 = document.createElement("span");
        text2.innerHTML = (skiArea.closestNordic / 1000).toFixed().toString()+'km';
        text2.className = "distance";
        var img3 = document.createElement('img');
        img3.src='drag_lift-nb-20.png';
        var text3 = document.createElement("span");
        text3.innerHTML = (skiArea.closestLift / 1000).toFixed().toString()+'km&nbsp;';
        text3.className = "distance";
        
        if (skiArea.closestDownhill / 1000 <= close)
            text1.style.backgroundColor="#6FFF3A";
        else
            text1.style.backgroundColor="#FF585C";
        if (skiArea.closestNordic / 1000 <= close)
            text2.style.backgroundColor="#6FFF3A";
        else
            text2.style.backgroundColor="#FF585C";
        if (skiArea.closestLift / 1000 <= close)
            text3.style.backgroundColor="#6FFF3A";
        else
            text3.style.backgroundColor="#FF585C";
        
        var link1=document.createElement('a');
        link1.className = "ext_link";
        link1.href='https://www.opensnowmap.org/?zoom=13&lat='+skiArea.lat+'&lon='+skiArea.lon;
        link1.innerHTML = '&nbspOpensnowmap.org &nbsp';
        link1.target="_blank";
        
        var link2=document.createElement('a');
        link2.className = "ext_link";
        link2.href='https://skimap.org/SkiAreas/view/'+skiArea.id;
        link2.innerHTML = '&nbspSkimap.org &nbsp';
        link2.target="_blank";
        
        var link3=document.createElement('a');
        link3.className = "ext_link";
        link3.href='https://www.openstreetmap.org/#map=13/'+skiArea.lat+'/'+skiArea.lon;
        link3.innerHTML = '&nbspOpenStreetMap.org &nbsp';
        link3.target="_blank";
        
            
        element.appendChild(img1);
        element.appendChild(text1);
        element.appendChild(img2);
        element.appendChild(text2);
        element.appendChild(img3);
        element.appendChild(text3);
        element.appendChild(link1);
        element.appendChild(link2);
        element.appendChild(link3);
        
        var br = document.createElement("br");
        element.appendChild(br);
    }
    return true;
}

function notes() {

    
    var xhr = [];
    var n=0
    for (var region_id in skimapsData)
    {
        var region = skimapsData[region_id];
        for (var j = 0; j < region.length; j++)
        {
            (function(n){
                var skiArea = region[j];
                xhr[n] = new XMLHttpRequest();
                var q = "http://www.opensnowmap.org/request?geo=true&list=true&closest=" + skiArea.lon + ',' + skiArea.lat;
                xhr[n].open('GET', q, true);            
                //~ xhr[n].timeout = 5000; 
                
                xhr[n].onreadystatechange = function () {
                    if (xhr[n].readyState === 4  && xhr[n].status === 200) {
                        var resp = xhr[n].responseText;
                        //~ console.log(resp);
                        var jsonPiste = JSON.parse(resp);
                        //~ console.log(jsonPiste.snap.lon);
                        
                        var lonlat = {};
                        lonlat.lon=parseFloat(skiArea.lon)
                        lonlat.lat=parseFloat(skiArea.lat)
                        
                        var dist = distanceBetweenPoints(lonlat, jsonPiste.snap)/1000;
                        color='PAleGreen';
                        if (dist <= 10) { inOSM+=1;}
                        if (dist > 2) { color = 'Salmon';}
                        if (dist > 10) { color = 'Tomato';notinOSM+=1;}
                        var text='<p style="background-color:'+ color +';">'+skiArea.name +': '+dist+' km - '+'in OSM : '+inOSM+' - '+'not in OSM : '+notinOSM+' - '+'ratio : '+notinOSM/inOSM*100+'%'+'</p>';
                        console.log(text);
                        list+=text;
                        document.getElementById("list").innerHTML = list;
                        return true;
                    }
                };
                //~ xhr[n].ontimeout = function (e) { alert('Timeout')};
                xhr[n].send(null);
                
            })(n);
            n+=1;
        }
    }
    
}
