var map;
var dataStats;

//step 1 create map
function createMap(){

    //create the map
    map = L.map('map', {
        center: [0, 0],
        zoom: 2
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
    //get minimum value of our array
    var minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/dataStats,0.5715) * minRadius
    
    return radius;
};

//Step 3: Add circle markers for point features to the map
function createPropSymbols(data, attributes){

    //Step 4: Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0]
    console.log(attribute)

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
        pointToLayer: function (feature, latlng, attributes) {
            //Step 5: For each feature, determine its value for the selected attribute
            var attValue = Number(feature.properties[attribute]);

            //Step 6: Give each feature's circle marker a radius based on its attribute value
            geojsonMarkerOptions.radius = calcPropRadius(attValue);
            //create circle markers
            layer = L.circleMarker(latlng, geojsonMarkerOptions);

            //build popup content string
            var popupContent = "<p><b>City:</b> " + feature.properties["Core Based Statistical Area"] + "</p><p><b>" + attribute + ":</b> " + feature.properties[attribute] + "</p>";

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
            dataStats = calcStats(json);
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
        })
};

//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
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
            popupContent += "<p><b>Population in " + year + ":</b> " + props[attribute] + " million</p>";

            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
};

//Step 1: Create new sequence controls
function createSequenceControls(attributes){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

    //set slider attributes
    document.querySelector(".range-slider").max = 21;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    //below Example 3.6...add step buttons
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse"></button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward"></button>');

    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/reverse.png'>")
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/forward.png'>")

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






document.addEventListener('DOMContentLoaded',createMap)