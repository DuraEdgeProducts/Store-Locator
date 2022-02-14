window.onload = loadDataJSON;

async function loadDataJSON() {
  window.zipCodeLookupData = [];
  const res = await fetch('./data/ZipCodeAccountManagerLookup.json');
  const data = await res.json();
  window.zipCodeLookupData = data;
  console.log(window.zipCodeLookupData);
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
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({location}).then(response => {
      console.log(results[0]);
    });
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
