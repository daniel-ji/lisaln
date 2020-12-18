import React, { Component } from 'react'
import axios from 'axios'
import Header from './Header';

import { Card, Button, TextField, Radio, RadioGroup, FormControl, FormControlLabel } from '@material-ui/core'; 

import smoothscroll from 'smoothscroll-polyfill';

import helpLogo from '../media/info.png';

//const serverUrl = 'https://www.lisaln.org';
const serverUrl = 'http://localhost:3000';

let scriptTimeElapsed;

class BlastRequest extends Component {
    
    constructor(props) {
        super(props)
    
        this.state = {
            //result from blastp request
            filenamePrefix: '',
            updates: '',
            result: '',
            resultFormatted: '',

            //disable go when running
            goDisabled: false,

            fastaInput: '',
            fastaInputTitle: '',
            //to force fasta input and make clear button work
            fastaInputKey: Math.random().toString(36),
            fastaInputErr: false,

            proteinName: '',
            proteinNameErr: false,

            fastaText: '',
            fastaTextErr: false,

            rangeStart: '',
            rangeStartErr: false,
            rangeEnd: '',
            rangeEndErr: false,

            sciName: false,
            reUse: true,
            email: '',
            emailErr: false,
            resubmitEmail: false,

            errorMessage: '',
            showScrollIndicator: true,
            scriptDuration: '',

            popUp: false,
        }

        this.runscript = this.runscript.bind(this);
        this.scheduleEmail = this.scheduleEmail.bind(this);
        this.runscriptRespHandle = this.runscriptRespHandle.bind(this);
        this.runscriptErrHandle = this.runscriptErrHandle.bind(this);
        this.updateFile = this.updateFile.bind(this);
        this.clearFile = this.clearFile.bind(this);
        this.updateName = this.updateName.bind(this);
        this.updateFastaPaste = this.updateFastaPaste.bind(this);
        this.updateRangeStart = this.updateRangeStart.bind(this);
        this.updateRangeEnd = this.updateRangeEnd.bind(this);
        this.updateSciName = this.updateSciName.bind(this);
        this.updateReCalc = this.updateReCalc.bind(this);
        this.updateEmail = this.updateEmail.bind(this);
        this.resetFields = this.resetFields.bind(this);
        this.downloadResults = this.downloadResults.bind(this);
        this.scrollToGo = this.scrollToGo.bind(this);
        this.descriptionToggle = this.descriptionToggle.bind(this);
    }

    componentDidMount() {
        //for smooth scrolling
        smoothscroll.polyfill();
        //seeing if user scrolled to "go button"
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.setState({showScrollIndicator: false})
                    observer.disconnect()
                }
            })
        });
        const target = document.querySelector('.sendButton');
        observer.observe(target);
    }

    descriptionToggle() {
        this.setState(state => {return {popUp: !state.popUp}})
    }

    runscript() {
        //validation
        let noInput = false;
        let inputTooLong = 'false';
        let rangeStartInvalid = false;
        let rangeEndInvalid = false;
        let emailInvalid = false;
        let errorMessage = [];

        //protein input
        if (this.state.proteinName === '' && this.state.fastaInput === '' && this.state.fastaText === '') {
            noInput = true;
            errorMessage.push('Please enter a protein name, upload a file, or paste a fasta');
        } else {
            if (this.state.proteinName.length > 50) {
                inputTooLong = 'name';
                errorMessage.push('Please enter a valid Protein Name');
            } else {
                if (this.state.fastaInput.size > 20000) {
                    inputTooLong = 'file';
                    errorMessage.push('Please upload a file under 20KB.');
                } else {
                    if (this.state.fastaText.length > 20000) {
                        inputTooLong = 'text';
                        errorMessage.push('Please paste a valid fasta');
                    }
                }
            }
        }

        //range input
        if ((this.state.rangeStart === '' && this.state.rangeEnd !== '') || (this.state.rangeStart !== '' && (!Number.isInteger(parseInt(this.state.rangeStart)) || parseInt(this.state.rangeStart) < 0 || parseInt(this.state.rangeStart) > 10000))) {
            rangeStartInvalid = true;
            errorMessage.push('Please have a valid range start number');
        }
        
        if ((this.state.rangeEnd === '' && this.state.rangeStart !== '') || (this.state.rangeEnd !== '' && (!Number.isInteger(parseInt(this.state.rangeEnd)) || parseInt(this.state.rangeEnd) < 0 || parseInt(this.state.rangeEnd) > 10000))) {
            rangeEndInvalid = true;
            errorMessage.push('Please have a valid range end number');
        } else if (parseInt(this.state.rangeEnd) <= parseInt(this.state.rangeStart)) {
            this.setState(prevState => ({rangeEnd: 50, rangeStart: 25}))
        }

        //email input
        const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (this.state.email !== '' && !emailRegex.test(String(this.state.email).toLowerCase())) {
            emailInvalid = true;
            errorMessage.push('Please enter a valid email');
        }

        //requests
        if (!noInput && inputTooLong === 'false' && !rangeStartInvalid && !rangeEndInvalid && !emailInvalid) {
            //resetting
            this.setState({proteinNameErr: false, fastaInputErr: false, fastaTextErr: false, rangeStartErr: false, rangeEndErr: false, errorMessage: '', updates: [], scriptDuration: '', goDisabled: true})
            //timers
            let startTime = new Date().getTime();
            scriptTimeElapsed = setInterval(() => {
                let diff = new Date().getTime();
                let minutes = Math.floor((diff-startTime) / (1000 * 60));
                let seconds = Math.floor(((diff-startTime) / 1000 ) % 60);
                this.setState({scriptDuration:  <Header margin="2vh" size="0.5rem" className="updateMessage" title={`Time elapsed: ${minutes}m ${seconds}s`}/>});
                if (minutes === 10) {
                    document.querySelector('.imageResults').scrollIntoView({block: 'end', behavior: 'smooth'});
                    clearInterval(scriptTimeElapsed);
                    this.setState({goDisabled: false});
                }
            }, 990)
            //SSE events
            const source = new EventSource(serverUrl + '/api/blastp');
            source.onmessage = (e) => {
                if (e.data === 'Done!') {
                    clearInterval(scriptTimeElapsed);
                }
                this.setState({updates: <Header margin="2vh" size="0.5rem" className="updateMessage" title={e.data}/>})
            }
            //if protein name input
            if (this.state.proteinName !== '') {
                axios.post(serverUrl + '/api/blastp/name', {
                    type: 'regular',
                    proteinName: this.state.proteinName.toLowerCase(),
                    rangeStart: this.state.rangeStart,
                    rangeEnd: this.state.rangeEnd,
                    sciName: this.state.sciName,
                    reUse: this.state.reUse,
                    email: this.state.email,
                })
                .then(response => {
                    source.close();
                    this.runscriptRespHandle(response);
                })
                .catch(error => {
                    source.close();
                    this.runscriptErrHandle(error.response);
                })
            //if fasta file uploaded
            } else if (this.state.fastaInput !== '') {
                let blastForm = new FormData();
                blastForm.append('type', 'regular');
                blastForm.append('fasta', this.state.fastaInput);
                blastForm.append('rangeStart', this.state.rangeStart);
                blastForm.append('rangeEnd', this.state.rangeEnd);
                blastForm.append('sciName', this.state.sciName);
                blastForm.append('reUse', this.state.reUse);
                blastForm.append('email', this.state.email);
                axios.post(serverUrl + '/api/blastp/file', blastForm)
                .then(response => {
                    source.close();
                    this.runscriptRespHandle(response);
                })
                .catch(error => {
                    source.close();
                    this.runscriptErrHandle(error.response);
                })
            //if fasta text pasted
            } else {
                axios.post(serverUrl + '/api/blastp/text', {
                    type: 'regular',
                    fastaText: this.state.fastaText, 
                    rangeStart: this.state.rangeStart,
                    rangeEnd: this.state.rangeEnd,
                    sciName: this.state.sciName,
                    reUse: this.state.reUse,
                    email: this.state.email,
                })
                .then(response => {
                    source.close();
                    this.runscriptRespHandle(response);
                })
                .catch(error => {
                    source.close();
                    this.runscriptErrHandle(error.response);
                })
            }
            this.setState({result: '', resultFormatted: '', updates: <Header margin="2vh" size="0.5rem" className="updateMessage" title="Starting..."/>});
            //scroll to bottom of page
            setTimeout(() => document.querySelector('.imageResults').scrollIntoView({block: 'end', behavior: 'smooth'}), 1000);   
        } else {
            // error displaying
            this.setState({proteinNameErr: (noInput || inputTooLong === 'name') && true, fastaInputErr: (noInput || inputTooLong === 'file') && true, fastaTextErr: (noInput || inputTooLong === 'text'), rangeStartErr: rangeStartInvalid, rangeEndErr: rangeEndInvalid, emailErr: emailInvalid,
                errorMessage: errorMessage.map(element => {
                    return <Header margin="2vh 0 0 0" key={element+Date.now()} size="0.5rem" className="errorMessage" title={element}/>
                })
            })
        }
    }

    //handling files from response
    runscriptRespHandle(response) {
        clearInterval(scriptTimeElapsed);
        let gifPreResults = [];
        let txtPreResults = [];
        let finalTxtResults = [];
        response.data.url.forEach(file => {
            if (file.substr(-3, 3) === 'gif') {
                gifPreResults.push(file);
            } else if (file.substr(-3, 3) === 'txt') {
                txtPreResults.push(file);
            }
        })
        const gifResults = gifPreResults.map((image, index) => {
            if (index === 0 || index === 1) {
                return (  
                    <div className="hint--bottom hint--rounded hint--bounce imgContainer" aria-label="Key:&#xa;Yellow - Hydrophobic&#xa;Green - Hydrophilic&#xa;Cyan - Positive&#xa;Pink - Negative">
                        <fieldset>
                        <legend>{index === 0 ? "Local Alignment for Orthologs" + (response.data.filenamePrefix.length < 10 ?  " of "  + response.data.filenamePrefix : "") : "Local Alignment for Paralogs" + (response.data.filenamePrefix.length < 10 ?  " of "  + response.data.filenamePrefix : "")}</legend>
                        <img key={`${serverUrl + image}?${Date.now()}`} alt="alignment result" src={`${serverUrl + image}?${Date.now()}`}/>
                        </fieldset>
                    </div>
                );
            } else if (index === 2) {
                if (gifPreResults.length === 3) {
                    return (
                        <div className="imgContainer">
                            <fieldset>
                                <legend>Phylogenetic Trees</legend>
                                <img key={`${serverUrl + image}?${Date.now()}`} alt="alignment result" src={`${serverUrl + image}?${Date.now()}`}/> 
                            </fieldset>
                        </div>
                    )
                } else {
                    return <div></div>;
                }
            } else if (index === 3) {
                return (
                    <div className="imgContainer">
                        <fieldset>
                            <legend>Phylogenetic Trees</legend>
                            <img key={`${serverUrl + gifPreResults[index-1]}?${Date.now()}`} alt="alignment result" src={`${serverUrl + gifPreResults[index-1]}?${Date.now()}`}/> 
                            <img key={`${serverUrl + image}?${Date.now()}`} alt="alignment result" src={`${serverUrl + image}?${Date.now()}`}/> 
                        </fieldset>
                    </div>
                );
            } else {
                return <img key={`${serverUrl + image}?${Date.now()}`} alt="alignment result" src={`${serverUrl + image}?${Date.now()}`}/> 
            }
        })
        const txtResults = txtPreResults.map(txtFile => {
            return (axios.get(`${serverUrl + txtFile}?${Date.now()}`).then().catch());
        })
        Promise.all(txtResults).then(txtResponse => {
            finalTxtResults = txtResponse.map((indivRes, index) => {
                let label;
                if (index === 0) {
                    label = "Full Alignment Results for Orthologs";
                } else {
                    label = "Full Alignment Results for Paralogs";
                }
                return (<TextField
                    inputProps={{spellCheck: false}}
                    key={Date.now() + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}
                    className="textOutput"
                    label={label + (response.data.filenamePrefix.length < 10 ?  " of "  + response.data.filenamePrefix : "")}
                    multiline
                    rows = "8"
                    variant="outlined"
                    value={indivRes.data}
                />)
            })
            console.log(gifResults);
            console.log(finalTxtResults);
            let resultsFormatted = [gifResults[0], finalTxtResults[0], gifResults[1], finalTxtResults[1], gifResults[2], gifResults[3]];
            this.setState({filenamePrefix: response.data.filenamePrefix, result: response.data.url, resultFormatted: resultsFormatted, goDisabled: false}, () => {
                setTimeout(
                    () => {
                        this.setState({showScrollIndicator: true}, () => {
                            //seeing if user scrolled to "go button"
                            const observer = new IntersectionObserver((entries, observer) => {
                                entries.forEach(entry => {
                                    if (entry.isIntersecting) {
                                        this.setState({showScrollIndicator: false})
                                        observer.disconnect()
                                    }
                                })
                            });
                            const target = document.querySelector('.imageResults');
                            observer.observe(target);                        
                        })
                    }
                , 500)
            })
        });
    }

    //response err handling
    runscriptErrHandle(response) {
        clearInterval(scriptTimeElapsed);
        if (response.status === 400) {
            this.setState({errorMessage: <Header onClick={this.promptEmail} margin="2vh 15vw" size="0.5rem" className="errorMessage" title="Error: provided fasta does not exist. Please check input and try again."/>, result: '', updates: [], goDisabled: false})
        } else {
            if (this.state.email === '') {
                if (response !== undefined && response.status === 503) {
                    this.setState({errorMessage: <Header onClick={this.promptEmail} margin="2vh 15vw" size="0.5rem" className="errorMessage" title="The database servers may be currently unavailable, please try again at another time or enter your email above and click resubmit to send results to your email when available."/>, result: '', updates: [], resubmitEmail: true})
                } else {
                    this.setState({errorMessage: <Header onClick={this.promptEmail} margin="2vh 15vw" size="0.5rem" className="errorMessage" title="The website servers may be currently unavailable, please try again at another time or enter your email above and click resubmit to send results to your email when available."/>, result: '', updates: [], resubmitEmail: true})
                }
            } else {
                if (response !== undefined && response.status === 503) {
                    this.setState({errorMessage: <Header margin="2vh" size="0.5rem" className="errorMessage" title="The database servers may be currently unavailable, we will send results to your provided email when it is available."/>, result: '', updates: []})
                } else {
                    this.setState({errorMessage: <Header margin="2vh" size="0.5rem" className="errorMessage" title="The website servers may be currently unavailable, we will send results to your provided email when it is available."/>, result: '', updates: []})
                }
            }
        }
    }

    scheduleEmail() {
        //validation
        let noInput = false;
        let inputTooLong = 'false';
        let rangeStartInvalid = false;
        let rangeEndInvalid = false;
        let emailInvalid = false;
        let errorMessage = [];

        //protein input
        if (this.state.proteinName === '' && this.state.fastaInput === '' && this.state.fastaText === '') {
            noInput = true;
            errorMessage.push('Please enter a protein name, upload a file, or paste a fasta');
        } else {
            if (this.state.proteinName.length > 50) {
                inputTooLong = 'name';
                errorMessage.push('Please enter a valid Protein Name');
            } else {
                if (this.state.fastaInput.size > 20000) {
                    inputTooLong = 'file';
                    errorMessage.push('Please upload a file under 20KB.');
                } else {
                    if (this.state.fastaText.length > 20000) {
                        inputTooLong = 'text';
                        errorMessage.push('Please paste a valid fasta');
                    }
                }
            }
        }

        //range input
        if ((this.state.rangeStart === '' && this.state.rangeEnd !== '') || (this.state.rangeStart !== '' && (!Number.isInteger(parseInt(this.state.rangeStart)) || parseInt(this.state.rangeStart) < 0 || parseInt(this.state.rangeStart) > 10000))) {
            rangeStartInvalid = true;
            errorMessage.push('Please have a valid range start number');
        }
        
        if ((this.state.rangeEnd === '' && this.state.rangeStart !== '') || (this.state.rangeEnd !== '' && (!Number.isInteger(parseInt(this.state.rangeEnd)) || parseInt(this.state.rangeEnd) < 0 || parseInt(this.state.rangeEnd) > 10000))) {
            rangeEndInvalid = true;
            errorMessage.push('Please have a valid range end number');
        } else if (parseInt(this.state.rangeEnd) <= parseInt(this.state.rangeStart)) {
            this.setState(prevState => ({rangeEnd: 50, rangeStart: 25}))
        }

        //email input
        const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (this.state.email !== '' && !emailRegex.test(String(this.state.email).toLowerCase())) {
            emailInvalid = true;
            errorMessage.push('Please enter a valid email');
        }

        //requests
        if (!noInput && inputTooLong === 'false' && !rangeStartInvalid && !rangeEndInvalid && !emailInvalid) {
            //resetting
            this.setState({proteinNameErr: false, fastaInputErr: false, fastaTextErr: false, rangeStartErr: false, rangeEndErr: false, errorMessage: '', updates: [], scriptDuration: '', goDisabled: true})
            //if protein name input
            if (this.state.proteinName !== '') {
                axios.post(serverUrl + '/api/blastp/name', {
                    type: 'emailOnly',
                    proteinName: this.state.proteinName,
                    rangeStart: this.state.rangeStart,
                    rangeEnd: this.state.rangeEnd,
                    sciName: this.state.sciName,
                    reUse: this.state.reUse,
                    email: this.state.email,
                })
            //if fasta file uploaded
            } else if (this.state.fastaInput !== '') {
                let blastForm = new FormData();
                blastForm.append('type', 'emailOnly');
                blastForm.append('fasta', this.state.fastaInput);
                blastForm.append('rangeStart', this.state.rangeStart);
                blastForm.append('rangeEnd', this.state.rangeEnd);
                blastForm.append('sciName', this.state.sciName);
                blastForm.append('reUse', this.state.reUse);
                blastForm.append('email', this.state.email);
                axios.post(serverUrl + '/api/blastp/file', blastForm)
            //if fasta text pasted
            } else {
                axios.post(serverUrl + '/api/blastp/text', {
                    type: 'emailOnly',
                    fastaText: this.state.fastaText, 
                    rangeStart: this.state.rangeStart,
                    rangeEnd: this.state.rangeEnd,
                    sciName: this.state.sciName,
                    reUse: this.state.reUse,
                    email: this.state.email,
                })
            }
            this.setState({result: '', resultFormatted: '', resubmitEmail: false, updates: <Header margin="2vh" size="0.5rem" className="updateMessage" title="We're sorry about the inconvenience. A email will be sent in a couple hours if results are available. If not, please try again later."/>});
        } else {
            // error displaying
            this.setState({proteinNameErr: (noInput || inputTooLong === 'name') && true, fastaInputErr: (noInput || inputTooLong === 'file') && true, fastaTextErr: (noInput || inputTooLong === 'text'), rangeStartErr: rangeStartInvalid, rangeEndErr: rangeEndInvalid, emailErr: emailInvalid,
                errorMessage: errorMessage.map(element => {
                    return <Header margin="2vh 0 0 0" key={element+Date.now()} size="0.5rem" className="errorMessage" title={element}/>
                })
            })
        }        
    }

    //form updaters

    updateFile(event) {
        if (typeof event.target.files[0] !== 'undefined') {
            this.setState({fastaInput: event.target.files[0], fastaInputTitle: event.target.files[0].name, fastaInputErr: false, proteinNameErr: false, fastaTextErr: false})
        }
    }

    clearFile(event) {
        this.setState({fastaInputKey: Math.random().toString(36), fastaInput: '', fastaInputTitle: '', fastaInputErr: false})
    }

    updateName(event) {
        this.setState({proteinName: event.target.value, fastaInputErr: false, proteinNameErr: false, fastaTextErr: false})
    }

    updateFastaPaste(event) {
        this.setState({fastaText: event.target.value, fastaInputErr: false, proteinNameErr: false, fastaTextErr: false})
    }

    updateRangeStart(event) {
        this.setState({rangeStart: event.target.value, rangeStartErr: false})
    }

    updateRangeEnd(event) {
        this.setState({rangeEnd: event.target.value, rangeEndErr: false})
    }

    updateSciName(event) {
        this.setState({sciName: event.target.value === 'true' ? true : false})
    }

    updateReCalc(event) {
        this.setState({reUse: event.target.value === 'true' ? true : false})
    }

    updateEmail(event) {
        this.setState({email: event.target.value})
    }

    resetFields() {
        this.setState({
            //result from blastp request
            filenamePrefix: '',
            updates: '',
            result: '',
            resultFormatted: '',

            //disable go when running
            goDisabled: false,

            fastaInput: '',
            fastaInputTitle: '',
            //to force fasta input and make clear button work
            fastaInputKey: Math.random().toString(36),
            fastaInputErr: false,

            proteinName: '',
            proteinNameErr: false,

            fastaText: '',
            fastaTextErr: false,

            rangeStart: '',
            rangeStartErr: false,
            rangeEnd: '',
            rangeEndErr: false,

            sciName: false,
            reUse: true,
            email: '',
            emailErr: false,
            resubmitEmail: false,

            errorMessage: '',
            scriptDuration: '',
        })
    }

    //has to post to make zip and then get
    downloadResults() {
        if (this.state.result !== undefined && this.state.result !== '') {
            axios.post(serverUrl + '/api/download', {
                url: this.state.result,
                filenamePrefix: this.state.filenamePrefix
            }).then(response => {
                window.open(serverUrl + '/api/download');
            }).catch(err => {
            })
        }
    }

    scrollToGo() {
        if (this.state.resultFormatted !== '') {
            this.setState({showScrollIndicator: false}, () => {
                document.querySelector('.imageResults').scrollIntoView({ behavior: 'smooth'})
            })
        } else {
            this.setState({showScrollIndicator: false}, () => {
                document.querySelector('.sendButton').scrollIntoView({ behavior: 'smooth'})
            })   
        }
    }

    render() {
        return (
            <div className="BlastRequest">
                <div className={`popUp ${this.state.popUp && 'popUpShown'}`}>
                    <Card elevation={10} className="popContent">
                        <Header margin="0 0 5vh 0" title="About this Website"/>
                        <div className="textContent">
                            <Header margin="0 0 3vh 0" size="0.5rem" title={<div>Authors: Daniel Ji, Maggie Li, Sandra Li, Binghui Shen and Hongzhi Li (<a href="mailto:holi@coh.org">holi@coh.org</a>), City of Hope National Medical Center, Duarte, California, USA</div>} />
                            <p>
                            LisAln (LIberal Sequence ALigNment) is a hit-the-button website to find orthologs (same genes/proteins across species) and paralogs (similar genes/proteins inside human) of a protein for general scientists or amateurs. It is developed at City of Hope National Medical Center. Users can either input a protein name, fasta sequence, or fasta file to search for a protein. Users can also select the sequence range of human protein and name type for species (scientific or general names) to display the alignment results from EMBL Clustal Omega and Uniprot. LisAln will automatically search the orthologs and paralogs from NCBI Landmark and Homologene databases. It will pick the appropriate proteins to display the results of whole sequence alignments, local aligned sequences that users are interested in, phylogenetic trees, sequence identity heatmap, etc. 
                            </p>
                        </div>
                        <Button className="popButton" disableElevation variant="outlined" component="label" onClick={this.descriptionToggle}>Ok</Button>
                    </Card>
                </div>
                <Header className="title" margin="0 0 5vh 0" size="2rem" title="LisAln (LIberal Sequence ALigNment)" onClick={this.descriptionToggle}/>
                <div className="inputField">
                    <Header margin="0 0 3vh 0" size="1rem" title="Main input (enter one)" help="If multiple selections filled, will default to Protein Name, then File Upload, and then Pasted Fasta"/>
                    <div className="rowInput">
                        <TextField error={this.state.proteinNameErr} label="Protein Name Here" variant="outlined" value={this.state.proteinName} onChange={this.updateName}/>
                        <Button className={this.state.fastaInputErr ? 'buttonError' : ''} disableElevation variant="contained" component="label">Upload Fasta {this.state.fastaInputTitle !== '' && `(Selected file: ${this.state.fastaInputTitle})`}
                            <input
                                key={this.state.fastaInputKey}
                                accept=".txt,.fasta"
                                type="file"
                                name='fasta'
                                style={{ display: "none" }}
                                onChange={(event) => this.updateFile(event)}
                                ref={ref => (this.fileInput = ref)}
                            />
                        </Button>
                        {this.state.fastaInputTitle !== '' && <Button disableElevation variant="contained" onClick={this.clearFile}>Clear</Button>}
                    </div>
                    <TextField
                        label="Paste Fasta Here"
                        multiline
                        rows = "8"
                        variant="outlined"
                        value={this.state.fastaText}
                        error={this.state.fastaTextErr}
                        onChange={this.updateFastaPaste}
                    />
                    <Header margin="5vh 0 2vh 0" size="0.8rem" title="Optional Inputs" />
                    <Header margin="0 0 3vh 0" size="0.6rem" title="Display Range" help="The sequence range to display alignment"/>
                    <div className="rowInput">
                        <TextField error={this.state.rangeStartErr} label="Starting #" variant="outlined" value={this.state.rangeStart} onChange={this.updateRangeStart}/>
                        <TextField error={this.state.rangeEndErr} label="Ending #" variant="outlined" value={this.state.rangeEnd} onChange={this.updateRangeEnd}/>
                    </div>
                    <div className="rowSelectInput">
                            <Header margin="0 1rem 0 0" size="0.5rem" title="Use scientific name?" leftHelp help="Example: If marked yes, will output Homo Sapiens instead of Human"/>
                            <FormControl>
                                <RadioGroup aria-label="Scientific Name" value={this.state.sciName} onChange={this.updateSciName}>
                                    <FormControlLabel value={true} control={<Radio color='primary'/>} label="Yes" />
                                    <FormControlLabel value={false} control={<Radio color='primary'/>} label="No" />
                                </RadioGroup>
                            </FormControl>
                    </div>
                    <div className="rowSelectInput" style={{marginBottom: '3vh'}}>
                        <Header margin="0 1rem 0 0" size="0.5rem" title="Use previous data?&nbsp;&nbsp;" leftHelp help="Will use previous data if it already has been stored - can drastically improve speed."/>
                        <FormControl>
                            <RadioGroup aria-label="Recalc" value={this.state.reUse} onChange={this.updateReCalc}>
                                <FormControlLabel value={true} control={<Radio color='primary'/>} label="Yes" />
                                <FormControlLabel value={false} control={<Radio color='primary'/>} label="No" />
                            </RadioGroup>
                        </FormControl>
                    </div>
                    <div className="rowInput">
                        <div className="hint--left hint--rounded hint--bounce hintContainer hintBigger" aria-label="To additionally send results to the email (may take some time). If servers are down, inputting your email will send results to you when they are available."><img src={helpLogo} alt="Info icon"/></div>
                        <TextField className="longTextField" error={this.state.emailErr} label="Email address" variant="outlined" value={this.state.email} onChange={this.updateEmail}/>
                    </div>
                    {this.state.resubmitEmail && <Button className="resubmitButton" disableElevation variant="contained" onClick={this.scheduleEmail}>Resubmit</Button>}
                    <Header maxWidth="90%" margin="2vh 0 0 0" size="0.5rem" title={<div>For support, questions, comments, and concerns, contact: <a href="mailto:lisaln.results@gmail.com">lisaln.results@gmail.com</a></div>} />
                </div>
                <div className="userButtons">
                    <Button className="sendButton" variant="contained" disableElevation disabled={this.state.goDisabled} onClick={this.runscript}>Go</Button>
                    {this.state.result !== '' && <Button className="downloadButton" variant="contained" disableElevation onClick={this.downloadResults}>Download Results</Button>}
                    <Button className="resetButton" variant="contained" disableElevation disabled={this.state.goDisabled} onClick={this.resetFields}>Reset</Button>
                </div>
                {this.state.scriptDuration !== '' && this.state.scriptDuration}
                {this.state.errorMessage !== '' && this.state.errorMessage}
                {this.state.updates.length !== 0 && this.state.updates}
                <div className="imageResults">{this.state.resultFormatted}</div>
                <div className={`scrollIndicator ${this.state.showScrollIndicator ? 'shown': 'fadeOut'}`} onClick={this.scrollToGo}><span/></div>
            </div>
        )
    }
}

export default BlastRequest