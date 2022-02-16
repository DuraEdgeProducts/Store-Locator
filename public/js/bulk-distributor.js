window.onload = loadDataJSON;

async function loadDataJSON() {
  window.zipCodeLookupData = [];
  const res = await fetch('./data/ZipCodeAccountManagerLookup.json');
  const data = await res.json();
  window.zipCodeLookupData = data;
  console.log(window.zipCodeLookupData);
}

function lookupZip(zipcode) {
  window.zipCodeLookupData.forEach((item, i) => {
    if(zipcode == item.zipcode) {
      console.log('Found: ' + JSON.stringify(item));
      clearInfo();
      const infoCard = document.getElementById('bulk-product-info');
      infoCard.appendChild(generateNearestDistributorInfo(item));
      return;
    }
  });
}

function onLocateByZip() {
  const zipcode = document.getElementById('zip-input').value;
  console.log('Zip Code: ' + zipcode);
  let found = false;
  window.zipCodeLookupData.forEach((item, i) => {
    if(zipcode == item.zipcode) {
      found = true;
      console.log('Found: ' + JSON.stringify(item));
      clearInfo();
      const infoCard = document.getElementById('bulk-product-info');
      infoCard.appendChild(generateNearestDistributorInfo(item));
    }
  });
  if(!found) {
    alert('Please Enter a Valid Zip Code');
  }
}

function onLocateByGeoLocation() {
  let geoSuccess = (position) => {
    const location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    // https://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&key=YOUR_API_KEY
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=AIzaSyAv_Tqy8l-X1k1fue0hggJ0orxoJQqz2mw`)
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

function generateNearestDistributorInfo(info) {
  const container = document.createElement('div');
  container.className = 'nearest-distributor-card';
  const name = document.createElement('h1');
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

function clearInfo() {
  const nearestBulkLocation = document.getElementById('bulk-product-info');
  if(nearestBulkLocation.lastChild)
    nearestBulkLocation.removeChild(nearestBulkLocation.lastChild);
}
