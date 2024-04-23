const express = require('express');
const router = express.Router();
const axios = require('axios');

// function for fetching data from the broker
const fetchData = async (req, res) => {
    try {
        const url = 'http://broker.digitalubiquitycapital.com:1026/v2/entities?type=5G_RJCivics_GSA&limit=1000&options=keyValues';
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).send('Status: Internal Server Error');
    }        
}

router.get('/fiveGcivics', fetchData);

module.exports = router
