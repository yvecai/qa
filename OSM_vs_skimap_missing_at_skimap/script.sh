
dbuser="admin"
#~ sudo apt-get install postgresql-9.5 postgresql-9.5-postgis-2.2 postgresql-common postgresql-contrib postgresql-contrib-9.5

# Prepare on new DB for analysis
#~ echo "CREATE TABLESPACE data_ssd LOCATION '/nvme-data/PG_DATA/';" | psql -d postgres
    createdb -E UTF8 -U ${dbuser} gis_tmp -D data_ssd
    echo "CREATE EXTENSION postgis;" | psql -d gis_tmp -U ${dbuser}
    echo "CREATE EXTENSION hstore;" | psql -d gis_tmp -U ${dbuser}

# Upload fresh data form OSM
    /usr/bin/osm2pgsql -U ${dbuser} -s -c -m -d gis_tmp -S osm2pgsql.style planet_pistes.osm

# Get fresh data from skimpa.org
   wget https://skimap.org/SkiAreas/index.xml -o ../data/index.html

# Convert skimap's XML to GeoJSON
    node skimapsXML2geojson.js

# Load skimap's data 
    ogr2ogr -f "PostgreSQL" PG:"dbname=gis_tmp user=admin" "data/skimaps.geojson" -nln skimaps -overwrite

# Perform the analysis
    cat ski_downhill_analysis.sql | psql -d gis_tmp -U ${dbuser}
    cat ski_nordic_analysis.sql | psql -d gis_tmp -U ${dbuser}

# Replace old analysis DB for rendering purpose
    #~ systemctl stop renderd.service 
    echo "SELECT pg_terminate_backend (pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = 'gis';" | psql -d gis_tmp -U ${dbuser}

    echo $(date)' replace mapnik DB'
    dropdb -U ${dbuser} gis 
    createdb -U ${dbuser} -T gis_tmp gis
    dropdb -U ${dbuser} gis_tmp
    #~ systemctl start renderd.service

#~ Extract a small file with stats:
    ./stat2json.sh > data/stats_missing_at_skimap.json

exit 0

