const express = require('express');
const router = express.Router();
const fs = require('fs');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();
const AdmZip = require('adm-zip');
const events = require('events');
const nodemailer = require("nodemailer");
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { nextTick } = require('process');
// storing fasta/txt files for when user inputs a file
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'dbandbash/codes/uploads')
    },
    filename: (req, file, cb) => {
        //at first, generate random name before reading the file
        cb(null, "a" + (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)).toLowerCase() + file.originalname.match(/\.[0-9a-z]+$/i));
    }
})
const upload = multer({ storage: storage, limits: {fileSize: 20000}});

//file suffixes for output files (will be combined with protein name / filename prefix)
const filesuffixes = ['_landmark_homolo_aln.txt.gif', '_blastp_landmark_alnh.txt.gif', '_landmark_homolo_aln_phylotree_dendo.xls.gif', '_blastp_landmark_alnh_phylotree_dendo.xls.gif', '_landmark_homolo_aln.txt_all.gif', '_landmark_homolo_aln.txt', '_blastp_landmark_alnh.txt']; 
//when server is down, clearing these tmp files that may have been created mid-way
const serverDownTmpExtList = ['.tmp', '.tmp6', '.tmp.fasta', '.tmp.fasta.txt', '.tmp.out', '.tmp2.dump'];
//emailRegex to verify email is actual email
const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

//global variable containing all the eventEmitters for the real-time updates on client side (SSE Events)
let clientUpdater = [];

//following 3 routes - will scheduleEmail when the user is resubmitting request when server is down; otherwise, try to regularly run script and output results

//when inputs protein name
router.post('/name', (req, res) => {
    const filenamePrefix = String(req.body.proteinName).toLowerCase();
    if (filenamePrefix.length !== 0 && filenamePrefix.length < 100) {
        if (req.body.type === 'emailOnly') {
            scheduleEmail(req, res, filenamePrefix, filenamePrefix);
        } else {
            setTimeout(() => {runAndOutput(req, res, filenamePrefix, filenamePrefix, clientUpdater.length - 1)}, 2000);
        }
    }
})

//when inputs file
router.post('/file', upload.single('fasta'), (req, res) => {
    let fastaText = fs.readFileSync(`./${req.file.path}`).toString();
    if (fastaText.length !== 0 && fastaText.length < 10000) {
        const filenamePrefix = "a" + (fastaText.substr(0, 32).replace(/([^a-z0-9]+)/gi, '0')).toLowerCase();
        fs.renameSync(req.file.path, `./dbandbash/codes/uploads/${filenamePrefix}${req.file.path.match(/\.[0-9a-z]+$/i)}`);
        if (req.body.type === 'emailOnly') {
            scheduleEmail(req, res, `uploads/${filenamePrefix}${req.file.path.match(/\.[0-9a-z]+$/i)}`, filenamePrefix);
        } else {
            setTimeout(() => {runAndOutput(req, res, `uploads/${filenamePrefix}${req.file.path.match(/\.[0-9a-z]+$/i)}`, filenamePrefix, clientUpdater.length - 1)}, 2000);
        }
    }
});

//when input sequence in text box
router.post('/text', (req, res) => {
    if (req.body.fastaText.length !== 0 && req.body.fastaText.length < 10000) {
        const filenamePrefix = "a" + (req.body.fastaText.substr(0, 32).replace(/([^a-z0-9]+)/gi, '0')).toLowerCase();
        fs.writeFileSync(`./dbandbash/codes/uploads/${filenamePrefix}.fasta`, req.body.fastaText);
        if (req.body.type === 'emailOnly') {
            scheduleEmail(req, res, `uploads/${filenamePrefix}.fasta`, filenamePrefix);
        } else {
            setTimeout(() => {runAndOutput(req, res, `uploads/${filenamePrefix}.fasta`, filenamePrefix, clientUpdater.length - 1)}, 2000);
        }
    }
})

//returning information to client and console - main function for blastp
const runAndOutput = (req, res, input, filenamePrefix, updaterIndex) => {
    // for bad inputs
    let badInput = false;
    //if some servers are down
    let serverDown = false;
    const serverTimer = setTimeout(() => {
        serverDown = true;
        response.kill('SIGTERM');
    }, 606000);

    //temp file number - needs to delcare here just incase concurrent running of this file
    let tempNumber;

    //checkpoints for status bar
    let checkpoints = ["Temp identifier for possible clear:", "Trying to get fasta seq for human", "Best matching protein from", "Best matching protein is from Blastp Refseq", "=> Use NCBI ", "by using 27 Landmark diverse species for SmartBLAST: ", "Refseq saved in", "=> Paralogues: Human homology proteins saved in", "=> NCBI HomoloGene Orthologues: Protein across species saved as", "=> LisAln Final Orthologues"];
    if (req.url === '/name') {
        checkpoints.splice(1, 0, "GeneName is ");
    }
    
    //NCBI_blast args
    let args = ['-LisAln', input];
    if (req.body.sciName === 'true' || req.body.sciName) {
        args.splice(1, 0, '-nochange');
    }
    if (req.body.reUse === 'false' || !req.body.reUse) {
        args.splice(1, 0, '-force');
    }
    if (Number.isInteger(parseInt(req.body.rangeStart)) && Number.isInteger(parseInt(req.body.rangeEnd))) {
        args.splice(1, 0, '-range', (parseInt(req.body.rangeStart)), (parseInt(req.body.rangeEnd)));
    }
    //starts process
    let response = spawn('./dbandbash/codes/NCBI_blast', args);

    //for SSE event updates on client side
    response.stdout.on("data", data => {
        for (let i = 0; i < checkpoints.length; i++) {
            if (data.toString().includes(checkpoints[i])) {
                switch(checkpoints[i]) {
                    case "Temp identifier for possible clear:": 
                        tempNumber = data.toString().split(' ').slice(5, 6).join(' ').slice(0, -1);
                        break;
                    case "Trying to get fasta seq for human":
                        clientUpdater[updaterIndex].emit('data', 'Getting fasta file');
                        break;
                    case "=> Use NCBI ":
                        clientUpdater[updaterIndex].emit('data', 'Getting landmark file...');
                        break;
                    case "by using 27 Landmark diverse species for SmartBLAST: ":
                        clientUpdater[updaterIndex].emit('data', 'Got landmark file, finding sequence alignments...');
                        break;
                    case "Refseq saved in":
                        clientUpdater[updaterIndex].emit('data', 'Found alignments, finding paralogs...');
                        break;
                    case "=> Paralogues: Human homology proteins saved in":
                        clientUpdater[updaterIndex].emit('data', 'Got paralogs, finding orthologs...');
                        break;
                    case "=> NCBI HomoloGene Orthologues: Protein across species saved as":
                        clientUpdater[updaterIndex].emit('data', 'Got orthologs, processing...')
                        break;
                    case "=> LisAln Final Orthologues":
                        clientUpdater[updaterIndex].emit('data', 'Finishing up...')
                        break;
                }
                checkpoints.splice(i, 1);   
            }
        }
        process.stdout.write(data.toString());
    })
    response.stderr.on("data", data => {
        process.stderr.write(data.toString());
        if (data.toString().includes("Fatal error!")) {  
            clientUpdater[updaterIndex].emit('data', "Done.")
            badInput = true;
        }
    })

    response.on("exit", (code, signal) => {
        clearTimeout(serverTimer);
        if (badInput) {
            serverDownTmpExtList.forEach(item => {
                fs.unlink(`./dbandbash/codes/${tempNumber}${item}`, (err) => {});
            })
            res.sendStatus(400);
        } else if (signal !== 'SIGTERM') {
            clientUpdater[updaterIndex].emit('data', 'Done!');
            //prefix to add onto suffixes - so can get correct files produced from the NCBI_blast shell script
            let url = [];
            //copying them to public and adding the file to the response
            filesuffixes.forEach((suffix) => {
                let add = true;
                try {
                    fs.copyFileSync(`./dbandbash/codes/${filenamePrefix}${suffix}`, `./public/images/${filenamePrefix}${suffix}`);
                } catch (err) {
                    if (err.code === 'ENOENT') {
                        add = false;
                    }
                }
                add && url.push(`/public/images/${filenamePrefix}${suffix}`);
            })
            res.send({url: url, filenamePrefix: filenamePrefix});
            //sending results via mail to the user if requested so 
            if (emailRegex.test(String(req.body.email).toLowerCase())) {
                var zip = new AdmZip();
                url.forEach(element => {
                    zip.addLocalFile('.' + element);
                })
                zip.writeZip(`./public/zipped/${filenamePrefix}.zip`);  
                const msg = {
                    from: 'lisaln.results@gmail.com',
                    to: req.body.email,
                    subject: `LisAln Blast Request results for protein ${filenamePrefix} at time: ${new Date().toLocaleString('en-US')}`, // Subject line
                    text: "Results in attached zip file.",
                    attachments: [{
                        content: fs.readFileSync(`./public/zipped/${filenamePrefix}.zip`).toString('base64'),
                        filename: `${filenamePrefix}.zip`,
                        type: 'application/zip',
                        disposition: 'attachment'
                    }] 
                }
                sgMail.send(msg).then(res => {
                    console.log(res);
                }).catch(err => {
                    console.log(err.response.body.errors);
                });        
            }
        } else {
            //cleaning when server down 
            serverDownTmpExtList.forEach(item => {
                fs.unlink(`./dbandbash/codes/${tempNumber}${item}`, (err) => {});
            })
            res.sendStatus(503);
            clientUpdater[updaterIndex].emit('data', 'Done!');
            if (emailRegex.test(String(req.body.email).toLowerCase())) {
                scheduleEmail(args, req, filenamePrefix);
            }
        }
    });
}

//function to send mail in 3-5 hours, trying request for two hours
const scheduleEmail = (req, res, input, filenamePrefix) => {
    setTimeout(() => {
        //if some servers are down
        const serverTimer = setTimeout(() => {
            response.kill('SIGTERM');
        }, 1000 * 60 * 60 * 2);

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

        let response = spawn('./dbandbash/codes/NCBI_blast', args);
        response.on("exit", () => {
            //prefix to add onto suffixes - so can get correct files produced from the NCBI_blast shell script
            let url = [];
            //copying them to public and adding the file to the response
            filesuffixes.forEach((suffix) => {
                let add = true;
                try {
                    fs.copyFileSync(`./dbandbash/codes/${filenamePrefix}${suffix}`, `./public/images/${filenamePrefix}${suffix}`);
                } catch (err) {
                    if (err.code === 'ENOENT') {
                        add = false;
                    }
                }
                add && url.push(`/public/images/${filenamePrefix}${suffix}`);
            })
            //mail to them
            if (url.length > 0 && emailRegex.test(String(req.body.email).toLowerCase())) {
                var zip = new AdmZip();
                url.forEach(element => {
                    zip.addLocalFile('.' + element);
                })
                zip.writeZip(`./public/zipped/${filenamePrefix}.zip`);  
                const msg = {
                    from: 'lisaln.results@gmail.com',
                    to: req.body.email,
                    subject: `LisAln Blast Request results for protein ${filenamePrefix} at time: ${new Date().toLocaleString('en-US')}`, // Subject line
                    text: "Results in attached zip file.",
                    attachments: [{
                        content: fs.readFileSync(`./public/zipped/${filenamePrefix}.zip`).toString('base64'),
                        filename: `${filenamePrefix}.zip`,
                        type: 'application/zip',
                        disposition: 'attachment'
                    }] 
                }
                sgMail.send(msg).then(res => {
                    console.log(res);
                }).catch(err => {
                    console.log(err.response.body.errors);
                });        
            }
        })
    }, 1000 * 60 * 59 * 3)
    res.sendStatus(200);
}


//starting SSE Events
router.get('/', (req, res) => {
    let clear = true;
    clientUpdater.forEach((updater) => {
        if (updater !== 'N/a') {
            clear = false;
        }
    })
    if (clear) {
        clientUpdater = [];
    }
    let index = clientUpdater.length;
    clientUpdater.push(new events.EventEmitter());
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    clientUpdater[index].on('data', (data) => {
        console.log(data);
        res.write(`data: ${data}\n\n`);
        res.flush(); /* need to do b/c of compression npm package incompatibility with SSE */
        if (data.includes('Done')) {
            res.write(`data: ${data}\n\n`);
            res.end();
            clientUpdater[index] = 'N/a';
        }
    })

    //listening for exit
    res.on('close', () => {
        res.end();
    });
})

module.exports = router;