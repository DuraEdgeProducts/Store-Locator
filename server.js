const express = require('express');

const app = express();

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

app.use(express.static('public'));
app.get('/bulk-product-distributor', (req, res) => {
  res.sendFile(__dirname + '/public/bulk-product.html');
});

app.get('/data/zipcodeaccountmanagerlookup.json', (req, res) => {
  res.sendFile(__dirname + '/public/ZipCodeAccountManagerLookup.json');
});

app.get('/websiteoptimized', (req, res) => {
  res.sendFile(__dirname + '/public/websitestorelocator.html');
});
