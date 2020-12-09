import React from 'react'

import helpLogo from '../media/info.png';
import '../styles/hint.min.css';

function Header(props) {
    return (
        <div className="Header" style={{fontSize: props.size, margin: props.margin, maxWidth: props.maxWidth}}>
            <h1 className={props.className}>{props.title}</h1>
            {props.help !== undefined && <div className={`${(props.leftHelp ? "hint--left" : "hint--right")} hint--rounded hint--bounce hintContainer`} aria-label={props.help}><img src={helpLogo} alt="Info icon"/></div>}
        </div>
    )
}

export default Header
