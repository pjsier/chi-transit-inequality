import os

SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
OUTPUT_DIR = SCRIPT_DIR+"/../output"

ALL_GTFS_PATHS = {"CTA": SCRIPT_DIR+"/../data/cta"}

# Census
CENSUS_API_KEY = ""
MEDIAN_INCOME_TABLE_NAME = 'B19013_001E'

# Skip some MUNI bus routes
MUNI_ALLOWED_ROUTE_SHORT_NAMES = ["49", "30", "38", "22", "1", "14", "5", "9", "47", "31", "8X", "19"]
