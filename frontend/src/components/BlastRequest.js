import React, { Component } from 'react'
import axios from 'axios'
import Header from './Header';

import { Button, TextField, Radio, RadioGroup, FormControl, FormControlLabel} from '@material-ui/core'; 

import smoothscroll from 'smoothscroll-polyfill';

const serverUrl = 'http://localhost:3000';
const CancelToken = axios.CancelToken;
const Csource = CancelToken.source();
let scriptTimeElapsed;

class BlastRequest extends Component {
    
    constructor(props) {
        super(props)
    
        this.state = {
            //result from blastp request
            filenameprefix: '',
            updates: [],
            result: '',
            resultFormatted: '',

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

            errorMessage: '',
            showScrollIndicator: true,
            scriptDuration: '',
        }

        this.runscript = this.runscript.bind(this);
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
        this.downloadResults = this.downloadResults.bind(this);
        this.scrollToGo = this.scrollToGo.bind(this);
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
            this.setState({proteinNameErr: false, fastaInputErr: false, fastaTextErr: false, rangeStartErr: false, rangeEndErr: false, errorMessage: '', updates: [], scriptDuration: ''})
            let rawData = [];
            //timers
            let startTime = new Date().getTime();
            scriptTimeElapsed = setInterval(() => {
                let diff = new Date().getTime();
                let minutes = Math.floor((diff-startTime) / (1000 * 60));
                let seconds = Math.floor(((diff-startTime) / 1000 ) % 60);
                this.setState({scriptDuration:  <Header margin="2vh" size="0.5rem" className="updateMessage" title={`Time elapsed: ${minutes}m ${seconds}s`}/>});
                if (minutes === 5) {
                    clearInterval(scriptTimeElapsed);
                    Csource.cancel('Web server may be down');
                }
            }, 1000)
            //SSE events
            const source = new EventSource(serverUrl + '/api/blastp');
            source.onmessage = (e) => {
                rawData.push(e.data);
                if (e.data === 'Done!') {
                    clearInterval(scriptTimeElapsed);
                }
                this.setState({updates: rawData.map((item) => {
                    return <Header margin="2vh" key={item+Date.now()} size="0.5rem" className="updateMessage" title={item}/>
                })})
            }
            //if protein name input
            if (this.state.proteinName !== '') {
                axios.post(serverUrl + '/api/blastp/name', {
                    proteinName: this.state.proteinName,
                    rangeStart: this.state.rangeStart,
                    rangeEnd: this.state.rangeEnd,
                    sciName: this.state.sciName,
                    reUse: this.state.reUse,
                    email: this.state.email,
                }, {cancelToken: Csource.token})
                .then(response => {
                    source.close();
                    this.runscriptRespHandle(response);
                })
                .catch(error => {
                    source.close();
                    this.runscriptErrHandle(error.response);
                })
                this.setState({result: '', resultFormatted: ''});
            //if fasta file uploaded
            } else if (this.state.fastaInput !== '') {
                let blastForm = new FormData();
                blastForm.append('fasta', this.state.fastaInput);
                blastForm.append('rangeStart', this.state.rangeStart);
                blastForm.append('rangeEnd', this.state.rangeEnd);
                blastForm.append('sciName', this.state.sciName);
                blastForm.append('reUse', this.state.reUse);
                blastForm.append('email', this.state.email);
                axios.post(serverUrl + '/api/blastp/file', blastForm, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    cancelToken: Csource.token
                })
                .then(response => {
                    source.close();
                    this.runscriptRespHandle(response);
                })
                .catch(error => {
                    source.close();
                    this.runscriptErrHandle(error.response);
                })
                this.setState({result: '', resultFormatted: ''});
            //if fasta text pasted
            } else {
                axios.post(serverUrl + '/api/blastp/text', {
                    fastaText: this.state.fastaText, 
                    rangeStart: this.state.rangeStart,
                    rangeEnd: this.state.rangeEnd,
                    sciName: this.state.sciName,
                    reUse: this.state.reUse,
                    email: this.state.email,
                }, {cancelToken: source.token})
                .then(response => {
                    source.close();
                    this.runscriptRespHandle(response);
                })
                .catch(error => {
                    source.close();
                    this.runscriptErrHandle(error.response);
                })
                this.setState({result: '', resultFormatted: ''});
            }
            //scroll to bottom of page
            setTimeout(() => document.querySelector('.imageResults').scrollIntoView({block: 'end', behavior: 'smooth'}), 1000);   
        } else {
            // error displaying
            this.setState({proteinNameErr: (noInput || inputTooLong === 'name') && true, fastaInputErr: (noInput || inputTooLong === 'file') && true, fastaTextErr: (noInput || inputTooLong === 'text'), rangeStartErr: rangeStartInvalid, rangeEndErr: rangeEndInvalid, emailErr: emailInvalid,
                errorMessage: errorMessage.map(element => {
                    return <Header margin="2vh" key={element+Date.now()} size="0.5rem" className="errorMessage" title={element}/>
                })
            })
        }
    }

    //handling files from response
    runscriptRespHandle(response) {
        clearInterval(scriptTimeElapsed);
        let gifPreResults = [];
        let txtPreResults = [];
        let finalResults = [];
        response.data.url.forEach(file => {
            if (file.substr(-3, 3) === 'gif') {
                gifPreResults.push(file);
            } else if (file.substr(-3, 3) === 'txt') {
                txtPreResults.push(file);
            }
        })
        const gifResults = gifPreResults.map(image => {
            return <img key={`${serverUrl + image}?${Date.now()}`} alt="alignment result" src={`${serverUrl + image}?${Date.now()}`}/>
        })
        const txtResults = txtPreResults.map(txtFile => {
            return (axios.get(`${serverUrl + txtFile}?${Date.now()}`).then().catch());
        })
        Promise.all(txtResults).then(txtResponse => {
            finalResults = txtResponse.map(indivRes => {
                return (<TextField
                    key={Date.now()}
                    className="textOutput"
                    label="Full Alignment Results"
                    multiline
                    rows = "8"
                    variant="outlined"
                    value={indivRes.data}
                />)
            })
            let resultsFormatted = [...gifResults, ...finalResults];
            this.setState({filenameprefix: response.data.filenameprefix, result: response.data.url, resultFormatted: resultsFormatted}, () => {
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

    //resp err handling
    runscriptErrHandle(response) {
        clearInterval(scriptTimeElapsed);
        if (response !== undefined && response.status === 503) {
            this.setState({errorMessage: <Header margin="2vh" size="0.5rem" className="errorMessage" title="The database servers may be currently unavailable, please try again at another time."/>, result: '', updates: []})
        } else {
            this.setState({errorMessage: <Header margin="2vh" size="0.5rem" className="errorMessage" title="The website servers may be currently unavailable, please try again at another time."/>, result: '', updates: []})
        }
    }

    updateFile(event) {
        if (typeof event.target.files[0] !== 'undefined') {
            this.setState({fastaInput: event.target.files[0], fastaInputTitle: event.target.files[0].name, fastaInputErr: false})
        }
    }

    clearFile(event) {
        this.setState({fastaInputKey: Math.random().toString(36), fastaInput: '', fastaInputTitle: '', fastaInputErr: false})
    }

    updateName(event) {
        this.setState({proteinName: event.target.value, proteinNameErr: false})
    }

    updateFastaPaste(event) {
        this.setState({fastaText: event.target.value, fastaTextErr: false})
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

    //has to post to make zip and then get
    downloadResults() {
        if (this.state.result !== undefined && this.state.result !== '') {
            axios.post(serverUrl + '/api/download', {
                url: this.state.result,
                filenameprefix: this.state.filenameprefix
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
                <Header margin="0 0 5vh 0" size="2rem" title="LisAln Blast Request" />
                <div className="inputField">
                    <Header margin="3vh" size="1rem" title="Enter one of the three:"/>
                    <Header margin="7vh" size="0.4rem" title="(If multiple selections filled, will default to Protein Name, then File Upload, and then Pasted Fasta)" />
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
                </div>
                <div className="inputField">
                    <Header margin="0 0 5vh 0" size="1.25rem" title="Optional Inputs" />
                    <Header margin="0 0 5vh 0" size="1rem" title="Range" help="A range of which area of the protein to align"/>
                    <div className="rowInput">
                        <TextField error={this.state.rangeStartErr} label="Starting #" variant="outlined" value={this.state.rangeStart} onChange={this.updateRangeStart}/>
                        <TextField error={this.state.rangeEndErr} label="Ending #" variant="outlined" value={this.state.rangeEnd} onChange={this.updateRangeEnd}/>
                    </div>
                    <Header  margin="0 0 3vh 0" size="0.9rem" title="Use Scientific Name" help="Example: If marked yes, will output Homo Sapiens instead of Human"/>
                    <FormControl>
                        <RadioGroup aria-label="Scientific Name" value={this.state.sciName} onChange={this.updateSciName}>
                            <FormControlLabel value={true} control={<Radio color='primary'/>} label="Yes" />
                            <FormControlLabel value={false} control={<Radio color='primary'/>} label="No" />
                        </RadioGroup>
                    </FormControl>
                    <Header margin="5vh 0 3vh 0" size="0.9rem" title="Use previous data?" help="Will use previous data if it already has been stored - can drastically improve speed."/>
                    <FormControl>
                        <RadioGroup aria-label="Recalc" value={this.state.reUse} onChange={this.updateReCalc}>
                            <FormControlLabel value={true} control={<Radio color='primary'/>} label="Yes" />
                            <FormControlLabel value={false} control={<Radio color='primary'/>} label="No" />
                        </RadioGroup>
                    </FormControl>
                    <Header margin="5vh 0 3vh 0" size="0.9rem" title="Email" help="To additionally send results to the email."/>
                    <div className="rowInput">
                        <TextField className="longTextField" error={this.state.emailErr} label="Email address" variant="outlined" value={this.state.email} onChange={this.updateEmail}/>
                    </div>
                </div>
                <Button className="sendButton" variant="contained" disableElevation onClick={this.runscript}>Go</Button>
                <br/>
                {this.state.scriptDuration !== '' && this.state.scriptDuration}
                {this.state.errorMessage !== '' && this.state.errorMessage}
                {this.state.updates.length !== 0 && this.state.updates}
                {this.state.result !== '' && <Button className="downloadButton" variant="contained" disableElevation onClick={this.downloadResults}>Download Results</Button>}
                <div className="imageResults">{this.state.resultFormatted}</div>
                <div className={`scrollIndicator ${this.state.showScrollIndicator ? 'shown': 'fadeOut'}`} onClick={this.scrollToGo}><span/></div>
            </div>
        )
    }
}

export default BlastRequest