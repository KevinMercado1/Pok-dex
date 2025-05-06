const express = require('express');
const app = express();
const path = require('path');

// get the port from env variable
const PORT = process.env.PORT || 3000;

app.use(express.static('build'));

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/health', (req, res) => {
  res.send('ok');
});
