require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const routes = require('./router');

app.use(cors({
  origin: 'http://localhost:4200', // client Angular
  credentials: true
}));

app.use(express.json());

app.use('/api', routes);

app.listen(3000, () => {
  console.log('Server in ascolto su http://localhost:3000');
});
