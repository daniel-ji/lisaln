import React, { Component } from 'react'
import axios from 'axios'
import Header from './Header';

import { Button, TextField} from '@material-ui/core'; 

import smoothscroll from 'smoothscroll-polyfill';

const serverUrl = 'http://localhost:3000';

class BlastRequest extends Component {
    
    constructor(props) {
        super(props)
    
        this.state = {
            //result from blastp request
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

            errorMessage: '',
            showScrollIndicator: true
        }

        this.runscript = this.runscript.bind(this);
        this.runscriptRespHandle = this.runscriptRespHandle.bind(this);
        this.updateFile = this.updateFile.bind(this);
        this.clearFile = this.clearFile.bind(this);
        this.updateName = this.updateName.bind(this);
        this.updateFastaPaste = this.updateFastaPaste.bind(this);
        this.updateRangeStart = this.updateRangeStart.bind(this);
        this.updateRangeEnd = this.updateRangeEnd.bind(this);
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
        let errorMessage = [];

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
                    errorMessage.push('Please upload a valid file');
                } else {
                    if (this.state.fastaText.length > 20000) {
                        inputTooLong = 'text';
                        errorMessage.push('Please paste a valid fasta');
                    }
                }
            }
        }

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

        //requests
        if (!noInput && inputTooLong === 'false' && !rangeStartInvalid && !rangeEndInvalid) {
            this.setState({proteinNameErr: false, fastaInputErr: false, fastaTextErr: false, rangeStartErr: false, rangeEndErr: false, errorMessage: ''})
            //if protein name input
            if (this.state.proteinName !== '') {
                axios.post(serverUrl + '/api/blastp/name', {
                    proteinName: this.state.proteinName,
                    rangeStart: this.state.rangeStart,
                    rangeEnd: this.state.rangeEnd
                })
                .then(response => {
                    this.runscriptRespHandle(response);
                })
                .catch(error => {
                    this.setState({result: error.data})
                })
                this.setState({result: '', resultFormatted: ''});
            //if fasta file uploaded
            } else if (this.state.fastaInput !== '') {
                let blastForm = new FormData();
                blastForm.append('fasta', this.state.fastaInput);
                blastForm.append('rangeStart', this.state.rangeStart);
                blastForm.append('rangeEnd', this.state.rangeEnd);
                axios.post(serverUrl + '/api/blastp/file', blastForm, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                })
                .then(response => {
                    this.runscriptRespHandle(response);
                })
                .catch(error => {
                    this.setState({result: error.data})
                })
                this.setState({result: '', resultFormatted: ''});
            //if fasta text pasted
            } else {
                axios.post(serverUrl + '/api/blastp/text', {
                    fastaText: this.state.fastaText, 
                    rangeStart: this.state.rangeStart,
                    rangeEnd: this.state.rangeEnd
                })
                .then(response => {
                    this.runscriptRespHandle(response);
                })
                .catch(error => {
                    this.setState({result: error.data})
                })
                this.setState({result: '', resultFormatted: ''});
            }   
        } else {
            // error displaying
            console.log(errorMessage);
            this.setState({proteinNameErr: (noInput || inputTooLong === 'name') && true, fastaInputErr: (noInput || inputTooLong === 'file') && true, fastaTextErr: (noInput || inputTooLong === 'text'), rangeStartErr: rangeStartInvalid && true, rangeEndErr: rangeEndInvalid && true,
                errorMessage: errorMessage.map(element => {
                    return <Header margin="2vh" key={element+Date.now()} size="0.5rem" className="errorMessage" title={element}/>
                })
            }, () => console.log(this.state.errorMessage))
        }
    }

    //handling images from response
    runscriptRespHandle(response) {
        this.setState({result: response.data.url, resultFormatted: response.data.url.map(image => {
            return <img key={`${serverUrl + image}?${Date.now()}`} alt="alignment result" data-lazy={`${serverUrl + image}?${Date.now()}`}/>
        })}, () => {
            //lazy loading images
            const targets = document.querySelectorAll('img');
            const lazyload = target => {
                const io = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            console.log('asdf');
                            const img = entry.target;
                            const src = img.getAttribute('data-lazy');
                            img.setAttribute('src', src);
                            img.classList.add('fadeIn');
                            observer.disconnect();
                        }
                    })
                })
                io.observe(target);
            }
            targets.forEach(lazyload);
            setTimeout(
                () => {
                    this.setState({showScrollIndicator: true}, () => {
                        //seeing if user scrolled to "go button"
                        const observer = new IntersectionObserver((entries, observer) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting) {
                                    console.log('asdfg');
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

    //has to post to make zip and then get
    downloadResults() {
        axios.post(serverUrl + '/api/download', {
            url: this.state.result
        }).then(response => {
            window.open(serverUrl + '/api/download');
        }).catch(err => {
            console.log(err)
        })
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
                <Header size="2rem" title="LisAln Blast Request" />
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
                    <Header size="1rem" title="Range (optional)" />
                    <div className="rowInput">
                        <TextField error={this.state.rangeStartErr} label="Starting #" variant="outlined" value={this.state.rangeStart} onChange={this.updateRangeStart}/>
                        <TextField error={this.state.rangeEndErr} label="Ending #" variant="outlined" value={this.state.rangeEnd} onChange={this.updateRangeEnd}/>
                    </div>
                </div>
                <Button className="sendButton" variant="contained" disableElevation onClick={this.runscript}>Go</Button>
                <br/>
                {this.state.errorMessage !== '' && this.state.errorMessage}
                {this.state.result !== '' && <Button className="downloadButton" variant="contained" disableElevation onClick={this.downloadResults}>Download Results</Button>}
                <div className="imageResults">{this.state.resultFormatted}</div>
                <div className={`scrollIndicator ${this.state.showScrollIndicator ? 'shown': 'fadeOut'}`} onClick={this.scrollToGo}><span/></div>
            </div>
        )
    }
}

export default BlastRequest