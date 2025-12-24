import React from 'react';
import './Loading.css';

const Loading = ({ fullScreen = true, style = {}, className = '' }) => {
    return (
        <div
            className={`loading-container ${!fullScreen ? 'inline' : ''} ${className}`}
            style={style}
        >
            <div className="body">
                <span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
                <div className="base">
                    <span></span>
                    <div className="face"></div>
                </div>
            </div>
            <div className="longfazers">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>
            <h1 className="loading-text">LOADING</h1>
        </div>
    );
};

export default Loading;
