window.onload = loadLocationsFromCSV;

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

async function loadLocationsFromJSON() {
  window.locations = [];
  const res = await fetch('../data/MasterLocations.json', {mode: 'no-cors'});
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

// returns the latitiude and longitude from a street address
async function getLatLongFromAddress(streetNumber, route, locality, state) {
  // https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${streetNumber}+${route.replace(/ /g, '+')},+${locality.replace(/ /g, '+')},+${state}&key=AIzaSyAv_Tqy8l-X1k1fue0hggJ0orxoJQqz2mw`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results[0].geometry.location;
}

function swap(data, x, y) {
  let temp = data[x];
  data[x] = data[y];
  data[y] = temp;
}

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

function quickSort(currentCoords, data, low, high) {
  if(low < high) {
    let pi = partition(currentCoords, data, low, high);

    quickSort(currentCoords, data, low, pi-1);
    quickSort(currentCoords, data, pi+1, high);
  }
}

function testSort() {
  let nums = [4, 10, 7, 11, 2, 9, 6, 5, 8];
  quickSort(nums, 0, nums.length-1);
  console.log(nums);
}

// gets coordinates and goes to map location when locate button is clicked
async function onLocateByZip() {
  const zip = document.getElementById('zip-input').value;
  const currentLocationCoords = await getLatLongFromZip(zip);
  const locationsData = window.locations;
  quickSort(currentLocationCoords, locationsData, 0, locationsData.length-1);
  gotoLocations(locationsData);
  clearLocations();
  displayLocations(locationsData);
  const map = document.getElementById('map');
  map.scrollIntoView();
}

function onLocateByGeoLocation() {
  let geoSuccess = (position) => {
    const currentLocationCoords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    const locationsData = window.locations;
    quickSort(currentLocationCoords, locationsData, 0, locationsData.length-1);
    gotoLocations(locationsData);
    clearLocations();
    displayLocations(locationsData);
    const map = document.getElementById('map');
    map.scrollIntoView();
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

function displayLocations(locations) {
  const locationOptions = document.getElementById('location-options');
  for(let i = 0; i < 5; i++) {
    const locationCard = generateLocationCard(locations[i]);
    locationOptions.appendChild(locationCard);
  }
}

function clearLocations() {
  const locationOptions = document.getElementById('location-options');
  while(locationOptions.lastChild) {
    locationOptions.removeChild(locationOptions.lastChild);
  }
}

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

// test function only
function testDistance() {
  const coords1 = {
    lat1: 40.4465039,
    lon1: -75.8824422
  }
  const coords2 = {
    lat2: 41.0330673,
    lon2: -80.0758425
  }
  const distanceKilos = getDistanceFromLatLonInKm(coords1, coords2);
  console.log(distanceKilos);
}
// test function only
async function testAddress() {
  const address = {
    streetNumber: 1600,
    route: 'Amphiteatre Parkway',
    locality: 'Mountain View',
    state: 'CA'
  };
  const location = await getLatLongFromAddress(address);
  console.log(location);
}
// test function only
function testFileRead() {
  const data = readDataJSON();
  console.log(data);
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
