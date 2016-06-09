angular.module('app', []);

angular.module('app').constant('DATA_SOURCES',
    ["data/CTA.json"]
    );

angular.module('app').constant('ROUTE_COLORS',
    {
        "Blue Line": "#00a1de",
        "Brown Line": "#62361b",
        "Green Line": "#009b3a",
        "Orange Line": "#f9461c",
        "Purple Line": "#522398",
        "Pink Line": "#e27ea6",
        "Red Line": "#c60c30",
        "Yellow Line": "#f9e300"
    }
    );

angular.module('app').controller('AppCtrl', ['$scope', 'DATA_SOURCES', 'ROUTE_COLORS', function($scope, DATA_SOURCES, ROUTE_COLORS) {

    // Load the data for each agency
    var agencyData = {};
    var numberAgenciesLoaded = 0;
    DATA_SOURCES.forEach(function (agencySource, i) {
        d3.json(agencySource, function(error, agency) {
            var agencyName = agency['agency_name'];
            agencyData[agencyName] = agency;
            // TODO(@dan): rename agency_name in source to just 'name'??
            agencyData[agencyName].name = agencyName;
            numberAgenciesLoaded += 1;
            if (numberAgenciesLoaded === DATA_SOURCES.length) {
                $scope.agencies = agencyData;
                $scope.$apply();
            }
        });
    });

    // Load and show the map of CA
    d3.json("data/chi_zip.topojson", function (error, geodata){
        map_data = geodata;
        var width = 400,
            height = 500;

        $scope.map_projection = d3.geo.mercator()
          .scale(37502.1417964454)
          .center([-87.73212684669582,41.83407063377036])
          .translate([width/2,height/2]);
        var path = d3.geo.path()
          .projection($scope.map_projection);

        // Draw the coastline of city borders based on the zip code map
        map_svg = d3.select("#map svg");
        // Group for map features
        var features = map_svg.append("g")
          .attr("class","features")
          .attr("class","landmass");

        features.selectAll("path")
          .data(topojson.feature(geodata,geodata.objects.collection).features)
          .enter()
          .append("path")
          .attr("d",path);

        // Path that will show the route of the line we're looking at:
        map_svg.append("path").attr("class", "route-line");
    });

    // Returns whether the given route ID is selected
    $scope.isRouteSelected = function(routeId){
        return (routeId == $scope.activeRoute);
    }

    // Returns whether the given agency  is selected
    $scope.isAgencySelected = function(agencyName){
        return (agencyName == $scope.activeAgency);
    }

    $scope.getRouteColor = function(agencyName, routeId) {
      var route = agencyData[agencyName].routes[routeId];
      return ROUTE_COLORS[route.name];
    }

    // Display the Graph for a particular route
    $scope.displayRoute = function(agencyName, routeId, params) {
        console.log("Showing %s route %s", agencyName, routeId);

        console.log("event = %o", $scope);

        $scope.activeRoute = routeId;
        $scope.activeAgency = agencyName;

        // grab our data
        var route = agencyData[agencyName].routes[routeId];
        var stops = route['stop_ids'].map(function(stop_id){
            return agencyData[agencyName].stops[stop_id];
        });

        routeColor = ROUTE_COLORS[route.name];

        // dimensions
        var w = 580,
        h = 260,
        hMargin = 65,
        vMargin = 20,
        dotRadius = 5,
        moneyFormat = d3.format(",");
        yScale = d3.scale.linear().domain([200000, 0]).range([10, h - vMargin]);
        xScale = d3.scale.linear().domain([0, stops.length]).range([hMargin, w - hMargin]);
        xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(stops.length).tickFormat(function(d, i) {
            if (stops[i]) {
                return stops[i].name;
            }
        });
        yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(8).tickFormat(function(d, i) {return "$" + d / 1000 + "K";});

        // Initial setup
        if(!$scope.didSetUpGraph){
            graph_container = d3.select("#graph");
            graph_container.html(""); // Empty what was there initially
            graph_container.append("h3").attr("class", "route-name"); // Heading at the top

            // The main SVG where we draw stuff
            svg =  graph_container.append("svg:svg")
            .attr("width", w)
            .attr("height", h + 100);

            graph_container.append("div").attr("id","tooltip"); // Hovering tooltip
            svg.append("svg:path").attr("class", "data-line"); // Graph line
            svg.append("g").attr("class","data-dots"); // Graph dots

            svg.append("text")
            .attr("class", "y-axis-label")
            .text("Median Household Income")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(12,"+((h/2)-(vMargin/2))+"), rotate(-90)");

            $scope.didSetUpGraph = true;
        }

        var svg = d3.select("#graph").selectAll("svg");
        var heading = d3.select("#graph").selectAll("h3");
        var tooltip = d3.selectAll("div#tooltip");
        var data_path = d3.selectAll("path.data-line");
        var data_dots_group = d3.selectAll("g.data-dots");
        var map_svg = d3.select("#map svg");

        // Heading
        heading.html(agencyName+" <small>"+route.name+"</small>");

        // Axes
        svg.selectAll("g.axis").remove();

         // X axis elements
         svg.append("g")
         .attr("class", "axis x-axis")
         .attr("transform", "translate(0," + (h - vMargin) + ")")
         .call(xAxis)
         .selectAll("text")
         .style("text-anchor", "end")
         .attr("dy", "-.5em")
         .attr('dx', "-1em")
         .attr("transform", "rotate(-80)")
         .call(xAxis);

        // Y axis elements
        svg.append("g")
        .attr("class", "axis y-axis")
        .attr("transform", "translate(" + hMargin + ",0)")
        .call(yAxis);

        // Data line
        var line = d3.svg.line()
        .interpolate("cardinal")
        .x(function(d, i) { return xScale(i);})
        .y(function(d, i) { return yScale(d.median_income);});

        data_path.transition()
        .attr("d",line(stops))
        .attr("stroke", routeColor);

        // Dots for stops
        data_dots_group.selectAll("circle").remove();
        new_dots = data_dots_group.selectAll("circle")
        .data(stops)
        .enter()
        .append("circle")
        .attr("fill", routeColor)
        .attr("stroke", "white")
        .transition()
        .attr("cx", function(d, i) {return xScale(i);})
        .attr("cy", function(d, i) {return yScale(d.median_income);})
        .attr("r", dotRadius);

        data_dots_group.selectAll("circle").on("mouseover", function(d, i) {
            stop = stops[i];
            tooltip.html(function() {
                return "<strong>" + stops[i].name + "</strong><br/>" +
                "Median income: $" + moneyFormat(stop.median_income) + "<br/>" +
                "Census Tract: " + stop.state_fips + stop.county_fips + stop.tract_fips;
            })
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY) + "px");

            tooltip.style("visibility", "visible");
            this.setAttribute("r", 10);

            // show a map marker
            marker_coords = $scope.map_projection([stop.lon, stop.lat]);
            map_svg.select("circle.stop-marker").remove();
            circle = map_svg.append("circle")
            .attr("class", "stop-marker")
            .attr("r", 4)
            .attr("fill",routeColor)
            .attr("cx",marker_coords[0])
            .attr("cy",marker_coords[1]);
        })
        .on("mousemove", function() {
            tooltip.style("top", (event.pageY - $("body").scrollTop() - 10) + "px")
            .style("left", (event.pageX + 6) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
            this.setAttribute("r", dotRadius);
            map_svg.select("circle.stop-marker").remove();
        });

        // Update the map to show this route
        var route_line = d3.svg.line().x(function(d){return d[0];}).y(function(d){return d[1];}).interpolate("cardinal");

        // Project lat->lng into coordinates to display on the map
        positions = stops.map(function(stop){return $scope.map_projection([stop.lon, stop.lat]);});

        map_svg.select("path.route-line")
        .transition()
        .attr("d", route_line(positions))
        .attr("stroke", routeColor);

    };
}]);
