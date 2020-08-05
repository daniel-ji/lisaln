import React from 'react'

function Header(props) {
    return (
        <div className="Header" style={{fontSize: props.size, marginBottom: (props.lessMargin && '3vh') || (props.moreMargin && '7vh')}}>
            <h1>{props.title}</h1>
        </div>
    )
}

export default Header
