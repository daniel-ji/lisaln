import React, { Component } from 'react'
import axios from 'axios'
import Header from './Header';

import { Button, Radio, RadioGroup, FormControlLabel, TextField} from '@material-ui/core'; 

class BlastRequest extends Component {
    
    constructor(props) {
        super(props)
    
        this.state = {
            result: '',
            fileOrName: 'name',
            fastaInput: '',
            fastaInputTitle: '',
            proteinName: '',
        }

        this.runscript = this.runscript.bind(this);
        this.updateFileOrName = this.updateFileOrName.bind(this);
        this.updateFile = this.updateFile.bind(this);
        this.updateName = this.updateName.bind(this);
    }

    //need to add validation
    runscript() {
        if (this.state.fileOrName === 'name') {
            if (this.state.proteinName !== '') {
                axios.post('http://localhost:3000/api/blastp/name', {
                    proteinName: this.state.proteinName
                })
                .then(response => {
                    this.setState({result: response.data})
                })
                .catch(error => {
                    this.setState({result: error.data})
                })
            }
        } else {
            let blastForm = new FormData();
            blastForm.append('fasta', this.state.fastaInput);
            axios.post('http://localhost:3000/api/blastp/file', blastForm, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            .then(response => {
                this.setState({result: response.data})
            })
            .catch(error => {
                this.setState({result: error.data})
            })
        }
    }

    updateFileOrName(event) {
        this.setState({fileOrName: event.target.value});
    }

    updateFile(event) {
        if (typeof event.target.files[0] !== 'undefined') {
            this.setState({fastaInput: event.target.files[0], fastaInputTitle: event.target.files[0].name})
        }
    }

    updateName(event) {
        this.setState({proteinName: event.target.value})
    }

    render() {
        return (
            <div className="BlastRequest">
                <Header title="LisAln Blast" />
                <RadioGroup aria-label="FileOrName" name="FileOrName" value={this.state.fileOrName} onChange={this.updateFileOrName}>
                    <FormControlLabel value="file" control={<Radio color="primary"/>} label="Upload File" />
                    <FormControlLabel value="name" control={<Radio color="primary"/>} label="Enter Protein Name" />
                </RadioGroup>
                {this.state.fileOrName === 'name' ?
                <TextField label="Protein Name" variant="outlined" value={this.state.proteinName} onChange={this.updateName}/> :
                <div style={{display: 'flex', justifyContent: 'center', flexDirection: 'column'}}> 
                <Button variant="contained" component="label">Upload fasta 
                    <input
                        accept=".txt,.fasta"
                        type="file"
                        name='fasta'
                        style={{ display: "none" }}
                        onChange={this.updateFile}
                    />
                </Button>
                {this.state.fastaInputTitle !== '' && <p>Current uploaded file: {this.state.fastaInputTitle}</p>}
                </div>
                }
                <Button variant="contained" disableElevation onClick={this.runscript}>Go</Button>
                {this.state.result}
            </div>
        )
    }
}

export default BlastRequest