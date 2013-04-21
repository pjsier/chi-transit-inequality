from util import *
import json
import os
import transitfeed
import census

census_api = census.Census(CENSUS_API_KEY, year=2010)

# Make a file for each agency covered 
for agency_name, path in ALL_GTFS_PATHS.iteritems():
	print "Starting %s" % agency_name

	agency_json = {"agency_name":agency_name, "stops":{}, "routes":{}}

	schedule = transitfeed.schedule.Schedule()
	schedule.Load(path)

	routes = schedule.GetRouteList()
	stops = schedule.GetStopList()
	trips = schedule.GetTripList()

	# Build route list
	for r in routes:
		route_trips = filter(lambda t: t.route_id == r.route_id, trips)
		if len(route_trips) == 0:
			continue

		trip = route_trips[0] # Use just the first trip
		stop_ids_in_order = map(lambda st: st.stop_id, trip.GetStopTimes())

		route_json = {"name":r.route_long_name, "stop_ids":stop_ids_in_order}
		agency_json["routes"][r.route_id] = route_json

	#  Build stop list, look up related info
	for s in stops:
		
		# Get FIPS info from the FCC API, separate it out
		try:

			fips_info = get_fips(s.stop_lat, s.stop_lon)
			state_fips = fips_info['State']['FIPS']
			county_fips = fips_info['County']['FIPS'][2:5]
			block_fips = fips_info['Block']['FIPS']
			tract_fips = block_fips[5:11]

			# Look up census info
			response = census_api.acs.state_county_tract(MEDIAN_INCOME_TABLE_NAME, state_fips, county_fips, tract_fips)
			median_income = response[0][MEDIAN_INCOME_TABLE_NAME]
			median_income = int(median_income) if (median_income and median_income != 'null') else None

			stop_json = {"lat":s.stop_lat, "lon":s.stop_lon, "name":s.stop_name, "state_fips":state_fips, "county_fips":county_fips, "tract_fips":tract_fips, "median_income":median_income}
			agency_json["stops"][s.stop_id] = stop_json

			if median_income: 
				print "%s...$%d" % (s.stop_name,median_income)
		except Exception, e:
			print "Skipping stop due to exception: %s" % e

	# Output as JSON
	print "Writing..."
	output_path = os.path.join(OUTPUT_DIR,"%s.json" % agency_name)
	output_file = open(output_path, "wb")
	output_file.write(json.dumps(agency_json))
	output_file.close()
	
	#for t in trips:
	#	print "trip = %s" % t

#print "json = %s" % json_output