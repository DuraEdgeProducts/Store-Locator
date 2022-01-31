const fs = require('fs');
const fetch = require('node-fetch');
const data = fs.readFileSync('../public/data/MasterLocations.csv', 'utf8');
const locationData = data.split('\n');
const locations = [];

function initLocations() {
  for(let i = 1; i < locationData.length; i++) {
    const storeInfo = locationData[i].split(',');
    const location = {
      name: storeInfo[0],
      locality: storeInfo[2],
      state: storeInfo[3],
      zipcode: storeInfo[4],
      streetNumber: storeInfo[5],
      route: storeInfo[6],
      aptSuite: storeInfo[7],
      website: storeInfo[8],
      phoneNum: storeInfo[11],
      coords: {
        lat: 0,
        lng: 0
      }
    };
    locations.push(location);
  }
  console.log(locations.length);
}

async function getLatLongFromAddress(streetNumber, route, locality, state, index) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${streetNumber}+${route.replace(/ /g, '+')},+${locality.replace(/ /g, '+')},+${state}&key=AIzaSyAv_Tqy8l-X1k1fue0hggJ0orxoJQqz2mw`;
  const res = await fetch(url);
  const data = await res.json();
  try {
    locations[index].coords = data.results[0].geometry.location;
  } catch(e) {
    console.log('Locating geometry failed');
  }
}

async function generateLocationCoords() {
  for(let i = 0; i < locations.length-1; i++) {
    await getLatLongFromAddress(locations[i].streetNumber, locations[i].route, locations[i].locality, locations[i].state, i);
    console.log('location: ' + i);
  }
  fs.writeFileSync('../public/data/MasterLocations.json', JSON.stringify(locations), {flag: 'a+'}, err => {console.log(err)});
}

initLocations();
generateLocationCoords();
