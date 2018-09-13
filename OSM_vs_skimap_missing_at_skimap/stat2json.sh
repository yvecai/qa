downhill_area_count=$(echo "SELECT count(*) FROM osm_downhill_areas;" | psql -d gis -U admin -t)

nordic_area_count=$(echo "SELECT count(*) FROM osm_nordic_areas;" | psql -d gis -U admin -t)

downhill_area_meter=$(echo "SELECT count(*) FROM osm_downhill_areas Where distance <2000;" | psql -d gis -U admin -t)

nordic_area_meter=$(echo "SELECT count(*) FROM osm_nordic_areas Where distance <2000;" | psql -d gis -U admin -t)

skimap_area_count=$(echo "SELECT count(*) FROM skimaps;" | psql -d gis -U admin -t)

date=$(date -u +'%Y-%m-%dT%TZ')

echo {
echo \"downhill_area_count\": $downhill_area_count,
echo \"nordic_area_count\": $nordic_area_count,
echo \"downhill_area_meter\": $downhill_area_meter,
echo \"nordic_area_meter\": $nordic_area_meter,
echo \"skimap_area_count\": $skimap_area_count,
echo \"date\": \"$date\"
echo }

