import React from 'react'

function Header(props) {
    return (
        <div className="Header" style={{fontSize: props.size, marginBottom: props.margin, maxWidth: props.maxWidth}}>
            <h1 className={props.className}>{props.title}</h1>
        </div>
    )
}

export default Header
