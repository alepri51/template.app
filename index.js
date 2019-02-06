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

    const axios = require('axios');
    (async() => {

        /* for(let i = 1; i <= 100; i++) {
            let response = await axios.get('http://localhost:8001/api/custom.get').catch(err => console.error(i, err));
            response && console.info(i, response.data);
            //await sleep(97);
        } */
    })();
});

const sleep = (ms = 1000) => new Promise(resolve => {
    setTimeout(() => resolve(200), ms);
})

