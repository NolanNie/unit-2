var map;
var dataStats= {};
var legendContainer;


function createMap(){

    //create the map
    map = L.map('map', {
        center: [40, -100],
        zoom: 4
    });

    //add StadiaMaps base tilelayer
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
	    maxZoom: 20,
	    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
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
    
    return radius * 1.25;
};

//Add circle markers for point features to the map
function createPropSymbols(data, attributes){

    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0]
    
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
            //For each feature, determine its value for the selected attribute
            var attValue = Number(feature.properties[attribute]);

            //Give each feature's circle marker a radius based on its attribute value
            geojsonMarkerOptions.radius = calcPropRadius(attValue);
            //create circle markers
            layer = L.circleMarker(latlng, geojsonMarkerOptions);

            //build popup content string
            var popupContent = "<p><b>City:</b> " + feature.properties["Core Based Statistical Area"] + "</p><p><b>PM<sub>2.5</sub> in " + attribute + ":</b> " + feature.properties[attribute] + " ug/m3</p>";

            //bind the popup to the circle marker
            layer.bindPopup(popupContent);

            //return the circle marker to the L.geoJson pointToLayer option
            return layer;
        }
    }).addTo(map);
};

//Build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with PM2.5 values
        if (attribute.indexOf("20") > -1){
            attributes.push(attribute);
        };
    };

    return attributes;
};


//Import GeoJSON data
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

// Resize proportional symbols according to new attribute values
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
            popupContent += "<p><b>PM<sub>2.5</sub> in " + year + ":</b> " + props[attribute] + " ug/m3</p>";

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

    
    document.querySelector('.range-slider').addEventListener('input', function(){

        //get the new index value
        var index = this.value;

        updatePropSymbols(attributes[index]);
    });

    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;

            // increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                // if past the last attribute, wrap around to first attribute
                index = index > 21 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //if past the first attribute, wrap around to last attribute
                index = index < 0 ? 21 : index;
            };

            // update slider
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
            
            // create the control container with a particular class name
            legendContainer = L.DomUtil.create('div', 'legend-control-container');

             // start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="170px" height="100px">';

            legendContainer.insertAdjacentHTML('beforeend', '<p id="year"><b> PM<sub>2.5</sub> in ' + attribute +'</b></p>');
            
            //array of circle names to base loop on  
            var circles = ["max", "mean", "min"]; 

            for (var i=0; i<circles.length; i++){  

                //assign the r and cy attributes  
                var radius = calcPropRadius(dataStats[circles[i]]);
                var cy = 50 - radius;  
        
                var textY = i * 10 + 25; 
                //circle string 
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="50"/>';  
                //text string            
                svg += '<text id="' + circles[i] + '-text" x="70" y="' + textY + '">' + Math.round(dataStats[circles[i]]*100)/100 + " ug/m3</text>";

            };  

            //close svg string  
            svg += "</svg>"; 

            //add attribute legend svg to container
            legendContainer.insertAdjacentHTML('beforeend',svg);

            return legendContainer;
            }
    });

    map.addControl(new LegendControl());
};

function updateLegend(attribute){
    legendContainer.innerHTML = '<p id="year"><b> PM<sub>2.5</sub> in ' + attribute +'</b></p>';


    var svg = '<svg id="attribute-legend" width="170px" height="100px">';

    //array of circle names to base loop on  
    var circles = ["max", "mean", "min"]; 

    //loop to add each circle and text to svg string  
    for (var i=0; i<circles.length; i++){  

        // assign the r and cy attributes  
        var radius = calcPropRadius(dataStats[circles[i]]);
        var cy = 50 - radius;  

        var textY = i * 10 + 25; 
        //circle string 
        svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="50"/>'; 

        //text string            
        svg += '<text id="' + circles[i] + '-text" x="70" y="' + textY + '">' + Math.round(dataStats[circles[i]]*100)/100 + " ug/m3</text>";
    };  

    //close svg string  
    svg += "</svg>"; 

    //add attribute legend svg to container
    legendContainer.insertAdjacentHTML('beforeend',svg);

};




document.addEventListener('DOMContentLoaded',createMap)