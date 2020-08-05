import React, { Component } from 'react'
import axios from 'axios'
import Header from './Header';

import { Button, TextField} from '@material-ui/core'; 

import smoothscroll from 'smoothscroll-polyfill';

class BlastRequest extends Component {
    
    constructor(props) {
        super(props)
    
        this.state = {
            result: '',
            fastaInput: '',
            fastaInputTitle: '',
            fastaInputKey: Math.random().toString(36),
            proteinName: '',
            fastaText: '',
            nameFilePaste: '',
            rangeStart: '',
            rangeEnd: '',
            serverUrl: 'http://localhost:3000',
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
        this.scrollToGo = this.scrollToGo.bind(this);
    }

    componentDidMount() {
        smoothscroll.polyfill();
    }

    //need to add validation
    runscript() {
        if (this.state.proteinName !== '') {
            axios.post(this.state.serverUrl + '/api/blastp/name', {
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
        } else if (this.state.fastaInput !== '') {
            let blastForm = new FormData();
            blastForm.append('fasta', this.state.fastaInput);
            blastForm.append('rangeStart', this.state.rangeStart);
            blastForm.append('rangeEnd', this.state.rangeEnd);
            axios.post(this.state.serverUrl + '/api/blastp/file', blastForm, {
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
        } else if (this.state.fastaText !== '') {
            axios.post(this.state.serverUrl + '/api/blastp/text', {
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
        }
    }

    runscriptRespHandle(response) {
        this.setState({result: response.data.url.map((image, index) => {
            return <img key={`${this.state.serverUrl + image}?${Date.now()}`} alt="alignment result" src={`${this.state.serverUrl + image}?${Date.now()}`}/>
        })}, () => {
            setTimeout(() => document.querySelector('.imageResults').scrollIntoView({ behavior: 'smooth' }), 500)
        })
    }

    updateFile(event) {
        if (typeof event.target.files[0] !== 'undefined') {
            this.setState({fastaInput: event.target.files[0], fastaInputTitle: event.target.files[0].name})
        }
    }

    clearFile(event) {
        this.setState({fastaInputKey: Math.random().toString(36), fastaInput: '', fastaInputTitle: ''})
    }

    updateName(event) {
        this.setState({proteinName: event.target.value})
    }

    updateFastaPaste(event) {
        this.setState({fastaText: event.target.value})
    }

    updateRangeStart(event) {
        this.setState({rangeStart: event.target.value})
    }

    updateRangeEnd(event) {
        this.setState({rangeEnd: event.target.value})
    }

    scrollToGo() {
        this.setState({showScrollIndicator: false}, () => {
            document.querySelector('.sendButton').scrollIntoView({ behavior: 'smooth' })
        })
    }

    render() {
        return (
            <div className="BlastRequest">
                <Header size="2rem" title="LisAln Blast Request" />
                <div className="inputField">
                    <Header lessMargin size="1rem" title="Enter one of the three:"/>
                    <Header moreMargin size="0.4rem" title="(If multiple selections filled, will default to Protein Name, then File Upload, and then Pasted Fasta)" />
                    <div className="rowInput">
                        <TextField label="Protein Name Here" variant="outlined" value={this.state.proteinName} onChange={this.updateName}/>
                        <Button disableElevation variant="contained" component="label">Upload Fasta {this.state.fastaInputTitle !== '' && `(Selected file: ${this.state.fastaInputTitle})`}
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
                        onChange={this.updateFastaPaste}
                    />
                </div>
                <div className="inputField">
                    <Header size="1rem" title="Range (optional)" />
                    <div className="rowInput">
                        <TextField label="Starting #" variant="outlined" value={this.state.rangeStart} onChange={this.updateRangeStart}/>
                        <TextField label="Ending #" variant="outlined" value={this.state.rangeEnd} onChange={this.updateRangeEnd}/>
                    </div>
                </div>
                <Button className="sendButton" variant="contained" disableElevation onClick={this.runscript}>Go</Button>
                <br/>
                <div className="imageResults">{this.state.result}</div>
                <div className={`scrollIndicator ${this.state.showScrollIndicator ? 'shown': 'fadeOut'}`} onClick={this.scrollToGo}><span/></div>
            </div>
        )
    }
}

export default BlastRequest