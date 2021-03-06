const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const AdmZip = require('adm-zip');
let filenamePrefix;

//post request to first generat the zip file with alignments and diagrams
router.post('/', (req, res) => {
    var zip = new AdmZip();
    if (Array.isArray(req.body.url)) {
        req.body.url.forEach(element => {
            zip.addLocalFile('.' + element);
        })
    }
    filenamePrefix = req.body.filenamePrefix; 
    zip.writeZip(`./public/zipped/${filenamePrefix}.zip`);
    res.sendStatus(200);
})

//get request to actually download the file for the user
router.get('/', (req, res) => {
    res.download(`./public/zipped/${filenamePrefix}.zip`);
})

module.exports = router;