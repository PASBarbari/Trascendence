import React, { useState } from 'react';
import './index.css';
import SideChats from '../Chat/SideChats';
import Sidebar from '../Sidebar/Sidebar'; // Ensure this import is correct
import Button from '../Button/Button';
import Profile from "../Profile/Profile";
import logo from './logo.png';
import settings from './settings.png';
import chatImg from './chat.png';
import propic from '../Profile/propic.jpeg';
import close from './close.png';
import TaskAvaiable from '../TaskAvaiable/TaskAvaiable';
import TaskActive from '../TaskActive/TaskActive';

const Home = () => {
    const [isDivVisible, setIsDivVisible] = useState(true);
    const [isProfileVisible, setIsProfileVisible] = useState(true);
    const [isChatVisible, setIsChatVisible] = useState(false);

    const toggleDiv = () => {
        setIsDivVisible(!isDivVisible);
    };

    const toggleProfile = () => {
        setIsProfileVisible(!isProfileVisible);
    };

    const toggleChat = () => {
        setIsChatVisible(!isChatVisible);
    };

    return (
        <div className="home">
            <div className="navbar">
                <img src={logo} alt="logo" className="logo-image" />
                <button className="propic-button" onClick={toggleProfile}>
                    {!isProfileVisible && <img src={propic} alt="propic" className="propic-image" />}
                    {isProfileVisible && <img src={close} alt="settings" className="propic-image" />}
                </button>
                {/* Aggiungi il contenuto della tua home page qui */}
            </div>
            <div className="undernavbar">
                <Sidebar onChatClick={toggleChat} /> {/* Pass the toggleChat handler */}
                {isChatVisible && <SideChats />} {/* Conditionally render SideChats */}
                <div className={`content ${isDivVisible ? 'content-reduced' : ''}`}>
                    {isProfileVisible && <Profile />}
                    <TaskAvaiable />
                    <TaskActive />
                    <div className="box"></div> 
                    <div className="box"></div> 
                    <div className="box"></div> 
                    {/* //task in corso e quando le checki aggiorna il tuo score */}
                </div>
            </div>
        </div>
    );
};

export default Home;