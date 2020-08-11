const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const AdmZip = require('adm-zip');

router.post('/', (req, res) => {
    var zip = new AdmZip();
    if (Array.isArray(req.body.url)) {
        req.body.url.forEach(element => {
            zip.addLocalFile('.' + element);
        })
    }
    zip.writeZip(`./public/zipped/test.zip`);
    res.sendStatus(200);
})

router.get('/', (req, res) => {
    res.download(`./public/zipped/test.zip`);
})

module.exports = router;