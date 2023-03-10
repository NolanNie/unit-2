var map;
var dataStats= {};

//step 1 create map
function createMap(){

    //create the map
    map = L.map('map', {
        center: [40, -100],
        zoom: 4
    });

    //add OSM base tilelayer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    //call getData function
    getData(map);
};



function calcStats(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each city
    for(var city of data.features){
        //loop through each year
        for(var year = 2000; year <= 2021; year+=1){
            //get population for current year
            var value = city.properties[String(year)];
            //add value to array
            allValues.push(value);
      }
    }
    //get min, max, mean stats for our array
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    //calculate meanValue
    var sum = allValues.reduce(function(a, b){return a+b;});
    dataStats.mean = sum/ allValues.length
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/dataStats.min,0.5715) * minRadius
    
    return radius;
};

//Step 3: Add circle markers for point features to the map
function createPropSymbols(data, attributes){

    //Step 4: Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0]
    console.log(attribute)
    createLegend(attribute)

    //create marker options
    var geojsonMarkerOptions = {
        fillColor: "#ff7800",
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
        radius: 8
    };

    L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            //Step 5: For each feature, determine its value for the selected attribute
            var attValue = Number(feature.properties[attribute]);

            //Step 6: Give each feature's circle marker a radius based on its attribute value
            geojsonMarkerOptions.radius = calcPropRadius(attValue);
            //create circle markers
            layer = L.circleMarker(latlng, geojsonMarkerOptions);

            //build popup content string
            var popupContent = "<p><b>City:</b> " + feature.properties["Core Based Statistical Area"] + "</p><p><b>PM<sub>2.5</sub> in " + attribute + ":</b> " + feature.properties[attribute] + "</p>";

            //bind the popup to the circle marker
            layer.bindPopup(popupContent);

            //return the circle marker to the L.geoJson pointToLayer option
            return layer;
        }
    }).addTo(map);
};

//Above Example 3.10...Step 3: build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("20") > -1){
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes.length);

    return attributes;
};


//Step 2: Import GeoJSON data
function getData(){
    //load the data
    fetch("data/PM25.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            var attributes = processData(json);
            //calculate minimum data value
            calcStats(json);
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
        })
};

//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    updateLegend(attribute)
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add city to popup content string
            var popupContent = "<p><b>City:</b> " + props["Core Based Statistical Area"] + "</p>";

            //add formatted attribute to panel content string
            var year = attribute;
            popupContent += "<p><b>PM<sub>2.5</sub> in " + year + ":</b> " + props[attribute] + " million</p>";

            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
};


//Create new sequence controls
function createSequenceControls(attributes){   
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');
            

            //create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')

            container.querySelector(".range-slider").max = 21;
            container.querySelector(".range-slider").min = 0;
            container.querySelector(".range-slider").value = 0;
            container.querySelector(".range-slider").step = 1;

            //add skip buttons
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/reverse.png"></button>'); 
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/forward.png"></button>');
            
            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });

    map.addControl(new SequenceControl());  

    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            //sequence
        })
    })

    //Step 5: input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){            
        //sequence
    });
    document.querySelector('.range-slider').addEventListener('input', function(){
        //Step 6: get the new index value
        var index = this.value;
        console.log(index)
        updatePropSymbols(attributes[index]);
    });

    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;

            //Step 6: increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 21 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //Step 7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 21 : index;
            };

            //Step 8: update slider
            document.querySelector('.range-slider').value = index;

            updatePropSymbols(attributes[index]);
        })
    })

};

function createLegend(attribute){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // <div class="legend-control-container leaflet-control"><p><b>2002</b></p></div>
            
            // create the control container with a particular class name
            legendContainer = L.DomUtil.create('div', 'legend-control-container');

             //Step 1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="100px" height="50px">';

            legendContainer.insertAdjacentHTML('beforeend', '<p id="year"><b> PM<sub>2.5</sub> in ' + attribute +'</b></p>');
            
            //array of circle names to base loop on  
            var circles = ["max", "mean", "min"]; 

            //Step 2: loop to add each circle and text to svg string  
            for (var i=0; i<circles.length; i++){  

                //Step 3: assign the r and cy attributes  
                var radius = calcPropRadius(dataStats[circles[i]]);  
                console.log(dataStats[circles[i]]);
                var cy = 50 - radius;  

                //circle string  
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="50"/>';  
            };  

            //close svg string  
            svg += "</svg>"; 
            console.log(svg);
            //add attribute legend svg to container
            legendContainer.insertAdjacentHTML('beforeend',svg);

            return legendContainer;
            }
    });

    map.addControl(new LegendControl());
};

function updateLegend(attribute){
    legendContainer.innerHTML = '<p id="year"><b> PM<sub>2.5</sub> in ' + attribute +'</b></p>';


    var svg = '<svg id="attribute-legend" width="100px" height="50px">';

    //array of circle names to base loop on  
    var circles = ["max", "mean", "min"]; 

    //Step 2: loop to add each circle and text to svg string  
    for (var i=0; i<circles.length; i++){  

        //Step 3: assign the r and cy attributes  
        var radius = calcPropRadius(dataStats[circles[i]]);  
        console.log(dataStats[circles[i]]);
        var cy = 50 - radius;  

        //circle string  
        svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="50"/>';  
    };  

    //close svg string  
    svg += "</svg>"; 
    console.log(svg);
    //add attribute legend svg to container
    legendContainer.insertAdjacentHTML('beforeend',svg);

};




document.addEventListener('DOMContentLoaded',createMap)