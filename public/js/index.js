/*
  Author: Adam Poper
  Organization: DuraEdge Products, Inc.
  Name of File: index.js
  Purpose: this file contains all the algorithms and data processing functionality for the store locator application
*/

/* disabled temporarily so I can figure out how to properly read the data from the ftp server or some other location
window.onload = loadLocationsFromJSON;
*/

const StoreType = {
  Store: 'store',
  Bulk: 'bulk'
}

// loads data from a CSV file which is slower because it must make all the api requests every time the app is loaded

async function loadLocationsFromCSV() {
  window.locations = [];
  const res = await fetch('../data/MasterLocations.csv', {mode: 'no-cors'});
  let data = await res.text();
  data = data.split('\n');
  data.shift();
  data.pop();
  data.forEach((item, i) => {
    const storeInfo = item.split(',');
    const location = {
      name: storeInfo[0],
      locality: storeInfo[2],
      state: storeInfo[3],
      zipcode: storeInfo[4],
      streetNumber: storeInfo[5],
      route: storeInfo[6],
      aptSuite: storeInfo[7],
      website: storeInfo[8],
      salesRep: storeInfo[10],
      phoneNum: storeInfo[11],
      coords: {
        lat: 0,
        lng: 0
      }
    };
    window.locations.push(location);
  });
  // get the coordinates from the address
  for(let i = 0; i < locations.length; i++) {
    window.locations[i].coords = await getLatLongFromAddress(window.locations[i].streetNumber, window.locations[i].route, window.locations[i].locality, window.locations[i].state);
  }
  window.locations.forEach((item, i) => {
    console.log(item);
  });
}

// loads the data from a json file called MasterLocations.json which can be generated using the file-converter app
// this is much faster because there are no calls to the google maps api when the app loads

async function loadLocationsFromJSON() {
  window.locations = [];
  const res = await fetch('https://duraedge.com/storelocator/data/MasterLocations.json', {mode: 'no-cors'});
  let data = await res.json();
  window.locations = data;
  console.log(window.locations);
}


// callback function for initiating the map
function initMap() {
  let mapProp = {
    center: new google.maps.LatLng(40.730610,-73.935242),
    zoom: 8
  }
  let map = new google.maps.Map(document.getElementById('map'), mapProp);
}

// receives the latitude and longitude and goes to those coordinates on the map
function gotoLocations(locations) {
  const closestLocation = new google.maps.LatLng(locations[0].coords.lat, locations[0].coords.lng);
  const map = new google.maps.Map(document.getElementById('map'), {center: closestLocation, zoom: 12});
  for(let i = 0; i < 5; i++) {
    let lat = locations[i].coords.lat;
    let lng = locations[i].coords.lng;
    const marker = new google.maps.Marker({
      position: {lat, lng},
      map: map
    });
  }
}
// returns the latitude and longitude from a zip code
async function getLatLongFromZip(zip) {
  const url = "https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyAv_Tqy8l-X1k1fue0hggJ0orxoJQqz2mw&components=postal_code:" + zip;
  const res = await fetch(url);
  const data = await res.json();
  const location = await data.results[0].geometry.location;
  return location;
}

// returns the latitude and longitude from a street address
async function getLatLongFromAddress(streetNumber, route, locality, state) {
  // https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${streetNumber}+${route.replace(/ /g, '+')},+${locality.replace(/ /g, '+')},+${state}&key=AIzaSyAv_Tqy8l-X1k1fue0hggJ0orxoJQqz2mw`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results[0].geometry.location;
}

// the swap function for the quicksort algorithm
function swap(data, x, y) {
  let temp = data[x];
  data[x] = data[y];
  data[y] = temp;
}

// the partition function for the quick sort algorithm
function partition(currentCoords, data, low, high) {
  let pivot = data[high];
  let i = low - 1;
  let lat1 = currentCoords.lat;
  let lon1 = currentCoords.lng;
  const pivotDistance = getDistanceFromLatLonInKm(lat1, lon1, pivot.coords.lat, pivot.coords.lng);
  for(let j = low; j <= high - 1; j++) {
    let lat2 = data[j].coords.lat;
    let lon2 = data[j].coords.lng;
    const distance = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
    if(distance < pivotDistance /*data[j] < pivot*/) {
      i++;
      swap(data, i, j);
    }
  }
  swap(data, i+1, high);
  return i + 1;
}

// this program utilizes the quick sort sorting algorithm for finding the closest locations to the user
function quickSort(currentCoords, data, low, high) {
  if(low < high) {
    let pi = partition(currentCoords, data, low, high);
    quickSort(currentCoords, data, low, pi-1);
    quickSort(currentCoords, data, pi+1, high);
  }
}

function onStoreLocateByZip() {
  onLocateByZip(StoreType.Store);
}

function onBulkLocateByZip() {
  onLocateByZip(StoreType.Bulk);
}

// gets coordinates and goes to map location when locate button is clicked
async function onLocateByZip(type) {
  const zip = document.getElementById('zip-input').value;
  const currentLocationCoords = await getLatLongFromZip(zip);
  switch(type) {
    case StoreType.Store: {
      window.locations = readStaticStoreDataJSON();
      const locationsData = window.locations;
      quickSort(currentLocationCoords, locationsData, 0, locationsData.length-1);
      gotoLocations(locationsData);
      clearLocations();
      displayLocations(locationsData);
      const map = document.getElementById('map');
      map.scrollIntoView();
    }
    break;
    case StoreType.Bulk: {
      window.locations = readStaticBulkDataJSON();
      const locationsData = window.locations;
      quickSort(currentLocationCoords, locationsData, 0, locationsData.length-1);
      clearNearestBulkLocation();
      displayNearestDistributorLocation(locationsData[0]);
    }
  }
}

function onStoreLocateByGeoLocation() {
  onLocateByGeoLocation(StoreType.Store);
}

function onBulkLocateByGeoLocation() {
  onLocateByGeoLocation(StoreType.Bulk);
}

// called when the user wishes to locate the nearest store based on their current location
function onLocateByGeoLocation(type) {
  let geoSuccess = (position) => {
    const currentLocationCoords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    switch(type) {
      case StoreType.Store: {
        window.locations = readStaticStoreDataJSON();
        const locationsData = window.locations;
        quickSort(currentLocationCoords, locationsData, 0, locationsData.length-1);
        gotoLocations(locationsData);
        clearLocations();
        displayLocations(locationsData);
        const map = document.getElementById('map');
        map.scrollIntoView();
      }
      break;
      case StoreType.Bulk: {
        console.log('Bulk');
        window.locations = readStaticBulkDataJSON();
        const locationsData = window.locations;
        quickSort(currentLocationCoords, locationsData, 0, locationsData.length-1);
        clearNearestBulkLocation();
        displayNearestDistributorLocation(locationsData[0]);
      }
      break;
    }
  }
  let geoError = (error) => {
    console.error(error);
  }
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(geoSuccess);
  } else {
    alert('Geolocation Not Supported. Locate Using Zip Code');
  }
}

// adds the location cards to the document
function displayLocations(locations) {
  const locationOptions = document.getElementById('location-options');
  for(let i = 0; i < 5; i++) {
    const locationCard = generateLocationCard(locations[i]);
    locationOptions.appendChild(locationCard);
  }
}

function displayNearestDistributorLocation(location) {
  const locationDisplay = document.getElementById('nearest-bulk-location');
  const locationCard = generateNearestDistributorInfo(location);
  locationDisplay.appendChild(locationCard);
}

// clears the location cards from the screen to prepare for the next query
function clearLocations() {
  const locationOptions = document.getElementById('location-options');
  while(locationOptions.lastChild) {
    locationOptions.removeChild(locationOptions.lastChild);
  }
}

function clearNearestBulkLocation() {
  const nearestBulkLocation = document.getElementById('nearest-bulk-location');
  if(nearestBulkLocation.lastChild)
    nearestBulkLocation.removeChild(nearestBulkLocation.lastChild);
}

// generates a location card based on the information in the location json object
function generateLocationCard(location) {
  const container = document.createElement("div");
  container.className = 'location-card';
  const locationAddressInfo = document.createElement("div");
  locationAddressInfo.className = 'location-address-info';
  const icon = document.createElement("img");
  icon.src = './assets/map_marker.png';
  const name = document.createElement("h2");
  name.textContent = location.name;
  const address = document.createElement("p");
  const streetAddress = `${location.streetNumber} ${location.route} ${location.aptSuite}`;
  address.textContent = streetAddress;
  const localityAddress = `${location.locality}, ${location.state}, ${location.zipcode}`;
  address.textContent += localityAddress
  const website = document.createElement("a");
  website.textContent = location.website;
  website.href = `http://${location.website}`;
  website.target = '_blank';
  const googleMapsURL = `https://www.google.com/maps/search/?api=1&query=${streetAddress}, ${localityAddress}`;
  const googleMapsLink = document.createElement("a");
  googleMapsLink.href = googleMapsURL;
  googleMapsLink.textContent = "   View in Google Maps";
  googleMapsLink.target = '_blank';
  const contact = document.createElement("p");
  contact.textContent = `Contact Sales Rep: ${location.salesRep}, ${location.phoneNum}`;
  locationAddressInfo.appendChild(name);
  locationAddressInfo.appendChild(website);
  locationAddressInfo.appendChild(address);
  locationAddressInfo.appendChild(googleMapsLink);
  locationAddressInfo.appendChild(contact);
  container.appendChild(icon);
  container.appendChild(locationAddressInfo);
  return container;
}

function generateNearestDistributorInfo(location) {
  const container = document.createElement('div');
  container.className = 'nearest-distributor-card';
  const name = document.createElement('h1');
  name.textContent = location.name;
  const email = document.createElement('p');
  email.textContent = location.email;
  const phoneNumber = document.createElement('p');
  phoneNumber.textContent = location.phoneNum;
  const rep = document.createElement('p');
  rep.textContent = location.rep;
  const address = document.createElement('a');
  const streetAddress = `${location.streetNumber} ${location.route}`;
  const localityAddress = `${location.locality}, ${location.state}, ${location.zipcode}`;
  address.textContent = `${streetAddress} ${localityAddress}`;
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${streetAddress}, ${localityAddress}`;
  address.href = googleMapsLink;
  address.target = '_blank';
  container.appendChild(name);
  container.appendChild(address);
  container.appendChild(rep);
  container.appendChild(email);
  container.appendChild(phoneNumber);
  return container;
}

// the following code was retrieved from https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
// used for calculating the distance in kilometers from two coordinates
function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  let R = 6371; // Radius of the earth in km
  let dLat = deg2rad(lat2-lat1);  // deg2rad below
  let dLon = deg2rad(lon2-lon1);
  let a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  let d = R * c; // Distance in km
  return d;
}

// converts degrees to radians
function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function readStaticStoreDataJSON() {
  return [
    {
      "name": "Batavia Turf",
      "locality": "Elba",
      "state": "NY",
      "zipcode": "14058",
      "streetNumber": "6465",
      "route": "Transit Rd.",
      "aptSuite": "",
      "website": "www.bataviaturf.com",
      "salesRep": "Chuck Hoover",
      "phoneNum": "585-261-6370",
      "coords": {
        "lat": 43.101956,
        "lng": -78.111204
      }
    },
    {
      "name": "Belair Road Supply",
      "locality": "Frankford",
      "state": "DE",
      "zipcode": "19945",
      "streetNumber": "6",
      "route": "Hickory St.",
      "aptSuite": "",
      "website": "www.belairroadsupply.com",
      "salesRep": "Tony DiBuo",
      "phoneNum": "302-542-4649",
      "coords": {
        "lat": 38.520845,
        "lng": -75.2383576
      }
    },
    {
      "name": "Synatek Solutions",
      "locality": " NY",
      "state": " CT\"",
      "zipcode": "Souderton",
      "streetNumber": "PA",
      "route": "18964",
      "aptSuite": "737",
      "website": "Hagey Center Dr.",
      "salesRep": "www.synateksolutions.com",
      "phoneNum": "Mid-Atlantic",
      "coords": {
        "lat": 40.2972847,
        "lng": -75.3353875
      }
    },
    {
      "name": "Target-Specialty Products",
      "locality": "Reading",
      "state": "PA",
      "zipcode": "19605",
      "streetNumber": "710",
      "route": "Corporate Center Dr.",
      "aptSuite": "",
      "website": "www.target-specialty.com",
      "salesRep": "Alfie Gardiner",
      "phoneNum": "610-416-5828",
      "coords": {
        "lat": 40.4082807,
        "lng": -75.939448
      }
    },
    {
      "name": "Target-Specialty Products",
      "locality": "West Deptford",
      "state": "NJ",
      "zipcode": "8066",
      "streetNumber": "1707",
      "route": "Imperial Way",
      "aptSuite": "",
      "website": "www.target-specialty.com",
      "salesRep": "Alfie Gardiner",
      "phoneNum": "610-416-5828",
      "coords": {
        "lat": 39.8310007,
        "lng": -75.2055144
      }
    },
    {
      "name": "Genesis Green Supply",
      "locality": "Glen Rock",
      "state": "PA",
      "zipcode": "17327",
      "streetNumber": "137",
      "route": "Commerce Dr.",
      "aptSuite": "",
      "website": "www.genesisturfgrass.com",
      "salesRep": "Todd Cowing",
      "phoneNum": "717-759-8151",
      "coords": {
        "lat": 39.814338,
        "lng": -76.684742
      }
    },
    {
      "name": "Anderson Outdoor",
      "locality": "Paxton",
      "state": "IL",
      "zipcode": "60957",
      "streetNumber": "100",
      "route": "W. Hunt St.",
      "aptSuite": "",
      "website": "www.andersonssportsturf.com",
      "salesRep": "Jeff Anderson",
      "phoneNum": "217-249-3793",
      "coords": {
        "lat": 40.4525906,
        "lng": -88.1015429
      }
    },
    {
      "name": "Automatic Supply",
      "locality": "Fishers",
      "state": "IN",
      "zipcode": "46038",
      "streetNumber": "116",
      "route": "Shadowlawn Dr.",
      "aptSuite": "",
      "website": "www.asksutomatic.com",
      "salesRep": "Paul Thoma",
      "phoneNum": "317-650-7785",
      "coords": {
        "lat": 39.9521945,
        "lng": -86.0442765
      }
    },
    {
      "name": "Automatic Supply",
      "locality": "Fort Wayne",
      "state": "IN",
      "zipcode": "46808",
      "streetNumber": "2204",
      "route": "Research Dr.",
      "aptSuite": "",
      "website": "www.asksutomatic.com",
      "salesRep": "Blake Sievers",
      "phoneNum": "260-415-0910",
      "coords": {
        "lat": 41.1279224,
        "lng": -85.1706359
      }
    },
    {
      "name": "Automatic Supply",
      "locality": "Indianapolis",
      "state": "IN",
      "zipcode": "46268",
      "streetNumber": "5232",
      "route": "W. 79th St.",
      "aptSuite": "",
      "website": "www.asksutomatic.com",
      "salesRep": "Kurt Cloe",
      "phoneNum": "317-409-6101",
      "coords": {
        "lat": 39.8969578,
        "lng": -86.251322
      }
    },
    {
      "name": "Automatic Supply",
      "locality": "Greenwood",
      "state": "IN",
      "zipcode": "46143",
      "streetNumber": "647",
      "route": "Sayre Ct. A",
      "aptSuite": "",
      "website": "www.asksutomatic.com",
      "salesRep": "Matt Alexander",
      "phoneNum": "317-697-5356",
      "coords": {
        "lat": 39.62826,
        "lng": -86.085071
      }
    },
    {
      "name": "Automatic Supply",
      "locality": "Newburgh",
      "state": "IN",
      "zipcode": "47630",
      "streetNumber": "7322",
      "route": "Peachwood Dr.",
      "aptSuite": "",
      "website": "www.asksutomatic.com",
      "salesRep": "Karl Proctor",
      "phoneNum": "812-217-1172",
      "coords": {
        "lat": 37.9756662,
        "lng": -87.3839723
      }
    },
    {
      "name": "Beacon Athletics",
      "locality": "Middleton",
      "state": "WI",
      "zipcode": "53562",
      "streetNumber": "8233",
      "route": "Forsythia St.",
      "aptSuite": "Suite #120",
      "website": "beaconathletics.com",
      "salesRep": "Paul Zwaska",
      "phoneNum": "800-747-5985",
      "coords": {
        "lat": 43.1103915,
        "lng": -89.52547009999999
      }
    },
    {
      "name": "Pioneer Athletics",
      "locality": "Cleveland",
      "state": "OH",
      "zipcode": "44135",
      "streetNumber": "4529",
      "route": "Industrial Parkway",
      "aptSuite": "",
      "website": "www.pioneerathletics.com",
      "salesRep": "Jim Cook",
      "phoneNum": "800-877-1500",
      "coords": {
        "lat": 41.4288148,
        "lng": -81.78769779999999
      }
    },
    {
      "name": "Reinders",
      "locality": "Appleton",
      "state": "WI",
      "zipcode": "54913",
      "streetNumber": "800",
      "route": "Randolph Dr.",
      "aptSuite": "",
      "website": "www.reinders.com",
      "salesRep": "Mick Dennin",
      "phoneNum": "920-788-0200",
      "coords": {
        "lat": 44.2985129,
        "lng": -88.30629309999999
      }
    },
    {
      "name": "Reinders",
      "locality": "Kenosha",
      "state": "WI",
      "zipcode": "53101",
      "streetNumber": "8441",
      "route": "197th Ave",
      "aptSuite": "",
      "website": "www.reinders.com",
      "salesRep": "Dan Navin",
      "phoneNum": "262-857-3306",
      "coords": {
        "lat": 42.5550567,
        "lng": -88.0457115
      }
    },
    {
      "name": "Reinders",
      "locality": "Madison",
      "state": "WI",
      "zipcode": "53714",
      "streetNumber": "4217",
      "route": "Nakoosa Trail",
      "aptSuite": "",
      "website": "www.reinders.com",
      "salesRep": "Ben Olds",
      "phoneNum": "608-244-0200",
      "coords": {
        "lat": 43.1096428,
        "lng": -89.3106327
      }
    },
    {
      "name": "Reinders",
      "locality": "Stevens Point",
      "state": "WI",
      "zipcode": "54467",
      "streetNumber": "3510",
      "route": "Post Rd.",
      "aptSuite": "",
      "website": "www.reinders.com",
      "salesRep": "Kris Pinkerton",
      "phoneNum": "715-342-3600",
      "coords": {
        "lat": 44.4462014,
        "lng": -89.53977499999999
      }
    },
    {
      "name": "Reinders",
      "locality": "Waukesha",
      "state": "WI",
      "zipcode": "53188",
      "streetNumber": "2343",
      "route": "Pewaukee Rd.",
      "aptSuite": "",
      "website": "www.reinders.com",
      "salesRep": "Adam Urbanski",
      "phoneNum": "262-524-0200",
      "coords": {
        "lat": 43.0357068,
        "lng": -88.22426449999999
      }
    },
    {
      "name": "Reinders",
      "locality": "Hudson",
      "state": "WI",
      "zipcode": "54016",
      "streetNumber": "588",
      "route": "Schommer Dr. B",
      "aptSuite": "",
      "website": "www.reinders.com",
      "salesRep": "Ryan Grajkowski",
      "phoneNum": "715-690-2343",
      "coords": {
        "lat": 44.990911,
        "lng": -92.6847165
      }
    },
    {
      "name": "Reinders",
      "locality": "Buffalo Grove",
      "state": "IL",
      "zipcode": "60089",
      "streetNumber": "111",
      "route": "Lexington Dr.",
      "aptSuite": "",
      "website": "www.reinders.com",
      "salesRep": "Kris Willing",
      "phoneNum": "847-573-0300",
      "coords": {
        "lat": 42.155164,
        "lng": -87.9422881
      }
    },
    {
      "name": "Reinders",
      "locality": "Olathe",
      "state": "KS",
      "zipcode": "66062",
      "streetNumber": "19942",
      "route": "W. 162nd St. D",
      "aptSuite": "",
      "website": "www.reinders.com",
      "salesRep": "Curt Mays",
      "phoneNum": "913-397-0080",
      "coords": {
        "lat": 38.8344256,
        "lng": -94.8191377
      }
    },
    {
      "name": "Target Specialty Products",
      "locality": "Wixom",
      "state": "MI",
      "zipcode": "48377",
      "streetNumber": "29380",
      "route": "Beck Rd.",
      "aptSuite": "",
      "website": "www.target-specialty.com",
      "salesRep": "Brett Roberts",
      "phoneNum": "947-465-9650",
      "coords": {
        "lat": 42.5082789,
        "lng": -83.51559979999999
      }
    },
    {
      "name": "Agriland FS",
      "locality": "Indianola",
      "state": "IA",
      "zipcode": "50125",
      "streetNumber": "2616",
      "route": " W 2nd Ave",
      "aptSuite": "",
      "website": "www.agrilandfs.com",
      "salesRep": "Curtis Myers",
      "phoneNum": "515-961-8408",
      "coords": {
        "lat": 41.3579646,
        "lng": -93.5957236
      }
    },
    {
      "name": "Agriland FS",
      "locality": "Underwood",
      "state": "NE",
      "zipcode": "51576",
      "streetNumber": "701",
      "route": "Railroad Hwy St.",
      "aptSuite": "",
      "website": "www.agrilandfs.com",
      "salesRep": "Steve Watson",
      "phoneNum": "402-707-2863",
      "coords": {
        "lat": 41.3801188,
        "lng": -95.6832493
      }
    },
    {
      "name": "Big Country Seeds",
      "locality": "Tiffin",
      "state": "IA",
      "zipcode": "52340",
      "streetNumber": "1050",
      "route": "Greenfield Dr.",
      "aptSuite": "",
      "website": "www.bigcountryseeds.com",
      "salesRep": "Brian Heinricy",
      "phoneNum": "319-929-8025",
      "coords": {
        "lat": 41.690187,
        "lng": -91.6695189
      }
    },
    {
      "name": "D&K Products",
      "locality": "Bettendorf",
      "state": "IA",
      "zipcode": "52722",
      "streetNumber": "1210",
      "route": "44th St.",
      "aptSuite": "",
      "website": "www.dkturf.com",
      "salesRep": "Matt Nielsen",
      "phoneNum": "563-823-1842",
      "coords": {
        "lat": 41.533619,
        "lng": -90.475561
      }
    },
    {
      "name": "D&K Products",
      "locality": "Des Moines",
      "state": "IA",
      "zipcode": "50313",
      "streetNumber": "1672",
      "route": "NE 54th Ave",
      "aptSuite": "",
      "website": "www.dkturf.com",
      "salesRep": "Ross Huff",
      "phoneNum": "800-798-9352",
      "coords": {
        "lat": 41.65956970000001,
        "lng": -93.59341119999999
      }
    },
    {
      "name": "D&K Products",
      "locality": "LaVista",
      "state": "NE",
      "zipcode": "68128",
      "streetNumber": "11937",
      "route": "Portal Rd.",
      "aptSuite": "Suite 113",
      "website": "www.dkturf.com",
      "salesRep": "Tony Vacarro",
      "phoneNum": "402-515-8302",
      "coords": {
        "lat": 41.1728823,
        "lng": -96.09977900000001
      }
    },
    {
      "name": "Gerten's",
      "locality": "Egan",
      "state": "MN",
      "zipcode": "55076",
      "streetNumber": "5500",
      "route": "Blaine Ave E",
      "aptSuite": "",
      "website": "www.gertens.com",
      "salesRep": "Matt Krey",
      "phoneNum": "651-319-3604",
      "coords": {
        "lat": 44.8678642,
        "lng": -93.05334429999999
      }
    },
    {
      "name": "Reinders",
      "locality": "Minneapolis",
      "state": "MN",
      "zipcode": "55447",
      "streetNumber": "2722",
      "route": "Fernbrook Ln. N",
      "aptSuite": "",
      "website": "www.reinders.com",
      "salesRep": "Chad Nowak",
      "phoneNum": "763-503-0200",
      "coords": {
        "lat": 45.0093,
        "lng": -93.46091609999999
      }
    },
    {
      "name": "Reinders",
      "locality": "Rochester",
      "state": "MN",
      "zipcode": "55901",
      "streetNumber": "4165",
      "route": "US-14",
      "aptSuite": "Suite 100",
      "website": "www.reinders.com",
      "salesRep": "Tim Rainey",
      "phoneNum": "507-292-0677",
      "coords": {
        "lat": 44.0398262,
        "lng": -92.5255186
      }
    },
    {
      "name": "HLS Outdoor",
      "locality": "Brooklyn",
      "state": "MN",
      "zipcode": "55428",
      "streetNumber": "9300",
      "route": "75th Ave N ",
      "aptSuite": "",
      "website": "www.hlsoutdoor",
      "salesRep": "Nick Balistrieri",
      "phoneNum": "651-279-5874",
      "coords": {
        "lat": 45.0910007,
        "lng": -93.40014090000001
      }
    },
    {
      "name": "HLS Outdoor",
      "locality": "Egan",
      "state": "MN",
      "zipcode": "55122",
      "streetNumber": "2015",
      "route": "Silver Bell Rd.",
      "aptSuite": "Suite 110",
      "website": "www.hlsoutdoor",
      "salesRep": "Nick Balistrieri",
      "phoneNum": "651-279-5874",
      "coords": {
        "lat": 44.8221137,
        "lng": -93.20888409999999
      }
    },
    {
      "name": "Game One Logistics",
      "locality": "Pleasant Hill",
      "state": "OH",
      "zipcode": "45359",
      "streetNumber": "1484",
      "route": "Rangeline Rd.",
      "aptSuite": "",
      "website": "www.gameonlogistic.com",
      "salesRep": "Bryce Adams",
      "phoneNum": "937 -479-3960",
      "coords": {
        "lat": 40.0589058,
        "lng": -84.3775941
      }
    },
    {
      "name": "Site One Maryland Hts. #25",
      "locality": "Maryland Hts.",
      "state": "MO",
      "zipcode": "63146",
      "streetNumber": "2135",
      "route": "Schuetz Rd.",
      "aptSuite": "",
      "website": "www.siteone.com",
      "salesRep": "Nick LaPlante",
      "phoneNum": "314-991-3535",
      "coords": {
        "lat": 38.6983441,
        "lng": -90.4300033
      }
    },
    {
      "name": "Athletic Depot USA",
      "locality": "Lulu",
      "state": "GA",
      "zipcode": "30554",
      "streetNumber": "101",
      "route": "Pearl Industrial Ave e",
      "aptSuite": "",
      "website": "www.athleticdepotusa.com",
      "salesRep": "Jason Tindell",
      "phoneNum": "877-499-7015",
      "coords": {
        "lat": 34.0854606,
        "lng": -83.7423858
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Baton Rouge",
      "state": "LA",
      "zipcode": "70809",
      "streetNumber": "11638",
      "route": "Cloverland Ave",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jesse Kirvin",
      "phoneNum": "225-753-7530",
      "coords": {
        "lat": 30.3906305,
        "lng": -91.051693
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Ridgeland",
      "state": "MS",
      "zipcode": "39157",
      "streetNumber": "112",
      "route": "E Marketridge Rd.",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jason Rogers",
      "phoneNum": "601-991-3185",
      "coords": {
        "lat": 32.4081616,
        "lng": -90.1717762
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Shreveport",
      "state": "LA",
      "zipcode": "71106",
      "streetNumber": "234",
      "route": "Lynbrook Blvd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Brett Clifton",
      "phoneNum": "318-671-5161",
      "coords": {
        "lat": 32.4227547,
        "lng": -93.7599362
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Alpharetta",
      "state": "GA",
      "zipcode": "30004",
      "streetNumber": "4080",
      "route": "Nine McFarland Dr.",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jeremy Bohonko",
      "phoneNum": "980-254-5100",
      "coords": {
        "lat": 34.1353716,
        "lng": -84.2547956
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Montgomery",
      "state": "AL",
      "zipcode": "36117",
      "streetNumber": "5890",
      "route": "Monticello Dr.",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Heather Corwin",
      "phoneNum": "334-396-8202",
      "coords": {
        "lat": 32.3647953,
        "lng": -86.2096157
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Birmingham",
      "state": "AL",
      "zipcode": "35235",
      "streetNumber": "5480",
      "route": "Vann Pl.",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jeremy Bohonko",
      "phoneNum": "980-254-5100",
      "coords": {
        "lat": 33.6082483,
        "lng": -86.6345772
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Nashville",
      "state": "TN",
      "zipcode": "37210",
      "streetNumber": "118",
      "route": "Park S Ct.",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jonathan Ayers",
      "phoneNum": "615-244-8870",
      "coords": {
        "lat": 36.1270429,
        "lng": -86.73951579999999
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Columbia",
      "state": "SC",
      "zipcode": "29203",
      "streetNumber": "101",
      "route": "Sunbelt Blvd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jeremy Bohonko",
      "phoneNum": "980-254-5100",
      "coords": {
        "lat": 34.0680339,
        "lng": -81.0426233
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Sanford",
      "state": "FL",
      "zipcode": "32771",
      "streetNumber": "300",
      "route": "Hickman Dr",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Kevin Scott",
      "phoneNum": "407-462-8095",
      "coords": {
        "lat": 28.8193135,
        "lng": -81.330229
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Kissimmee",
      "state": "FL",
      "zipcode": "34744",
      "streetNumber": "1045",
      "route": "Garden St",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Kevin Scott",
      "phoneNum": "407-462-8095",
      "coords": {
        "lat": 28.3359455,
        "lng": -81.394497
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Charlotte",
      "state": "NC",
      "zipcode": "28269",
      "streetNumber": "6829",
      "route": "Statesville Rd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jeremy Bohonko",
      "phoneNum": "980-254-5100",
      "coords": {
        "lat": 35.3145085,
        "lng": -80.84084949999999
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Indian Trail",
      "state": "NC",
      "zipcode": "28079",
      "streetNumber": "211",
      "route": "Post Office Dr",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jeremy Bohonko",
      "phoneNum": "980-254-5100",
      "coords": {
        "lat": 35.0796195,
        "lng": -80.660133
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Charleston",
      "state": "SC",
      "zipcode": "29418",
      "streetNumber": "7281",
      "route": "Pepperdam Dr",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jeremy Bohonko",
      "phoneNum": "980-254-5100",
      "coords": {
        "lat": 32.9246477,
        "lng": -80.06510469999999
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Orlando",
      "state": "FL",
      "zipcode": "32805",
      "streetNumber": "3333",
      "route": "Old Winter Garden Rd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Kevin Scott",
      "phoneNum": "407-462-8095",
      "coords": {
        "lat": 28.5476135,
        "lng": -81.41875519999999
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Greer",
      "state": "SC",
      "zipcode": "29650",
      "streetNumber": "20",
      "route": "Concourse Way",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jeremy Bohonko",
      "phoneNum": "980-254-5100",
      "coords": {
        "lat": 34.8763613,
        "lng": -82.2283197
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Castle Hayne",
      "state": "NC",
      "zipcode": "28429",
      "streetNumber": "4805",
      "route": "Las Tortugas Dr",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jeremy Bohonko",
      "phoneNum": "980-254-5100",
      "coords": {
        "lat": 34.3480426,
        "lng": -77.8795573
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Apex",
      "state": "NC",
      "zipcode": "27523",
      "streetNumber": "1700",
      "route": "N Salem St",
      "aptSuite": "Suite A",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jeremy Bohonko",
      "phoneNum": "980-254-5100",
      "coords": {
        "lat": 35.7497451,
        "lng": -78.8470233
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Garner",
      "state": "NC",
      "zipcode": "27529",
      "streetNumber": "3609",
      "route": "Jones Sausage Rd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jeremy Bohonko",
      "phoneNum": "980-254-5100",
      "coords": {
        "lat": 35.7304696,
        "lng": -78.5761545
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Clearwater",
      "state": "FL",
      "zipcode": "33765",
      "streetNumber": "2040",
      "route": "Range Rd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Matt Phillippi",
      "phoneNum": "727-441-9530",
      "coords": {
        "lat": 27.979378,
        "lng": -82.753298
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Sarasota",
      "state": "FL",
      "zipcode": "34238",
      "streetNumber": "6235",
      "route": "McIntosh Rd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Kevin Scott",
      "phoneNum": "407-462-8095",
      "coords": {
        "lat": 27.263439,
        "lng": -82.48002
      }
    },
    {
      "name": "Ewing Irrigation & Landscape Supply",
      "locality": "Ft. Myers",
      "state": "FL",
      "zipcode": "33912",
      "streetNumber": "8091",
      "route": "Supply Dr",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Kevin Scott",
      "phoneNum": "407-462-8095",
      "coords": {
        "lat": 26.4955362,
        "lng": -81.8204294
      }
    },
    {
      "name": "Green-Resource",
      "locality": "Charlotte",
      "state": "NC",
      "zipcode": "28273",
      "streetNumber": "10404",
      "route": "Granite St",
      "aptSuite": "",
      "website": "www.green-resource.com",
      "salesRep": "Robert Herring ",
      "phoneNum": "336-215-5368",
      "coords": {
        "lat": 35.1270429,
        "lng": -80.9247184
      }
    },
    {
      "name": "Green-Resource",
      "locality": "Colfax",
      "state": "NC",
      "zipcode": "27235",
      "streetNumber": "5204",
      "route": "Highgreen Ct",
      "aptSuite": "",
      "website": "www.green-resource.com",
      "salesRep": "Robert Herring ",
      "phoneNum": "336-215-5368",
      "coords": {
        "lat": 36.0791631,
        "lng": -79.98162409999999
      }
    },
    {
      "name": "Green-Resource",
      "locality": "Garner",
      "state": "NC",
      "zipcode": "27529",
      "streetNumber": "1218",
      "route": "Management Way",
      "aptSuite": "",
      "website": "www.green-resource.com",
      "salesRep": "Robert Herring ",
      "phoneNum": "336-215-5368",
      "coords": {
        "lat": 35.6963267,
        "lng": -78.59337099999999
      }
    },
    {
      "name": "Pro Grounds Products",
      "locality": "Miami",
      "state": "FL",
      "zipcode": "33176",
      "streetNumber": "8834",
      "route": "SW 131st St",
      "aptSuite": "",
      "website": "www.progroundsproducts.com",
      "salesRep": "Todd Legassy",
      "phoneNum": "305-235-5101",
      "coords": {
        "lat": 25.6481525,
        "lng": -80.3376949
      }
    },
    {
      "name": "Southern Seeds",
      "locality": "Raleigh",
      "state": "NC",
      "zipcode": "27557",
      "streetNumber": "10680",
      "route": "E Finch AV",
      "aptSuite": "",
      "website": "www.southernseeds.com",
      "salesRep": "Chad Strickland",
      "phoneNum": "252-235-3111",
      "coords": {
        "lat": 35.7877589,
        "lng": -78.19092479999999
      }
    },
    {
      "name": "Turfnology",
      "locality": "Atlanta",
      "state": "GA",
      "zipcode": "30677",
      "streetNumber": "67",
      "route": "Depot St",
      "aptSuite": "",
      "website": "www.turfnology.com",
      "salesRep": "Frank Lopes",
      "phoneNum": "706-206-6270",
      "coords": {
        "lat": 33.7034115,
        "lng": -85.1877245
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Friendswood",
      "state": "TX",
      "zipcode": "77546",
      "streetNumber": "4319",
      "route": "FM 2351 Friendswood",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 29.5508846,
        "lng": -95.1823546
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Katy",
      "state": "TX",
      "zipcode": "77450",
      "streetNumber": "22403",
      "route": "Katy Frwy",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Greg Stafford",
      "phoneNum": "281-392-8111",
      "coords": {
        "lat": 29.7843575,
        "lng": -95.75977209999999
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Corpus Christi",
      "state": "TX",
      "zipcode": "78411",
      "streetNumber": "4141",
      "route": "Brett St",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Lee Wehring",
      "phoneNum": "361-814-9530",
      "coords": {
        "lat": 27.7191819,
        "lng": -97.3965302
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "San Marcos",
      "state": "TX",
      "zipcode": "78666",
      "streetNumber": "118",
      "route": "Hays Street",
      "aptSuite": "Suite 101",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 29.8651484,
        "lng": -97.939729
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Cedar Park",
      "state": "TX",
      "zipcode": "78613",
      "streetNumber": "1400",
      "route": "Cottonwood Creek Trl",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Ronnie Kammberger",
      "phoneNum": "512-260-9990",
      "coords": {
        "lat": 30.5342332,
        "lng": -97.8075223
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Brownsville",
      "state": "TX",
      "zipcode": "78526",
      "streetNumber": "5180",
      "route": "N Expressway Brownsville",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 25.9423915,
        "lng": -97.50380179999999
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Pheonix",
      "state": "AZ",
      "zipcode": "85033",
      "streetNumber": "7920",
      "route": "W Thomas Rd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 33.480341,
        "lng": -112.228482
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Dallas",
      "state": "TX",
      "zipcode": "75220",
      "streetNumber": "10525",
      "route": "Wire Way",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 32.8676793,
        "lng": -96.9053623
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "San Antonio",
      "state": "TX",
      "zipcode": "78249",
      "streetNumber": "5826",
      "route": "Hawk Springs ",
      "aptSuite": "Bldg 1",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 29.5608938,
        "lng": -98.5998778
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "El Paso",
      "state": "TX",
      "zipcode": "79905",
      "streetNumber": "3630",
      "route": "Duranzo Ave",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 31.776323,
        "lng": -106.4498535
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Edmond",
      "state": "OK",
      "zipcode": "73013",
      "streetNumber": "13831",
      "route": "N Lincoln Blvd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 35.6112967,
        "lng": -97.50539300000001
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Fort Worth",
      "state": "TX",
      "zipcode": "76133",
      "streetNumber": "7445",
      "route": "Hulen St",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Casey Strachan",
      "phoneNum": "817-370-460",
      "coords": {
        "lat": 32.6351255,
        "lng": -97.3910817
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "McAllen",
      "state": "TX",
      "zipcode": "78501",
      "streetNumber": "1312",
      "route": "E Upas Ave",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 26.2189617,
        "lng": -98.2022999
      }
    },
    {
      "name": "Gails Flags",
      "locality": "Fort Worth",
      "state": "TX",
      "zipcode": "76117",
      "streetNumber": "2821",
      "route": "Carson St",
      "aptSuite": "",
      "website": "www.gailsflags.com",
      "salesRep": "Dan Raulins",
      "phoneNum": "817-831-4505",
      "coords": {
        "lat": 32.8031907,
        "lng": -97.2563093
      }
    },
    {
      "name": "Simplot Partners",
      "locality": "Tempe",
      "state": "AZ",
      "zipcode": "85281",
      "streetNumber": "2301",
      "route": "2405 W University Dr",
      "aptSuite": "",
      "website": "www.simplot.com",
      "salesRep": "Brad Bird",
      "phoneNum": "480-519-6012",
      "coords": {
        "lat": 33.42144580000001,
        "lng": -111.9751139
      }
    },
    {
      "name": "Simplot Partners",
      "locality": "Oklahoma City",
      "state": "OK",
      "zipcode": "73127",
      "streetNumber": "5201",
      "route": "Reno Ave Ste E",
      "aptSuite": "",
      "website": "www.simplot.com",
      "salesRep": "Ken Carlton",
      "phoneNum": "405-201-3180",
      "coords": {
        "lat": 35.4650248,
        "lng": -97.6106549
      }
    },
    {
      "name": "Texas Mult-Chem",
      "locality": "Kerrville",
      "state": "TX",
      "zipcode": "78028",
      "streetNumber": "305",
      "route": "Mill Run ",
      "aptSuite": "",
      "website": "www.texasmultichem.com",
      "salesRep": "Blake Caraway",
      "phoneNum": "(800) 292-1214",
      "coords": {
        "lat": 30.0744628,
        "lng": -99.1986017
      }
    },
    {
      "name": "Unlimited Sporrts Solutions",
      "locality": "Waverly",
      "state": "NE",
      "zipcode": "68462",
      "streetNumber": "14650",
      "route": "Woodstock Blvd",
      "aptSuite": "",
      "website": "www.unlimitedsportssolutions.com",
      "salesRep": "Mike Estlinbaum",
      "phoneNum": "979-240-1185",
      "coords": {
        "lat": 40.9209095,
        "lng": -96.5223535
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Glenwood Springs",
      "state": "CO",
      "zipcode": "81601",
      "streetNumber": "5311",
      "route": "Co Rd",
      "aptSuite": "154 Unit A",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 970-945-9362",
      "coords": {
        "lat": 39.4736678,
        "lng": -107.2733355
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Colorado Springs",
      "state": "CO",
      "zipcode": "80915",
      "streetNumber": "6020",
      "route": "Galley Rd",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 719-574-2400",
      "coords": {
        "lat": 38.8465616,
        "lng": -104.7142541
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Centennial",
      "state": "CO",
      "zipcode": "80112",
      "streetNumber": "7250",
      "route": "S Frasier St",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 720-870-9933 ",
      "coords": {
        "lat": 39.5856904,
        "lng": -104.8123573
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Englewood",
      "state": "CO",
      "zipcode": "80110",
      "streetNumber": "4501",
      "route": "S Navajo St",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 303-730-7310",
      "coords": {
        "lat": 39.6347214,
        "lng": -105.004904
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Aurora",
      "state": "CO",
      "zipcode": "80011",
      "streetNumber": "15556",
      "route": "E 17th Ave",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 303-261-1360",
      "coords": {
        "lat": 39.7433664,
        "lng": -104.8074789
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Lakewood",
      "state": "CO",
      "zipcode": "80215",
      "streetNumber": "11494",
      "route": "W 8th Ave",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 303-237-5042",
      "coords": {
        "lat": 39.7287423,
        "lng": -105.1264437
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Arvada",
      "state": "CO",
      "zipcode": "80002",
      "streetNumber": "5601",
      "route": "Gray St",
      "aptSuite": "Unit B",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 720-456-6703",
      "coords": {
        "lat": 39.7986766,
        "lng": -105.0625911
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Westminster",
      "state": "CO",
      "zipcode": "80234",
      "streetNumber": "1105",
      "route": "W 122nd Ave",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 303-394-6040",
      "coords": {
        "lat": 39.9184192,
        "lng": -105.0004068
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Boulder",
      "state": "CO",
      "zipcode": "80301",
      "streetNumber": "5700",
      "route": "Valmont Rd",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 303-442-7975",
      "coords": {
        "lat": 40.0286094,
        "lng": -105.2213617
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Longmont",
      "state": "CO",
      "zipcode": "80501",
      "streetNumber": "1841",
      "route": "Boston Ave",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 303-651-9512",
      "coords": {
        "lat": 40.1584194,
        "lng": -105.1242966
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Fort Collins",
      "state": "CO",
      "zipcode": "80524",
      "streetNumber": "207",
      "route": "N Timberline Rd",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "720-318-5749",
      "coords": {
        "lat": 40.5891731,
        "lng": -105.0300667
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "South Denver",
      "state": "CO",
      "zipcode": "80231",
      "streetNumber": "7660",
      "route": "E Jewell Ave",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 720-640-2550",
      "coords": {
        "lat": 39.6817318,
        "lng": -104.8996481
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "North Colorado Springs",
      "state": "CO",
      "zipcode": "80918",
      "streetNumber": "4710",
      "route": "Northpark Dr",
      "aptSuite": "Suite 110",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 719-283-7555",
      "coords": {
        "lat": 38.9001592,
        "lng": -104.82786
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Cheyenne",
      "state": "WY",
      "zipcode": "82001",
      "streetNumber": "1001`",
      "route": "Dunn Ave",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 307-637-6040",
      "coords": {
        "lat": 41.134084,
        "lng": -104.7950782
      }
    },
    {
      "name": "CPS Distributors Inc",
      "locality": "Grand Junction",
      "state": "CO",
      "zipcode": "81501",
      "streetNumber": "240",
      "route": "North Ave",
      "aptSuite": "",
      "website": "https://cpsdistributors.com/",
      "salesRep": "Jim Mueller",
      "phoneNum": "JM: 720-318-5749 or LOC: 970-241-8480",
      "coords": {
        "lat": 39.0778179,
        "lng": -108.5684866
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "San Jose",
      "state": "CA",
      "zipcode": "95112",
      "streetNumber": "1605",
      "route": "Old Bayshore Hwy",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 37.3677882,
        "lng": -121.9052631
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "San Louis Obispo",
      "state": "CA",
      "zipcode": "93401",
      "streetNumber": "1175",
      "route": "Prospect St",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 35.2350764,
        "lng": -120.6296073
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Santa Clarita",
      "state": "CA",
      "zipcode": "91355",
      "streetNumber": "27726",
      "route": "Avenue Hopkins",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "916-502-3287",
      "coords": {
        "lat": 34.4328001,
        "lng": -118.5737341
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "San Leandro",
      "state": "CA",
      "zipcode": "94577",
      "streetNumber": "24577",
      "route": "Polvorosa Ave",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "916-502-3287",
      "coords": {
        "lat": 37.7099321,
        "lng": -122.1868767
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Sacramento",
      "state": "CA",
      "zipcode": "95811",
      "streetNumber": "345",
      "route": "Richards Blvd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "916-502-3287",
      "coords": {
        "lat": 38.5976805,
        "lng": -121.4987859
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Las Vegas",
      "state": "NV",
      "zipcode": "89103",
      "streetNumber": "4705",
      "route": "S Valley View",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-245-8456",
      "coords": {
        "lat": 36.1042587,
        "lng": -115.1904907
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Chatsworth",
      "state": "CA",
      "zipcode": "91311",
      "streetNumber": "21101",
      "route": "Superior St",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Edgar Lomeli",
      "phoneNum": "818-882-9530",
      "coords": {
        "lat": 34.2466315,
        "lng": -118.593202
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Tacoma",
      "state": "WA",
      "zipcode": "98409",
      "streetNumber": "2901",
      "route": "S Tacoma Way",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 47.2300056,
        "lng": -122.4738714
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Kirkland",
      "state": "WA",
      "zipcode": "98033",
      "streetNumber": "815",
      "route": "8th St Kirkland",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 47.6819926,
        "lng": -122.1937017
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Visalia",
      "state": "CA",
      "zipcode": "93291",
      "streetNumber": "9443",
      "route": "W Goshen",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Walt Cubas",
      "phoneNum": "559-651-0282",
      "coords": {
        "lat": 36.3415852,
        "lng": -119.3965729
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Tigard",
      "state": "OR",
      "zipcode": "97223",
      "streetNumber": "10600",
      "route": "SW Cascade Ave",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 45.44327879999999,
        "lng": -122.7806313
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Salem",
      "state": "OR",
      "zipcode": "97301",
      "streetNumber": "3475",
      "route": "Pipe Band Pl",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 44.928269,
        "lng": -122.9910358
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Redding",
      "state": "CA",
      "zipcode": "96003",
      "streetNumber": "3015",
      "route": "Crossroads Dr",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Brian Dixon",
      "phoneNum": "530-222-9530",
      "coords": {
        "lat": 40.5636963,
        "lng": -122.2972717
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Bakersfield",
      "state": "CA",
      "zipcode": "93308",
      "streetNumber": "3201",
      "route": "Sillect Ave",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Tristian Martina",
      "phoneNum": "661-323-9530",
      "coords": {
        "lat": 35.3892001,
        "lng": -119.0379998
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Seattle",
      "state": "WA",
      "zipcode": "98108",
      "streetNumber": "751",
      "route": "S Michigan St",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 47.5464783,
        "lng": -122.3244168
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Pasco",
      "state": "WA",
      "zipcode": "99301",
      "streetNumber": "1625",
      "route": "E James St",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 46.2490855,
        "lng": -119.0812591
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "El Cajon",
      "state": "CA",
      "zipcode": "92020",
      "streetNumber": "1923",
      "route": " John Towers",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Chris Gordan",
      "phoneNum": "619-562-3300",
      "coords": {
        "lat": 32.8233634,
        "lng": -116.9800453
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Midvale",
      "state": "UT",
      "zipcode": "84047",
      "streetNumber": "6849",
      "route": "S 300 W Midvale",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Brad Mecham",
      "phoneNum": "801-566-4446",
      "coords": {
        "lat": 40.6268739,
        "lng": -111.8991977
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Orem",
      "state": "UT",
      "zipcode": "84057",
      "streetNumber": "712",
      "route": "N Blvd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Dustin Quarnberg",
      "phoneNum": "801-222-0777",
      "coords": {
        "lat": 40.3105448,
        "lng": -111.7029852
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Hayward",
      "state": "CA",
      "zipcode": "94544",
      "streetNumber": "30928",
      "route": "San Antonio",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "916-502-3287",
      "coords": {
        "lat": 37.613752,
        "lng": -122.0477874
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Sparks",
      "state": "NV",
      "zipcode": "89431",
      "streetNumber": "1643",
      "route": "Greg Ct",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "916-502-3287",
      "coords": {
        "lat": 39.5224224,
        "lng": -119.7648004
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Clovis",
      "state": "CA",
      "zipcode": "93611",
      "streetNumber": "1599",
      "route": "Menlo Ave",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Aaron Kelly",
      "phoneNum": "559-298-4440",
      "coords": {
        "lat": 36.8316151,
        "lng": -119.6867633
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Corona",
      "state": "CA",
      "zipcode": "92879",
      "streetNumber": "3940",
      "route": "N McKinley St",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 33.8832806,
        "lng": -117.5162868
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Poway",
      "state": "CA",
      "zipcode": "92064",
      "streetNumber": "12270",
      "route": "Oak Knoll Rd",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "602-284-8274",
      "coords": {
        "lat": 32.9505745,
        "lng": -117.0652722
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Lehi",
      "state": "UT",
      "zipcode": "84043",
      "streetNumber": "305",
      "route": "S 850 East ",
      "aptSuite": "Unit 106B",
      "website": "www.ewingirrigation.com",
      "salesRep": "Jim Barbuto",
      "phoneNum": "916-502-3287",
      "coords": {
        "lat": 40.384176,
        "lng": -111.8341285
      }
    },
    {
      "name": "Ewing Irrigation & Landscape ",
      "locality": "Chico",
      "state": "CA",
      "zipcode": "95973",
      "streetNumber": "163",
      "route": "Commercial Ave",
      "aptSuite": "",
      "website": "www.ewingirrigation.com",
      "salesRep": "Gary Wheeler",
      "phoneNum": "530-894-5900",
      "coords": {
        "lat": 39.7681225,
        "lng": -121.8708887
      }
    },
    {
      "name": "Netex Sports Netting",
      "locality": "Delta",
      "state": "BC",
      "zipcode": "V4K 0B4",
      "streetNumber": "7500",
      "route": "Ottawa St",
      "aptSuite": "#102",
      "website": "www.netexnetting.com",
      "salesRep": "Kassandra Wilson",
      "phoneNum": "604-946-8679",
      "coords": {
        "lat": 49.0812967,
        "lng": -123.0164151
      }
    },
    {
      "name": "Simplot Partners",
      "locality": "Fullerton",
      "state": "CA",
      "zipcode": "92831",
      "streetNumber": "2300",
      "route": "E Valencia Dr",
      "aptSuite": "",
      "website": "www.simplot.com",
      "salesRep": "Paul Wizikowski",
      "phoneNum": "714-686-7493",
      "coords": {
        "lat": 33.8664203,
        "lng": -117.8924477
      }
    },
    {
      "name": "Simplot Partners",
      "locality": "San Siego",
      "state": "CA",
      "zipcode": "92121",
      "streetNumber": "6160",
      "route": "Marindustry Dr",
      "aptSuite": "",
      "website": "www.simplot.com",
      "salesRep": "Pat Reilly",
      "phoneNum": "541-279-1009",
      "coords": {
        "lat": 32.8804777,
        "lng": -117.1811588
      }
    },
    {
      "name": "Simplot Partners",
      "locality": "Portland",
      "state": "OR",
      "zipcode": "97220",
      "streetNumber": "11600",
      "route": "NE Marx St",
      "aptSuite": "",
      "website": "www.simplot.com",
      "salesRep": "Sean Watts",
      "phoneNum": "503-319-9225",
      "coords": {
        "lat": 45.5593992,
        "lng": -122.5429123
      }
    },
    {
      "name": "Simplot Partners",
      "locality": "Hubbard",
      "state": "OR",
      "zipcode": "97032",
      "streetNumber": "2655",
      "route": "Pacific Hwy",
      "aptSuite": "",
      "website": "www.simplot.com",
      "salesRep": "Sean Watts",
      "phoneNum": "503-319-9225",
      "coords": {
        "lat": 45.1762787,
        "lng": -122.8101824
      }
    },
    {
      "name": "Simplot Partners",
      "locality": "Tacoma",
      "state": "WA",
      "zipcode": "97220",
      "streetNumber": "1805",
      "route": "Smeed Pkwy",
      "aptSuite": "#101",
      "website": "www.simplot.com",
      "salesRep": "Erik Boley",
      "phoneNum": "971-219-9959",
      "coords": {
        "lat": 43.6542877,
        "lng": -116.6429368
      }
    },
    {
      "name": "Simplot Partners",
      "locality": "Denver",
      "state": "CO",
      "zipcode": "80216",
      "streetNumber": "4195",
      "route": "Oneida St h",
      "aptSuite": "",
      "website": "www.simplot.com",
      "salesRep": "Denton Kurtz",
      "phoneNum": "866-437-5727",
      "coords": {
        "lat": 39.7739829,
        "lng": -104.9094148
      }
    },
    {
      "name": "Simplot Partners",
      "locality": "Las Vegas",
      "state": "NV",
      "zipcode": "89118",
      "streetNumber": "3555",
      "route": "W Reno Ave",
      "aptSuite": "Suite K",
      "website": "www.simplot.com",
      "salesRep": "Dominic Jiron",
      "phoneNum": "702-210-6815",
      "coords": {
        "lat": 36.09641209999999,
        "lng": -115.1871559
      }
    },
    {
      "name": "TMT Enterprises",
      "locality": "San Jose",
      "state": "CA",
      "zipcode": "95131",
      "streetNumber": "1996",
      "route": "Old Oakland Rd",
      "aptSuite": "",
      "website": "www.tmtenterprises.net/products.php",
      "salesRep": "Matt Moore",
      "phoneNum": "408-432-9040",
      "coords": {
        "lat": 37.3920847,
        "lng": -121.9008396
      }
    },
    {
      "name": "\"Site One Erlanger",
      "locality": "Southwest Ohio",
      "state": "Erlanger ",
      "zipcode": "KY",
      "streetNumber": "41018",
      "route": "3635",
      "aptSuite": "Ohara Rd",
      "website": "",
      "salesRep": "Midwest",
      "phoneNum": "Bradley Dennis",
      "coords": {
        "lat": 39.0286481,
        "lng": -84.6122463
      }
    },
    {
      "name": "\"Site One Ft. Wayne",
      "locality": "Ft. Wayne",
      "state": "Ft. Wayne",
      "zipcode": "IN",
      "streetNumber": "46818",
      "route": "6250",
      "aptSuite": "Cross Creek Blvd",
      "website": "",
      "salesRep": "Midwest",
      "phoneNum": "Brantley Farris",
      "coords": {
        "lat": 41.1301273,
        "lng": -85.1627484
      }
    },
    {
      "name": "\"Site One Noblesville",
      "locality": "Noblesville",
      "state": "Noblesville",
      "zipcode": "IN",
      "streetNumber": "46062",
      "route": "20238",
      "aptSuite": "Hague Rd",
      "website": "",
      "salesRep": "Midwest",
      "phoneNum": "Greg Piehl",
      "coords": {
        "lat": 40.082199,
        "lng": -86.0323867
      }
    },
    {
      "name": "\"Site One Pleasant Valley",
      "locality": "Plesantvalley",
      "state": "Plesant Valley ",
      "zipcode": "MO",
      "streetNumber": "64068",
      "route": "6609",
      "aptSuite": "Royal St",
      "website": "",
      "salesRep": "Midwest",
      "phoneNum": "Rod Madison",
      "coords": {
        "lat": 39.2163742,
        "lng": -94.4794708
      }
    },
    {
      "name": "\"Site One Orange",
      "locality": "Southern California",
      "state": "Orange",
      "zipcode": "CA",
      "streetNumber": "92868",
      "route": "610",
      "aptSuite": "North Batavia St.",
      "website": "",
      "salesRep": "West",
      "phoneNum": "Michael Romero",
      "coords": {
        "lat": 33.7799946,
        "lng": -117.863283
      }
    },
    {
      "name": "\"Site One Phoenix",
      "locality": "Phoenix",
      "state": "Phoenix",
      "zipcode": "AZ",
      "streetNumber": "85027",
      "route": "22010",
      "aptSuite": "N 21st Ave",
      "website": "",
      "salesRep": "West",
      "phoneNum": "Sonny Lopes Jr",
      "coords": {
        "lat": 33.686049,
        "lng": -112.104598
      }
    }
  ];
}

function readStaticBulkDataJSON() {
  return [
    {
      "name": "DuraEdge Andover",
      "locality": "Andover",
      "streetNumber": "50",
      "route": "Airport Rd",
      "state": "NJ",
      "zipcode": "07821",
      "rep": "Patrick Coakley",
      "phoneNum": "724-870-4625",
      "email": "pcoakley@duraedge.com",
      "coords": {
        "lat": 40.9614139,
        "lng": -74.78493759999999
      }
    },
    {
      "name": "DuraEdge Farmington",
      "locality": "Farmington",
      "streetNumber": "105",
      "route": "Brickyard Rd",
      "state": "CT",
      "zipcode": "06032",
      "rep": "Greg Frederick",
      "phoneNum": "724-870-4480",
      "email": "gfrederick@duraedge.com",
      "coords": {
        "lat": 41.7477606,
        "lng": -72.8538326
      }
    },
    {
      "name": "DuraEdge Granite City",
      "locality": "Granite City",
      "streetNumber": "480",
      "route": "Bissel St",
      "state": "IL",
      "zipcode": "62040",
      "rep": "Coby Schmucker",
      "phoneNum": "724-870-4425",
      "email": "cschmucker@duraedge.com",
      "coords": {
        "lat": 38.6810557,
        "lng": -90.17645929999999
      }
    },
    {
      "name": "DuraEdge Hudson",
      "locality": "Hudson",
      "streetNumber": "393",
      "route": "South Meridian Rd",
      "state": "MI",
      "zipcode": "49247",
      "rep": "Coby Schmucker",
      "phoneNum": "724-870-4425",
      "email": "cschmucker@duraedge.com",
      "coords": {
        "lat": 41.870382,
        "lng": -84.36125299999999
      }
    },
    {
      "name": "DuraEdge Milan",
      "locality": "Rock Island",
      "streetNumber": "8000",
      "route": "31 St West",
      "state": "IL",
      "zipcode": "61264",
      "rep": "Jon Brinkerhoff",
      "phoneNum": "724-870-4425",
      "email": "jbrinkerhoff@duraedge.com",
      "coords": {
        "lat": 41.44143090000001,
        "lng": -90.61146099999999
      }
    },
    {
      "name": "DuraEdge Ogden",
      "locality": "Ogden",
      "streetNumber": "1070",
      "route": "Century Dr",
      "state": "UT",
      "zipcode": "84403",
      "rep": "Jamie Farquhar",
      "phoneNum": "724-870-4375",
      "email": "jfarquhar@duraedge.com",
      "coords": {
        "lat": 41.2460826,
        "lng": -111.9879035
      }
    },
    {
      "name": "DuraEdge Slippery Rock",
      "locality": "Slippery Rock",
      "streetNumber": "4783",
      "route": "Harlansburg Rd",
      "state": "PA",
      "zipcode": "16057",
      "rep": "Jacob Anderson",
      "phoneNum": "724-870-4250",
      "email": "janderson@duraedge.com",
      "coords": {
        "lat": 41.0350149,
        "lng": -80.14403589999999
      }
    },
    {
      "name": "DuraEdge Wrentham",
      "locality": "Wrentham",
      "streetNumber": "35",
      "route": "Cushing Dr",
      "state": "MA",
      "zipcode": "02093",
      "rep": "Greg Frederick",
      "phoneNum": "724-870-4480",
      "email": "gfrederick@duraedge.com",
      "coords": {
        "lat": 42.0846726,
        "lng": -71.29878889999999
      }
    },
    {
      "name": "DuraEdge Vero Beach",
      "locality": "Vero Beach",
      "streetNumber": "3505",
      "route": "65th St",
      "state": "FL",
      "zipcode": "32960",
      "rep": "Mike Viersma",
      "phoneNum": "724-870-4445",
      "email": "mviersma@duraedge.com",
      "coords": {
        "lat": 27.7110099,
        "lng": -80.42200280000002
      }
    },
    {
      "name": "DuraEdge Phoenix",
      "locality": "Glendale",
      "streetNumber": "7243",
      "route": "N. El Mirage Rd",
      "state": "AZ",
      "zipcode": "85307",
      "rep": "Eric Godfrey",
      "phoneNum": "724-870-4828",
      "email": "djennings@duraedge.com",
      "coords": {
        "lat": 33.541079,
        "lng": -112.3236366
      }
    }
  ]
}
