const express = require('express');
const fs = require('fs');
const path = require('path');
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
//file suffixes for files we're sending (will be combined with protein name)
let filesuffixes = ['_landmark_homolo_aln.txt.gif', '_landmark_homolo_aln_phylotree_dendo.xls.gif', '_blastp_landmark_alnh.txt.gif', '_blastp_landmark_alnh_phylotree_dendo.xls.gif'];
//checkpoints for status bar
let checkpoints = ["Trying to get fasta seq", "GeneName is ", "=> Use NCBI ", "by using 27 Landmark diverse species for SmartBLAST: ", ""];
let proteinName;

// needs validation
//each post is based on a different option sent from the client
router.post('/file', upload.single('fasta'), (req, res, next) => {
    runAndOutput(`uploads/${req.file.filename}`, req, res);
});

router.post('/name', (req, res) => {
    let proteinName = String(req.body.proteinName);
    if (proteinName.length !== 0 && proteinName.length < 100) {
        runAndOutput(proteinName, req, res);
    }
})

router.post('/text', (req, res) => {
    let fastaText = String(req.body.fastaText);
    if (fastaText.length !== 0 && fastaText.length < 10000) {
        fs.writeFile('./dbandbash/codes/uploads/test.fasta', fastaText, err => {
            console.log(err);
        })
    }
    runAndOutput('uploads/test.fasta', req, res);
})

//returning information to client and console
const runAndOutput = (input, req, res) => {
    let response;
    //checking if range
    if (Number.isInteger(parseInt(req.body.rangeStart)) && Number.isInteger(parseInt(req.body.rangeEnd))) {
        response = spawn('./dbandbash/codes/NCBI_blast', ['-LisAln', '-range', (parseInt(req.body.rangeStart)), (parseInt(req.body.rangeEnd)), input]);   
    } else {
        response = spawn('./dbandbash/codes/NCBI_blast', ['-LisAln', input]);
    }
    //writing stuff to console for debug
    response.stdout.on("data", data => {
        process.stdout.write(data.toString());
    })
    response.stderr.on("data", data => {
        process.stderr.write(data.toString());
    })
    response.on("exit", () => {
        //prefix to add onto suffixes - so can get correct files produced from the NCBI_blast shell script
        let filenameprefix;
        let url = [];
        if (req.file !== undefined) {
            filenameprefix = req.file.filename.replace(/\.[^/.]+$/, "").toLowerCase();
        } else if (req.body.proteinName !== undefined){
            filenameprefix = req.body.proteinName.toLowerCase();
        } else {
            filenameprefix = 'test';
        }
        //copying them to public and adding the file to the response
        filesuffixes.forEach((suffix) => {
            fs.copyFile(`./dbandbash/codes/${filenameprefix}${suffix}`, `./public/images/${filenameprefix}${suffix}`, err => {
                console.log(err);
            })
            url.push(`/public/images/${filenameprefix}${suffix}`);
        });
        res.send({url: url})
    });
}

module.exports = router;