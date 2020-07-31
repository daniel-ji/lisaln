import React, { Component } from 'react'
import axios from 'axios'
import Header from './Header';

import { Button, TextField} from '@material-ui/core'; 

class BlastRequest extends Component {
    
    constructor(props) {
        super(props)
    
        this.state = {
            result: '',
            fastaInput: '',
            fastaInputTitle: '',
            proteinName: '',
            fastaText: '',
            nameFilePaste: '',
            rangeStart: '',
            rangeEnd: ''
        }

        this.runscript = this.runscript.bind(this);
        this.updateFile = this.updateFile.bind(this);
        this.updateName = this.updateName.bind(this);
        this.updateFastaPaste = this.updateFastaPaste.bind(this);
        this.clearFile = this.clearFile.bind(this);
        this.updateRangeStart = this.updateRangeStart.bind(this);
        this.updateRangeEnd = this.updateRangeEnd.bind(this);
    }

    //need to add validation
    runscript() {
        if (this.state.proteinName !== '') {
            axios.post('http://localhost:3000/api/blastp/name', {
                proteinName: this.state.proteinName,
                rangeStart: this.state.rangeStart,
                rangeEnd: this.state.rangeEnd
            })
            .then(response => {
                this.setState({result: response.data})
            })
            .catch(error => {
                this.setState({result: error.data})
            })
        } else if (this.state.fastaText === '') {
            let blastForm = new FormData();
            blastForm.append('fasta', this.state.fastaInput);
            axios.post('http://localhost:3000/api/blastp/file', blastForm, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                data: {
                    rangeStart: this.state.rangeStart,
                    rangeEnd: this.state.rangeEnd
                }
            })
            .then(response => {
                this.setState({result: response.data})
            })
            .catch(error => {
                this.setState({result: error.data})
            })
        } else {
            axios.post('http://localhost:3000/api/blastp/text', {
                fastaText: this.state.fastaText, 
                rangeStart: this.state.rangeStart,
                rangeEnd: this.state.rangeEnd
            })
            .then(response => {
                this.setState({result: response.data})
            })
            .catch(error => {
                this.setState({result: error.data})
            })
        }
    }

    updateFile(event) {
        if (typeof event.target.files[0] !== 'undefined') {
            this.setState({fastaInput: event.target.files[0], fastaInputTitle: event.target.files[0].name})
        }
    }

    clearFile() {
        this.setState({fastaInput: '', fastaInputTitle: ''})
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

    render() {
        return (
            <div className="BlastRequest">
                <Header size="2rem" title="LisAln Blast Request" />
                <div className="inputField">
                    <Header size="1rem" title="Enter one of the three:" />
                    <div className="rowInput">
                        <TextField label="Protein Name Here" variant="outlined" value={this.state.proteinName} onChange={this.updateName}/>
                        <Button disableElevation variant="contained" component="label">Upload Fasta {this.state.fastaInputTitle !== '' && `(Selected file: ${this.state.fastaInputTitle})`}
                            <input
                                accept=".txt,.fasta"
                                type="file"
                                name='fasta'
                                style={{ display: "none" }}
                                onChange={this.updateFile}
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
                    <Header size="1rem" title="Range" />
                    <div className="rowInput">
                        <TextField label="Starting #" variant="outlined" value={this.state.rangeStart} onChange={this.updateRangeStart}/>
                        <TextField label="Ending #" variant="outlined" value={this.state.rangeEnd} onChange={this.updateRangeEnd}/>
                    </div>
                </div>
                <Button className="sendButton" variant="contained" disableElevation onClick={this.runscript}>Go</Button>
                {this.state.result}
            </div>
        )
    }
}

export default BlastRequest