const express = require('express');
const router = express.Router();
const fs = require('fs');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();
const AdmZip = require('adm-zip');
const events = require('events');
let clientUpdater = new events.EventEmitter();

// storing stuff
const multer = require('multer');
let filenameprefix;
let extension; 
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'dbandbash/codes/uploads')
    },
    filename: (req, file, cb) => {
        extension = file.originalname.match(/\.[0-9a-z]+$/i);
        filenameprefix = "a" + (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)).toLowerCase();
        cb(null, filenameprefix + extension);
    }
})
const upload = multer({ storage: storage, limits: {fileSize: 20000}});

//file suffixes for files we're sending (will be combined with protein name)
let filesuffixes = ['_landmark_homolo_aln.txt.gif', '_blastp_landmark_alnh.txt.gif', '_landmark_homolo_aln_phylotree_dendo.xls.gif', '_blastp_landmark_alnh_phylotree_dendo.xls.gif', '_landmark_homolo_aln.txt_all.gif', '_landmark_homolo_aln.txt'];
let serverDownTmpExtList = ['.tmp', '.tmp6', '.tmp.fasta', '.tmp.fasta.txt'];
// email
const nodemailer = require("nodemailer");
const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

//TODO: IMPLEMENT ONLY EMAIL F(X) - emailOnly OPTION from BlastRequest

//when inputs protein name
router.post('/name', (req, res) => {
    filenameprefix = String(req.body.proteinName).toLowerCase();
    if (filenameprefix.length !== 0 && filenameprefix.length < 100) {
        runAndOutput(filenameprefix, req, res);
    }
})

//when sends file
router.post('/file', upload.single('fasta'), (req, res) => {
    let fastaText = fs.readFileSync(`./${req.file.path}`).toString();
    extension = ".fasta";
    if (fastaText.length !== 0 && fastaText.length < 10000) {
        filenameprefix = "a" + (fastaText.substr(0, 32).replace(/([^a-z0-9]+)/gi, '0')).toLowerCase();
        fs.renameSync(req.file.path, `./dbandbash/codes/uploads/${filenameprefix}${extension}`);
        runAndOutput(`uploads/${filenameprefix}${extension}`, req, res);
    }
});

//when input in text box
router.post('/text', (req, res) => {
    extension = ".fasta";
    if (req.body.fastaText.length !== 0 && req.body.fastaText.length < 10000) {
        filenameprefix = "a" + (req.body.fastaText.substr(0, 32).replace(/([^a-z0-9]+)/gi, '0')).toLowerCase();
        fs.writeFileSync(`./dbandbash/codes/uploads/${filenameprefix}${extension}`, req.body.fastaText);
        runAndOutput(`uploads/${filenameprefix}${extension}`, req, res);
    }
})

//returning information to client and console - main function for blastp
const runAndOutput = (input, req, res) => {
    //if some servers are down
    let serverDown = false;
    const serverTimer = setTimeout(() => {
        serverDown = true;
        response.kill('SIGTERM');
    }, 300000);

    //temp file number - needs to delcare here just incase concurrent running of this file
    let tempNumber;

    //checkpoints for status bar
    let checkpoints = ["Temp identifier for possible clear:", "Trying to get fasta seq for human", "Best matching protein from", "Best matching protein is from Blastp Refseq", "=> Use NCBI ", "by using 27 Landmark diverse species for SmartBLAST: ", "Refseq saved in", "=> Paralogues: Human homology proteins saved in", "=> NCBI HomoloGene Orthologues: Protein across species saved as", "=> LisAln Final Orthologues"];
    if (req.url === '/name') {
        checkpoints.splice(1, 0, "GeneName is ");
    }
    let response;
    
    //NCBI_blast args
    let args = ['-LisAln', input];
    if (req.body.sciName === 'true') {
        args.splice(1, 0, '-nochange');
    }
    if (req.body.reUse === 'false') {
        args.splice(1, 0, '-force');
    }
    if (Number.isInteger(parseInt(req.body.rangeStart)) && Number.isInteger(parseInt(req.body.rangeEnd))) {
        args.splice(1, 0, '-range', (parseInt(req.body.rangeStart)), (parseInt(req.body.rangeEnd)));
    }
    //starts process
    console.log(args);
    response = spawn('./dbandbash/codes/NCBI_blast', args);

    response.stdout.on("data", data => {
        for (let i = 0; i < checkpoints.length; i++) {
            if (data.toString().includes(checkpoints[i])) {
                switch(checkpoints[i]) {
                    case "Temp identifier for possible clear:": 
                        tempNumber = data.toString().split(' ').slice(5, 6).join(' ').slice(0, -1);
                        break;
                    case "Trying to get fasta seq for human":
                        clientUpdater.emit('data', 'Getting fasta file');
                        break;
                    case "=> Use NCBI ":
                        clientUpdater.emit('data', 'Getting landmark file...');
                        break;
                    case "by using 27 Landmark diverse species for SmartBLAST: ":
                        clientUpdater.emit('data', 'Got landmark file, finding sequence alignments...');
                        break;
                    case "Refseq saved in":
                        clientUpdater.emit('data', 'Found alignments, finding paralogues...');
                        break;
                    case "=> Paralogues: Human homology proteins saved in":
                        clientUpdater.emit('data', 'Got paralogues, finding orthalogues...');
                        break;
                    case "=> NCBI HomoloGene Orthologues: Protein across species saved as":
                        clientUpdater.emit('data', 'Got orthologues, processing...')
                        break;
                    case "=> LisAln Final Orthologues":
                        clientUpdater.emit('data', 'Finishing up...')
                        break;
                }
                checkpoints.splice(i, 1);   
            }
        }
        //console.log(fs.existsSync('./dbandbash/codes/a0sp0o144970ari1a0human0at0rich0i_blastp_landmark_alnh.txt'));
        //process.stdout.write(data.toString());
    })
    response.stderr.on("data", data => {
        //console.log(fs.existsSync('./dbandbash/codes/a0sp0o144970ari1a0human0at0rich0i_blastp_landmark_alnh.txt'));
        //process.stderr.write(data.toString());
    })

    response.on("exit", (code, signal) => {
        clearTimeout(serverTimer);
        if (signal !== 'SIGTERM') {
            clientUpdater.emit('data', 'Done!');
            //prefix to add onto suffixes - so can get correct files produced from the NCBI_blast shell script
            let url = [];
            //copying them to public and adding the file to the response
            filesuffixes.forEach((suffix) => {
                let add = true;
                try {
                    fs.copyFileSync(`./dbandbash/codes/${filenameprefix}${suffix}`, `./public/images/${filenameprefix}${suffix}`);
                } catch (err) {
                    if (err.code === 'ENOENT') {
                        console.log(`${filenameprefix}${suffix}`);
                        add = false;
                    }
                }
                add && url.push(`/public/images/${filenameprefix}${suffix}`);
            })
            res.send({url: url, filenameprefix: filenameprefix});

            //mail stuff
            if (emailRegex.test(String(req.body.email).toLowerCase())) {
                async function main() {
                    const transporter = nodemailer.createTransport({
                        host: 'smtp.ethereal.email' /* change (and also env)*/,
                        port: 587,
                        auth: {
                            user: 'alycia.swift@ethereal.email',
                            pass: 'bTNNgGC8BJtXYXkgSj'
                        }
                    });
                    var zip = new AdmZip();
                    url.forEach(element => {
                        zip.addLocalFile('.' + element);
                    })
                    zip.writeZip(`./public/zipped/${filenameprefix}.zip`);  
                    let info = await transporter.sendMail({
                        from: '"LisAln Blast Request" <alycia.swift@ethereal.email>', // sender address - need to change
                        to: req.body.email,
                        subject: `LisAln Blast Request results for protein ${filenameprefix} at time: ${new Date().toLocaleString('en-US')}`, // Subject line
                        text: "Results in attached zip file.",
                        attachments: [{path: `./public/zipped/${filenameprefix}.zip`}]
                    });
                    console.log("Message sent: %s", info.messageId);
                }
                main().catch(console.error)
            }
        } else if (serverDown) {
            //cleaning when server down 
            serverDownTmpExtList.forEach(item => {
                fs.unlink(`./dbandbash/codes/${tempNumber}${item}`, (err) => {
                    if (err) console.log(err);
                });
            })
            res.sendStatus(503);
            clientUpdater.emit('data', 'Done!');
            if (emailRegex.test(String(req.body.email).toLowerCase())) {
                setTimeout(() => {
                    response = spawn('./dbandbash/codes/NCBI_blast', args);
                    response.on("exit", () => {
                        //prefix to add onto suffixes - so can get correct files produced from the NCBI_blast shell script
                        let url = [];
                        //copying them to public and adding the file to the response
                        filesuffixes.forEach((suffix) => {
                            let add = true;
                            try {
                                fs.copyFileSync(`./dbandbash/codes/${filenameprefix}${suffix}`, `./public/images/${filenameprefix}${suffix}`);
                            } catch (err) {
                                if (err.code === 'ENOENT') {
                                    console.log(`${filenameprefix}${suffix}`);
                                    add = false;
                                }
                            }
                            add && url.push(`/public/images/${filenameprefix}${suffix}`);
                        })
                        //mail to them
                        async function main() {
                            const transporter = nodemailer.createTransport({
                                host: 'smtp.ethereal.email' /* change (and also env)*/,
                                port: 587,
                                auth: {
                                    user: 'alycia.swift@ethereal.email',
                                    pass: 'bTNNgGC8BJtXYXkgSj'
                                }
                            });
                            var zip = new AdmZip();
                            url.forEach(element => {
                                zip.addLocalFile('.' + element);
                            })
                            zip.writeZip(`./public/zipped/${filenameprefix}.zip`);  
                            let info = await transporter.sendMail({
                                from: '"LisAln Blast Request" <alycia.swift@ethereal.email>', // sender address - need to change
                                to: req.body.email,
                                subject: `LisAln Blast Request results for protein ${filenameprefix} at time: ${new Date().toLocaleString('en-US')}`, // Subject line
                                text: "Results in attached zip file.",
                                attachments: [{path: `./public/zipped/${filenameprefix}.zip`}]
                            });
                            console.log("Message sent: %s", info.messageId);
                        }
                        main().catch(console.error)
                    })
                }, 1000 * 60 * 59 * 3)
            }
        }
    });
}

router.get('/', (req, res) => {
    clientUpdater = new events.EventEmitter();
    //starting SSE Events
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clientUpdater.on('data', (data) => {
        res.write(`data: ${data}\n\n`);
        if (data === 'Done!') {
            res.end();
        }
    })

    //listening for exit
    res.on('close', () => {
        res.end();
    });

})

module.exports = router;