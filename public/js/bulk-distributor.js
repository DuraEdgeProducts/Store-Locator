/*
  Author: Adam Poper
  Organization: DuraEdge Products Inc.
  Date: 3/4/22
  File: bulk-distributor.js
  Purpose: This file contains all the functionality of the bulk-product Representative lookup app.
*/

// load all the data
window.onload = loadDataJSON;

// read the data from the file
async function loadDataJSON() {
  window.zipCodeLookupData = [];
  fetch('https://duraedge.com/storelocator/data/ZipCodeAccountManagerLookup.json', {mode: 'no-cors'})
  .then(res => res.json()).then(data => {window.zipCodeLookupData = data;})
  .catch(err => console.error(err));
}

// performs a linear search for the rep information with a given zip code
function lookupZip(zipcode) {
  let found = false;
  window.zipCodeLookupData.forEach((item, i) => {
    if(zipcode == item.zipcode) {
      found = true;
      clearInfo();
      const infoCard = document.getElementById('bulk-product-info');
      infoCard.appendChild(generateNearestDistributorInfo(item));
      return; // end the loop when the zipcode has been found
    }
  });
  if(!found) { // if the zipcode was not found
    alert('Please Enter a Valid Zip Code');
  }
}

// when the user wishes to locate by a zip code
function onLocateByZip() {
  const zipcode = document.getElementById('zip-input').value;
  lookupZip(zipcode);
}

// when the user wishes to locate by their current location
function onLocateByGeoLocation() {
  let geoSuccess = (position) => {
    const location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    // https://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&key=YOUR_API_KEY
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=AIzaSyAh69RpB2N11xzoK36ybSv3K6dwpWPgjRc`)
    .then(res => res.json())
    .then(data => {
      const zipcode = data.results[0].address_components[6].short_name; // zipcode
      lookupZip(zipcode);
    })
    .catch(err => console.error(err));
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

// generate the html to display the information and returns its container
function generateNearestDistributorInfo(info) {
  const container = document.createElement('div');
  container.className = 'nearest-distributor-card';
  const name = document.createElement('h2');
  name.textContent = info.accountManager;
  const email = document.createElement('p');
  email.textContent = info.email;
  const phoneNumber = document.createElement('p');
  phoneNumber.textContent = info.phone;
  container.appendChild(name);
  container.appendChild(email);
  container.appendChild(phoneNumber);
  return container;
}

// clear what's currently present on the screen to prepare for the next look up
function clearInfo() {
  const nearestBulkLocation = document.getElementById('bulk-product-info');
  if(nearestBulkLocation.lastChild)
    nearestBulkLocation.removeChild(nearestBulkLocation.lastChild);
}
