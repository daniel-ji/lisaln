const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const router = express.Router();
const multer = require('multer');
let filenameprefix;
let tmpExtList = []; 
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'dbandbash/codes/uploads')
    },
    filename: (req, file, cb) => {
        filenameprefix = "test";
        filenameprefix = "a" + (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)).toLowerCase();
        cb(null, filenameprefix + ".fasta");
    }
})
const upload = multer({ storage: storage, limits: {fileSize: 20000}});
//file suffixes for files we're sending (will be combined with protein name)
let filesuffixes = ['_landmark_homolo_aln.txt.gif', '_blastp_landmark_alnh.txt.gif', '_landmark_homolo_aln_phylotree_dendo.xls.gif', '_blastp_landmark_alnh_phylotree_dendo.xls.gif', '_landmark_homolo_aln.txt_all.gif', '_landmark_homolo_aln.txt'];

// needs validation ^ up there and down there - including email verif
//each post is based on a different option sent from the client
/*
router.get('/streaming', (req, res) => {

    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders(); // flush the headers to establish SSE with client

    let counter = 0;
    let interValID = setInterval(() => {
        counter++;
        if (counter >= 10) {
            clearInterval(interValID);
            res.end(); // terminates SSE session
            return;
        }
        res.write(`data: ${JSON.stringify({num: counter})}\n\n`); // res.write() instead of res.send()
    }, 1000);

    // If client closes connection, stop sending events
    res.on('close', () => {
        console.log('client dropped me');
        clearInterval(interValID);
        res.end();
    });
});*/

//when inputs protein name
router.post('/name', (req, res) => {
    filenameprefix = String(req.body.proteinName).toLowerCase();
    if (filenameprefix.length !== 0 && filenameprefix.length < 100) {
        runAndOutput(filenameprefix, req, res);
    }
})

//when sends file
router.post('/file', upload.single('fasta'), (req, res, next) => {
    console.log(req.body);
    runAndOutput(`uploads/${filenameprefix}.fasta`, req, res);
});

//when input in text box
router.post('/text', (req, res) => {
    let fastaText = String(req.body.fastaText);
    if (fastaText.length !== 0 && fastaText.length < 10000) {
        filenameprefix = Date.now().toString() + Math.random().toString(36);
        fs.writeFile(`uploads/${filenameprefix}.fasta`, fastaText, err => {
            if (err !== null) {
                console.log(err);
            }
        })
    }
    runAndOutput(`uploads/${filenameprefix}.fasta`, req, res);
})

//returning information to client and console - main function for blastp
const runAndOutput = (input, req, res) => {
    //temp file number - needs to delcare here just incase concurrent running of this file (maybe?)
    let tempNumber;
    //checkpoints for status bar
    let checkpoints = ["Temp identifier for possible clear:", "Best matching protein from", "Best matching protein is from Blastp Refseq", "=> Use NCBI ", "by using 27 Landmark diverse species for SmartBLAST: ", "Refseq saved in", "=> Paralogues: Human homology proteins saved in", "=> NCBI HomoloGene Orthologues: Protein across species saved as", "=> LisAln Final Orthologues"];
    if (req.url === '/name') {
        checkpoints.splice(1, 0, "GeneName is ");
    }
    let response;
    let args = ['-LisAln', input];
    if (req.body.sciName) {
        args.splice(1, 0, '-nochange');
    }
    if (Number.isInteger(parseInt(req.body.rangeStart)) && Number.isInteger(parseInt(req.body.rangeEnd))) {
        args.splice(1, 0, '-range', (parseInt(req.body.rangeStart)), (parseInt(req.body.rangeEnd)));
    }
    //checking if range
    response = spawn('./dbandbash/codes/NCBI_blast', args);
    //writing stuff to console for debug
    response.stdout.on("data", data => {
        for (let i = 0; i < checkpoints.length; i++) {
            if (data.toString().includes(checkpoints[i])) {
                switch(checkpoints[i]) {
                    case "Temp identifier for possible clear:": 
                        tempNumber = data.toString().split(' ').slice(6, 7).join(' ');
                        checkpoints.splice(i, 1);
                        break;
                    case "Best matching protein from":
                        if (req.url !== '/name' && data.toString().split(' ').slice(9, 10).join(' ') !== filenameprefix) {
                            let oldfilenameprefix = filenameprefix;
                            // gets name
                            filenameprefix = data.toString().split(' ').slice(9, 10).join(' ');
                            // stops program
                            response.kill('SIGKILL');
                            // renames landmark & upload
                            fs.rename(`./dbandbash/codes/${input}`, `./dbandbash/codes/uploads/${filenameprefix}.fasta`, err => {
                                if (err) console.log(err);
                            })
                            fs.rename(`./dbandbash/codes/${oldfilenameprefix}_blastp_landmark.txt`, `./dbandbash/codes/${filenameprefix}_blastp_landmark.txt`, err => {
                                if (err) console.log(err);
                            })
                            //removes tmp files
                            tmpExtList.forEach(item => {
                                fs.unlink(`./dbandbash/codes/${tempNumber}${tmpExtList}`, (err) => {
                                    if (err) console.log(err);
                                });
                            })
                            // reruns program
                            runAndOutput(`uploads/${filenameprefix}.fasta`, req, res);
                        }
                        checkpoints.splice(i, 1);
                        break;
                }
            }
        }
        process.stdout.write(data.toString());
    })
    response.stderr.on("data", data => {
        //process.stderr.write(data.toString());
    })
    response.on("exit", (code, signal) => {
        if (signal !== 'SIGKILL') {
            //prefix to add onto suffixes - so can get correct files produced from the NCBI_blast shell script
            let url = [];
            //copying them to public and adding the file to the response
            filesuffixes.forEach((suffix) => {
                fs.copyFile(`./dbandbash/codes/${filenameprefix}${suffix}`, `./public/images/${filenameprefix}${suffix}`, err => {
                    if (err !== null) {
                        console.log(err);
                    }
                })
                url.push(`/public/images/${filenameprefix}${suffix}`);
            });
            res.send({url: url, filenameprefix: filenameprefix})
        }
    });
}

module.exports = router;