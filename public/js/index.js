/*
  Author: Adam Poper
  Organization: DuraEdge Products, Inc.
  Name of File: index.js
  Purpose: this file contains all the algorithms and data processing functionality for the store locator application
*/

// load all the locations from the files on app start-up
window.onload = loadLocationsFromJSON;

const StoreType = {
  Store: 'store',
  Bulk: 'bulk'
}

// loads the data from json files called MasterLocations.json and BulkProductLocations.json which can be generated using the file-converter app
// this is much faster because there are no calls to the google maps api when the app loads

async function loadLocationsFromJSON() {
  window.storeLocations = [];
  window.bulkLocations = [];
  fetch('./data/MasterLocations.json').then(res => res.json()).then(data => {window.storeLocations = data}).catch(err => console.error(err));
  fetch('./data/BulkProductLocations.json').then(res => res.json()).then(data => {window.bulkLocations = data}).catch(err => console.error(err));
}

// callback function for initiating the map
function initMap() {
  let mapProp = {
    center: new google.maps.LatLng(40.730610,-73.935242),
    zoom: 8
  };
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
    if(distance < pivotDistance) {
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
      const locationsData = window.storeLocations;
      quickSort(currentLocationCoords, locationsData, 0, locationsData.length-1);
      gotoLocations(locationsData);
      clearLocations();
      displayLocations(locationsData);
      const map = document.getElementById('map');
      map.scrollIntoView();
    }
    break;
    case StoreType.Bulk: {
      const locationsData = window.bulkLocations;
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
        const locationsData = window.storeLocations;
        quickSort(currentLocationCoords, locationsData, 0, locationsData.length-1);
        gotoLocations(locationsData);
        clearLocations();
        displayLocations(locationsData);
        const map = document.getElementById('map');
        map.scrollIntoView();
      }
      break;
      case StoreType.Bulk: {
        const locationsData = window.bulkLocations;
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
  rep.textContent = location.salesRep;
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
