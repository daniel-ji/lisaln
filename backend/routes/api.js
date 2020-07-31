const express = require('express');
const fs = require('fs');
const { spawn } = require('child_process');
const multer = require('multer');
const upload = multer({ dest: 'src/codes/uploads'});
const router = express.Router();

// may have to refactor
// needs validation

router.post('/blastp/file', upload.single('fasta'), (req, res, next) => {
    console.log(req.file);
    const response = spawn('./src/codes/NCBI_blast', ['-LisAln', `uploads/${req.file.filename}`]);
    response.stdout.on("data", data => {
        process.stdout.write(data.toString());
    })
    response.stderr.on("data", data => {
        process.stderr.write(data.toString());
    })
});

router.post('/blastp/name', (req, res) => {
    let proteinName = String(req.body.proteinName);
    if (proteinName.length !== 0) {
        const response = spawn('./src/codes/NCBI_blast', ['-LisAln', proteinName]);
        response.stdout.on("data", data => {
            process.stdout.write(data.toString());
        })
        response.stderr.on("data", data => {
            process.stderr.write(data.toString());
        })
    }
})

module.exports = router;