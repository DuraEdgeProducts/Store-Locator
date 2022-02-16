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
