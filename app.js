const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static('dist'));

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});

app.get('/health', (req, res) => {
  res.send('ok');
});
