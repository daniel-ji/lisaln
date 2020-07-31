import React from 'react'

function Header(props) {
    return (
        <div className="Header" style={{fontSize: props.size}}>
            <h1>{props.title}</h1>
        </div>
    )
}

export default Header
