const { createClient } = require("redis");
const hash = require("object-hash"); // hash function to hash the request object
const zlib = require('node:zlib');

// redis client object
let redisClient = undefined;

// creating a redis client
async function initializeRedisClient() {
    // READ THE redis connection string from the environment variables
    let redisURL =process.env.REDIS_URL;
    if (redisURL) {
        // create a redis client object
        redisClient = createClient({ url: redisURL }).on('error', (err) => {
            console.error(`Failed to create the Redis client with error:`);
            console.error(err);
        });
        try {
            // connect to the redis server
            await redisClient.connect();
            console.log('Connected to Redis server');
        } catch (err) {
            console.error(`Failed to connect to the Redis server with error:`);
            console.error(err);
        }
    
    }
};

function requestToKey(req) {
    //build a custom object to use as part of the Redis key
    const reqDataToHash = {
        query: req.query,
        body: req.body,
    };

    //`${req.path}@...` to make it easier to find
  // keys on a Redis client
  return `${req.path}@${hash.sha1(reqDataToHash)}`;
}

function isRedisWorking() {
    // verify whether is the redis client is working or not
    return !!redisClient?.isOpen;
}
async function writeData(key, data, options, compress) {
    if (isRedisWorking()) {
        let dataToCache = data;
        if (compress) {
            // compress the data before caching it with zlib to save space
            dataToCache = zlib.deflateSync(data).toString("base64");
        }
        try {
            // write the data to the redis server
            await redisClient.set(key, dataToCache, options);
        } catch (err) {
            console.error(`Failed to cache data for key=${key}`, err);
        }
    }
}

async function readData(key, compressed) {
    let cachedValue = undefined;

    if (isRedisWorking()) {
        // try to get the cached response from redis
        cachedValue = await redisClient.get(key);
        if (cachedValue) {
            if (compressed) {   
                // decompress the data before returning it
                return zlib.inflateSync(Buffer.from(cachedValue, "base64")).toString();
            } else {
                return cachedValue;
            }
        }
    }
    return cachedValue;
}
function redisCacheMiddleware(
    options = {
        EX: 21600, // 6 hours
    },
    compression = true // enable compression and decompression by default
) {
    return async (req, res, next) => {
        // create a key for the request
        if (isRedisWorking()) {
            const key = requestToKey(req);
            // if there is some cached data, retrieve it and return it
            const cachedValue = await readData(key, compression);
            if (cachedValue) {
                try {
                    // if it is JSON data, return it
                    return res.json(JSON.parse(cachedValue));
                } catch {
                    // if it not JSON data, then return it
                    return res.send(cachedValue);
                }
            } else {
                // override how res.send behaves
                // to introduce the caching logic
                const oldSend = res.send;
                res.send = function (data) {
                    // set the function back to avoid the 'double-send' effect
                    res.send = oldSend;

                    // cache the response only if it is successful
                    if (res.statusCode.toString().startsWith("2")) {
                        writeData(key, data, options, compression).then();
                    }

                    return res.send(data);
                };

                // continue to the controller function
                next();
            }
        } else {
            // if the cached value is not found, call the next middleware
            next();
        }
    }
}
   


// export the function
module.exports = { initializeRedisClient, redisCacheMiddleware };