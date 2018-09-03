----------------------------------------------------------------------------
\echo 'Convert skimap.org table to 900913, union it for distance queries';

    SELECT AddGeometryColumn('skimaps', 'geom', 900913, 'GEOMETRY', 2);
    UPDATE skimaps
        SET geom=( st_transform(wkb_geometry,900913));
    -- ~ INSERT 0 3753

    CREATE INDEX skimaps_idx
        ON skimaps USING gist(geom);
        
    DROP TABLE IF EXISTS union_skimaps;
    CREATE TABLE union_skimaps ();
    SELECT AddGeometryColumn('union_skimaps', 'geom', 900913, 'GEOMETRY', 2);
    INSERT INTO union_skimaps (geom)
        SELECT ST_Union(skimaps.geom) from skimaps;
----------------------------------------------------------------------------
\echo "Buffer pistes";

    -- 1000m is too much, seems to connect ressort over ridges or valley
    DROP TABLE IF EXISTS pistes_buffer;
    CREATE TABLE pistes_buffer ();
    SELECT AddGeometryColumn('pistes_buffer', 'geom', 900913, 'GEOMETRY', 2);

    INSERT INTO pistes_buffer (geom)
        SELECT ST_Buffer(way, 500) 
        FROM planet_osm_line 
        WHERE "piste:type" in ('nordic', 'downhill');

    CREATE INDEX idx_buffers_geom
        ON pistes_buffer USING gist(geom);
    
----------------------------------------------------------------------------
\echo "Union buffered pistes";

    DROP TABLE IF EXISTS ubuffer;
    CREATE TABLE ubuffer ();
    SELECT AddGeometryColumn('ubuffer', 'geom', 900913, 'GEOMETRY', 2);

    INSERT INTO ubuffer (geom)
        SELECT (ST_Dump(geom)).geom 
        FROM (
            SELECT (ST_Union(geom))  AS geom
            FROM pistes_buffer
        ) sq;
    --~ INSERT 0 4387 if buffered 1000m 
    --~ INSERT 0 4905 if buffered 500m 

    CREATE INDEX idx_ubuffer_geom
        ON ubuffer USING gist(geom);

----------------------------------------------------------------------------
\echo "Cut big pistes buffers";

----------------------------------------------------------------------------
\echo "... isolate pistes buffer above 20km";
    DROP TABLE IF EXISTS sbuffer;
    CREATE TABLE sbuffer ();
    SELECT AddGeometryColumn('sbuffer', 'geom', 900913, 'GEOMETRY', 2);

    INSERT INTO sbuffer (geom)
        SELECT geom
        FROM ubuffer
        WHERE
        ( st_xmax(Box2D(geom)) - st_xmin(Box2D(geom)) ) > 20000
        or ( st_ymax(Box2D(geom)) - st_ymin(Box2D(geom)) ) > 20000;
    -- OK
    CREATE INDEX idx_sbuffer_geom
        ON sbuffer USING gist(geom);

----------------------------------------------------------------------------
\echo "... create fishnet function";
        CREATE OR REPLACE FUNCTION ST_CreateFishnet(
                nrow integer, ncol integer,
                xsize float8, ysize float8,
                x0 float8 DEFAULT 0, y0 float8 DEFAULT 0,
                OUT geom geometry)
            RETURNS SETOF geometry AS
        $$
        SELECT ST_Translate(cell, j * $3 + $5, i * $4 + $6) AS geom
        FROM generate_series(0, $1 - 1) AS i,
             generate_series(0, $2 - 1) AS j,
        (
        SELECT ('POLYGON((0 0, 0 '||$4||', '||$3||' '||$4||', '||$3||' 0,0 0))')::geometry AS cell
        ) AS foo;
        $$ LANGUAGE sql IMMUTABLE STRICT;
    
----------------------------------------------------------------------------
\echo "... create fishnet table";
-- visually, splitting with a 30km grid is OK (single polygon for Les 3 Vallées)
-- let say bbox/int(bbox/30)

    DROP TABLE IF EXISTS splitbuffer;
    CREATE TABLE splitbuffer ();
    SELECT AddGeometryColumn('splitbuffer', 'geom', 900913, 'GEOMETRY', 2);
    INSERT INTO splitbuffer (geom)
            SELECT 
              st_setsrid(
              ST_CreateFishnet(
                ceil((st_ymax(Box2D(sbuffer.geom))-st_ymin(Box2D(sbuffer.geom)))/30000)::integer,
                ceil((st_xmax(Box2D(sbuffer.geom))-st_xmin(Box2D(sbuffer.geom)))/30000)::integer,
                (st_xmax(Box2D(sbuffer.geom))-st_xmin(Box2D(sbuffer.geom)))/ceil((st_xmax(Box2D(sbuffer.geom))-st_xmin(Box2D(sbuffer.geom)))/30000)::float8,
                (st_ymax(Box2D(sbuffer.geom))-st_ymin(Box2D(sbuffer.geom)))/ceil((st_ymax(Box2D(sbuffer.geom))-st_ymin(Box2D(sbuffer.geom)))/30000)::float8,
                st_xmin(Box2D(sbuffer.geom))::float8,
                st_ymin(Box2D(sbuffer.geom))::float8),
                900913)
            FROM sbuffer;
    --~ INSERT 0 1220

----------------------------------------------------------------------------
\echo "... create osm_ski_areas table";
    DROP TABLE IF EXISTS osm_ski_areas;
    CREATE TABLE osm_ski_areas ();
    SELECT AddGeometryColumn('osm_ski_areas', 'geom', 900913, 'GEOMETRY', 2);

----------------------------------------------------------------------------
\echo "... split big pistes buffers and add them to osm_ski_areas";
    INSERT INTO osm_ski_areas (geom)
        SELECT ST_Intersection(splitbuffer.geom, sbuffer.geom)
        FROM splitbuffer, sbuffer
        WHERE ST_Intersects(splitbuffer.geom, sbuffer.geom);
    -- ~ INSERT 0 1091


----------------------------------------------------------------------------
\echo "... add smaller pistes buffers to osm_ski_areas";
    INSERT INTO osm_ski_areas (geom)
        SELECT geom
        FROM ubuffer
        WHERE
        ( st_xmax(Box2D(geom)) - st_xmin(Box2D(geom)) ) < 20000
        or ( st_ymax(Box2D(geom)) - st_ymin(Box2D(geom)) ) < 20000;
    -- ~ INSERT 0 4789
    CREATE INDEX osm_ski_areas_idx
        ON osm_ski_areas USING gist(geom);

    -- ~ gis=# select count(*) from osm_ski_areas;
     -- ~ count 
    -- ~ -------
      -- ~ 5880
    -- ~ (1 row)

----------------------------------------------------------------------------
\echo "Compute the smallest distance between pistes and skimap ski areas";
-- compute smallest distance
    ALTER TABLE osm_ski_areas ADD COLUMN distance float;
    ALTER TABLE osm_ski_areas ADD COLUMN id SERIAL PRIMARY KEY;

    UPDATE osm_ski_areas
    SET distance = (
        select dist
        from (
            select 
                osm.id as idx, 
                st_distance(st_closestpoint(sk.geom, osm.geom), osm.geom) as dist
            from union_skimaps as sk, osm_ski_areas as osm
            ) sq
        where idx = id
        );
    
----------------------------------------------------------------------------
\echo "Output stats:";
\echo "Total in OSM";
SELECT count(*) FROM osm_ski_areas;
\echo "Closer than 2km fromn a skimap ski area:";
SELECT count(*) as closer_than_2km FROM osm_ski_areas Where distance <2000;
\echo "Closer than 5km fromn a skimap ski area:";
SELECT count(*) as closer_than_2km FROM osm_ski_areas Where distance < 5000;
\echo "Farther than 5km fromn a skimap ski area:";
SELECT count(*) as farther_than_5km FROM osm_ski_areas Where distance > 5000;

