const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const AdmZip = require('adm-zip');
let filenameprefix;

router.post('/', (req, res) => {
    var zip = new AdmZip();
    if (Array.isArray(req.body.url)) {
        req.body.url.forEach(element => {
            zip.addLocalFile('.' + element);
        })
    }
    filenameprefix = req.body.filenameprefix; 
    zip.writeZip(`./public/zipped/${filenameprefix}.zip`);
    res.sendStatus(200);
})

router.get('/', (req, res) => {
    res.download(`./public/zipped/${filenameprefix}.zip`);
})

module.exports = router;