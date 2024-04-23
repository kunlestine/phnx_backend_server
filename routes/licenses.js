const express = require('express');
const router = express.Router();
const axios = require('axios');

// function for fetching data from the broker
const fetchData = async (req, res) => {
    let offset = 0;
    let limit = 1000;
    let allData = [];

    try {
        while (true) {
            const url = `http://broker.digitalubiquitycapital.com:1026/v2/entities?type=Licenses&q=PROV=='NS'&limit=${limit}&offset=${offset}&options=keyValues`;
            const response = await axios.get(url);
            
            if (response.data.length === 0) {
                break; // No more data, exit the loop
            }

            allData = allData.concat(response.data);
            offset += limit;
        }

        res.json(allData);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Status: Internal Server Error');
    }        
}

router.get('/license', fetchData);

module.exports = router;
