#!/usr/bin/python
#
#
# Generate comparison data Openstreetmaps against skimaps

import json
import psycopg2
import pdb
from lxml import etree
import os.path
import urllib
# array to store all skiAreas
skiAreaArray=[]

#~ object skiArea:
"""
    name = ''
    id=-1
    region3_id=-1
    region2_id=-1
    region1_id=-1
    region3_name=''
    region2_name=''
    region1_name=''
    lon=-1
    lat=-1
    closestLift=-1
    closestDownhill=-1
    closestNordic=-1
    close=False
    mid=False
    far=False
"""

# dictionnary to store all regions3 parent regions
regions3Dict={}
"""
{335: { 
        name:Newfoundland and Labrador,
        region2_id:
        region2_name:,
        region1_id:,
        region2_id:,
       },
 334:  {...},
 ...
"""


# the generated structures looks like this:
dataReport={}
"""
{ '1' : 
        {
        type: 'level1'
        name: americas,
        id:'1',
        '36' : 
            {
                type: 'level2'
                name: 'Canada',
                id, '36',
                '335': 
                    {
                        type: 'level3'
                        name: Newfoundland and Labrador,
                        id:'335',
                        skiAreas :[
                            {
                                name:Marble Mountain,
                                id:'5',
                                region_id:335,
                                lon:,
                                lat:,
                                closestLift:120,
                                closestDownhill:35,
                                closestNordic:15,
                                close: true,
                                mid: false,
                                far: false
                            },
                            {...}
                            ]
                    },
                    {...}
                    
            },
            {...}
            
    },
    {...}
    
}
"""

def makeJSON():
    global skiAreaArray
    global dataReport
    
    for area in skiAreaArray:
        if area['region1_id'] not in dataReport.keys():
            r= {}
            r['type']='level1'
            r['id']=area['region1_id']
            r['name']=area['region1_name']
            dataReport[area['region1_id']]=r
        
        if area['region2_id'] not in dataReport[area['region1_id']].keys():
            r= {}
            r['type']='level2'
            r['id']=area['region2_id']
            r['name']=area['region2_name']
            dataReport[area['region1_id']][area['region2_id']]=r
            
        if area['region3_id'] not in dataReport[area['region1_id']][area['region2_id']].keys():
            r= {}
            r['type']='level3'
            r['id']=area['region3_id']
            r['name']=area['region3_name']
            dataReport[area['region1_id']][area['region2_id']][area['region3_id']]=r
            dataReport[area['region1_id']][area['region2_id']][area['region3_id']]['skiAreas']=[]
        dataReport[area['region1_id']][area['region2_id']][area['region3_id']]['skiAreas'].append(area)
        #~ print dataReport[area.region1_id][area.region2_id][area.region3_id]['skiAreas']
            
    with open('data/dataReport.json', 'w') as outfile:
        json.dump(dataReport, outfile,sort_keys=True,
                  indent=2, separators=(',', ': '))

def loadSkimapData(filename): 
    # Loads skimaps.json skiAreas in an objects array
    
    global skiAreaArray
    global regions3Dict
    
    json_data=open(filename).read()
    data = json.loads(json_data)
    #~ print json.dumps(data, sort_keys=False,
                  #~ indent=2, separators=(',', ': '))
    for feature in data['features']:
        area =  {}
        area['name'] = feature['properties']['name']
        area['id']=feature['properties']['id']
        area['region1_id']='-1'
        area['region2_id']='-1'
        try: 
            area['region3_id']=feature['properties']['region_id']
        except:
            area['region3_id']='-1'
        try: 
            area['region3_name']=feature['properties']['region']
        except:
            area['region3_name']=''
        
        area['region1_name']=''
        area['region2_name']=''
        try:
            area['lon']=feature['geometry']['coordinates'][0]
            area['lat']=feature['geometry']['coordinates'][1]
        except:
            area['lon']=-1
            area['lat']=-1
            
        area['closestLift']=-1
        area['closestDownhill']=-1
        area['closestNordic']=-1
        area['operating_status'] = 'unknown'
        
        if (area['region3_id'] not in regions3Dict):
            regions3Dict[area['region3_id']]={}
        skiAreaArray.append(area)
        
    
    return True

def getSkimapsParentRegion(fname): # OK
    #~ https://skimap.org/Regions/view/335.xml
    """
    <region id="335" abbreviation="NL " level="3" type="Principal Subdivision">
        <name>Newfoundland and Labrador</name>
        <georeferencing lat="53.2257684357902" lng="-55.01953125" zoom="5"/>
        <maps count="27"/>
        <skiAreas>
            <skiArea id="3033">Airport Nordic Ski Club Cross Country Ski Trails</skiArea>
            <skiArea id="3034">Aurora Nordic Ski Club Cross Country Ski Trails</skiArea>
            <skiArea id="3040">Birch Brook Cross Country Ski Trails</skiArea>
            <skiArea id="3036">Blow Me Down Cross Country Ski Trails</skiArea>
            <skiArea id="3035">Butterpot Cross Country Ski Trails</skiArea>
            <skiArea id="1071">Copper Creek Mountain</skiArea>
            <skiArea id="2649">Gander Winter Park</skiArea>
            <skiArea id="5">Marble Mountain</skiArea>
            <skiArea id="2">Northern Lights Ski Club</skiArea>
            <skiArea id="3041">Pasadena Ski and Nature Park</skiArea>
            <skiArea id="1062">Pine Tree</skiArea>
            <skiArea id="1">Smokey Mountain Ski Club</skiArea>
            <skiArea id="4">Snow Goose Mountain (Mont Shana)</skiArea>
            <skiArea id="3043">Whaleback Nordic Ski Club</skiArea>
            <skiArea id="3">White Hills</skiArea>
        </skiAreas>
        <parents>
            <region id="1" level="1">Americas</region>
            <region id="36" level="2">Canada</region>
        </parents>
    </region>
    """
    global regions3Dict
    
    if os.path.isfile(fname) :
        # no need to ask again for testing
        json_data=open(fname).read()
        regions3Dict = json.loads(json_data) 
        return True
        
    s=0
    
    for i in regions3Dict:
        if i!= '-1':
            region={}
            url = 'https://skimap.org/Regions/view/'+str(i)+'.xml' 
            
            xmlFile = urllib.urlopen(url)
            root = etree.fromstring(xmlFile.read())
            parents = root.find('parents')
            if parents is not None:
                regions=parents.findall('region')
                for reg in regions:
                    if (reg.get('level') == '1'):
                        region['region1_id'] = reg.get('id')
                        region['region1_name']=reg.text
                        
                    if (reg.get('level') == '2'):
                        region['region2_id'] = reg.get('id')
                        region['region2_name']=reg.text
            
            nameElement = root.find('name')
            
            region['name']=nameElement.text
            
            regions3Dict[i]=region
            
            s+=1
            #~ if s> 10: break
            
    # no need to ask again for testing:
    with open('../data/skimaps_regions.json', 'w') as outfile:
        json.dump(regions3Dict, outfile,sort_keys=False,
                  indent=2, separators=(',', ': '))
    return True

def filloperating_status(fname):
    # For each ski area, fill operating status
    
    global skiAreaArray
    
    json_data=open(fname).read()
    data = json.loads(json_data)
    
    for area in skiAreaArray:
        for feature in data['features']:
            if feature['properties']['id'] == area['id']:
                try : 
                    area['operating_status']=feature['properties']['operating_status']
                except :
                    pass
    return True
    
def fillRegions():
    # Get parent region and fill the skiAreaArray with this data
    global skiAreaArray
    global regions3Dict
    
    for area in skiAreaArray:
        
        if (area['region3_id'] == '-1' or (area['region3_id'] not in regions3Dict)):
            
            area['region2_id']='-1'
            area['region1_id']='-1'
            area['region2_name']='-1'
            area['region1_name']='-1'
            continue
            
            
        try: region=regions3Dict[area['region3_id']]
        except : pdb.set_trace()
        try:
            area['region2_id']=region['region2_id']
        except :
            area['region2_id']='-1'
        try:
            area['region1_id']=region['region1_id']
        except :
            area['region1_id']='-1'
        try:
            area['region2_name']=region['region2_name']
        except :
            area['region2_name']='-1'
        try:
            area['region1_name']=region['region1_name']
        except :
            area['region1_name']='-1'
        
    return True

def fillDistances():
    global skiAreaArray
    global regions3Dict
    
    con = psycopg2.connect("dbname=gis user=yves")
    cur = con.cursor()
    
    for area in skiAreaArray:
        lonlat={}
        lonlat['lon']=area['lon']
        lonlat['lat']=area['lat']
        downhillDistance=-1
        noridcDistance=-1
        liftDistance=-1
        
        print lonlat
        if (lonlat['lon'] != None and lonlat['lat'] != None):
            cur.execute("""
            SELECT ST_Distance(way, ST_Transform(ST_SetSRID(ST_MakePoint(%s,%s),4326),900913)) FROM planet_osm_line 
            WHERE "piste:type" = 'downhill'
            ORDER BY 
             ST_Distance(way, ST_Transform(ST_SetSRID(ST_MakePoint(%s,%s),4326),900913)) ASC
            LIMIT 1;
            """
            % (lonlat['lon'],lonlat['lat'],lonlat['lon'],lonlat['lat']))
            downhillDistance = cur.fetchall()[0][0]
            
            cur.execute("""
            SELECT ST_Distance(way, ST_Transform(ST_SetSRID(ST_MakePoint(%s,%s),4326),900913)) FROM planet_osm_line 
            WHERE "piste:type" = 'nordic'
            ORDER BY 
             ST_Distance(way, ST_Transform(ST_SetSRID(ST_MakePoint(%s,%s),4326),900913)) ASC
            LIMIT 1;
            """
            % (lonlat['lon'],lonlat['lat'],lonlat['lon'],lonlat['lat']))
            nordicDistance = cur.fetchall()[0][0]
            
            cur.execute("""
            SELECT ST_Distance(way, ST_Transform(ST_SetSRID(ST_MakePoint(%s,%s),4326),900913)) FROM planet_osm_line 
            WHERE aerialway is not null
            ORDER BY 
             ST_Distance(way, ST_Transform(ST_SetSRID(ST_MakePoint(%s,%s),4326),900913)) ASC
            LIMIT 1;
            """
            % (lonlat['lon'],lonlat['lat'],lonlat['lon'],lonlat['lat']))
            liftDistance = cur.fetchall()[0][0]
            
            area['closestDownhill']=downhillDistance
            area['closestNordic']=nordicDistance
            area['closestLift']=liftDistance
            print downhillDistance
    
    con.commit()
    cur.close()
    con.close()
        
        
    return True
    
def main():
    loadSkimapData('../data/skimaps.geojson') # Skimap's API index.xml as been transformed in geojson
    filloperating_status('../data/index.geojson.json') # For each ski area, fill operating  status
    getSkimapsParentRegion('../data/skimaps_regions.json') # For sub region, get parents regions either from known sub region or by a Skimap API call
    fillRegions() # For each ski area, add parent regions
    fillDistances() # For each ski area, compute distance from osm2pgsql DB
    makeJSON()
    
    #~ NO, recode everything from:
        #~ https://skimap.org/SkiAreas/index.json

main()
