import json
import os
from config import *

output_path = os.path.join(OUTPUT_DIR,"CTA.json")
with open(output_path, 'r') as data:
    cta_json = json.load(data)

for route in cta_json['routes']:
    cta_json['routes'][route]['stop_names'] = []
    cta_json['routes'][route]['unique_stop_ids'] = []

    for stop_id in cta_json['routes'][route]['stop_ids']:
        s = cta_json['stops'][stop_id]
        if s['name'] not in cta_json['routes'][route]['stop_names']:
            cta_json['routes'][route]['stop_names'].append(s['name'])
            cta_json['routes'][route]['unique_stop_ids'].append(stop_id)

    cta_json['routes'][route]['stop_ids'] = cta_json['routes'][route]['unique_stop_ids']
    cta_json['routes'][route].pop('unique_stop_ids')
    cta_json['routes'][route].pop('stop_names')

unique_stops = []
for route in cta_json['routes']:
    unique_stops.extend(cta_json['routes'][route]['stop_ids'])

stop_dicts = {}
for stop in unique_stops:
    stop_dicts[stop] = cta_json['stops'][stop]

cta_json['stops'] = stop_dicts

new_output_path = os.path.join(OUTPUT_DIR, "CTA_clean.json")
with open(new_output_path, 'wb') as nj:
    json.dump(cta_json, nj)
