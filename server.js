const express = require('express');

const debug = require('debug')('app:server');
// populate process.env with values from .env file
require("dotenv").config();
const { initializeRedisClient } = require('./middlewares/redis');
const { redisCacheMiddleware } = require('./middlewares/redis');

// route files
const fiveG_Route = require('./routes/fiveG');
const tvws_Route = require('./routes/tvws');
const equipment_Route = require('./routes/equipment');
const licenses_Route = require('./routes/licenses');

async function initializeExpressServer() {
    // initialize an Express application
    const app = express();
    app.use(express.json());

    // connect to Redis server
    await initializeRedisClient();

    // Mount routers
    app.use('/fiveG', redisCacheMiddleware({
        options: {
          EX: 43200, // 12h
          NX: false, // write the data even if the key already exists
        },
      }), fiveG_Route); // path to the file
    app.use('/tvws', redisCacheMiddleware({
        options: {
          EX: 43200, // 12h
          NX: false, // write the data even if the key already exists
        },
      }), tvws_Route);

    app.use('/equipment', redisCacheMiddleware({
        options: {
          EX: 43200, // 12h
          NX: false, // write the data even if the key already exists
        },
      }), equipment_Route);
    
    app.use('/licenses', redisCacheMiddleware({
        options: {
          EX: 43200, // 12h
          NX: false, // write the data even if the key already exists
        },
      }), licenses_Route);

    // set port
    const port = process.env.PORT || 3008;

    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`)
    });
}

// start the server
initializeExpressServer()
  .then()
  .catch((e) => console.error(e));
