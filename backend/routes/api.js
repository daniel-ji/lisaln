const express = require('express');
const fs = require('fs');
const { spawn } = require('child_process');
const router = express.Router();

const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'dbandbash/codes/uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
})
const upload = multer({ storage: storage });

// may have to refactor
// needs validation

router.post('/blastp/file', upload.single('fasta'), (req, res, next) => {
    console.log(req.file);
    const response = spawn('./dbandbash/codes/NCBI_blast', ['-LisAln', `uploads/${req.file.filename}`]);
    response.stdout.on("data", data => {
        process.stdout.write(data.toString());
    })
    response.stderr.on("data", data => {
        process.stderr.write(data.toString());
    })
    response.on("exit", () => res.sendStatus(200));
});

router.post('/blastp/name', (req, res) => {
    let proteinName = String(req.body.proteinName);
    if (proteinName.length !== 0 && proteinName.length < 100) {
        const response = spawn('./src/codes/NCBI_blast', ['-LisAln', proteinName]);
        response.stdout.on("data", data => {
            process.stdout.write(data.toString());
        })
        response.stderr.on("data", data => {
            process.stderr.write(data.toString());
        })
    }
})

router.post('/blastp/text', (req, res) => {
    let fastaText = String(req.body.fastaText);
    if (fastaText.length !== 0 && fastaText.length < 10000) {
        fs.writeFile('./dbandbash/codes/uploads/test.fasta', fastaText, err => {
            console.log(err);
        })
    }
    const response = spawn('./dbandbash/codes/NCBI_blast', ['-LisAln', `uploads/test.fasta`]);
    response.stdout.on("data", data => {
        process.stdout.write(data.toString());
    })
    response.stderr.on("data", data => {
        process.stderr.write(data.toString());
    })
    response.on("exit", () => res.sendStatus(200));
})

module.exports = router;