const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const blacklist = [
    'sdf_contactmap',
    'clustalo-',
    'upload contents',
    '_blastp_landmark.txt',
    '_blastp_landmark.fasta.txt',
    '_blastp_landmark_alnh_',
    '_blastp_landmark_human',
    '_blastp_landmark_spec',
    '_landmark_homolo_aln',
    '_landmark_homolo.fasta.txt'
]

//every 1st and 15th, clear month old file
cron.schedule('0 0 1,15 * *', () => {
    //remove old uploads
    fs.readdir('./dbandbash/codes/uploads', {withFileTypes: true}, (err, files) => {
        if (err === null) {
            files.forEach((file) => {
                const stats = fs.statSync('./dbandbash/codes/uploads/' + file.name);
                if ((new Date().getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24) > 30) {
                    fs.unlink('./dbandbash/codes/uploads/' + file.name, err => console.log(err))
                }
            })
        }
    })
});

//every 3 days, clear tmps
cron.schedule('0 0 */3 * *', () => {
});

module.exports = router;
