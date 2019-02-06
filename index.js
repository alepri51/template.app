require('dotenv').config({
    path: '.env.local'
});

const express = require('express');
const app = express();

const { Router } = require('template.api');

const Classes = require('./classes');

const router = Router({ Classes });

app.use('/api', router);

app.listen(8001, function () {
  console.log('Example app listening on port 8001!');
});