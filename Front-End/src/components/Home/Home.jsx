import React, { useState } from "react";
import "./index.css";
import SideChats from "../Chat/SideChats";
import Button from "../Button/Button";
import Profile from "../Profile/Profile";
import logo from "./logo.png";
import settings from "./settings.png";
import chatImg from "./chat.png";
import propic from "../Profile/propic.jpeg";
import close from "./close.png";
import TaskAvaiable from "../TaskAvaiable/TaskAvaiable";
import TaskActive from "../TaskActive/TaskActive";
import { ExpandableSidebar } from "../ExpandableSidebar/ExpandableSidebar";

//import WebSocketComponent from '../WebSocket/WebSocket';
// import { Nav, navbar } from 'react-bootstrap';
// import 'bootstrap/dist/css/bootstrap.min.css';

const Home = () => {
  const [isDivVisible, setIsDivVisible] = useState(true);
  const [isProfileVisible, setIsProfileVisible] = useState(true);
	const [activeChatType, setActiveChatType] = useState(null);

  const toggleDiv = () => {
    setIsDivVisible(!isDivVisible);
  };

  const toggleProfile = () => {
    setIsProfileVisible(!isProfileVisible);
  };

  return (
    <div className="home">
      <div className="navbar">
        <img src={logo} alt="logo" className="logo-image" />
        <button className="propic-button" onClick={toggleProfile}>
          {!isProfileVisible && (
            <img src={propic} alt="propic" className="propic-image" />
          )}
          {isProfileVisible && (
            <img src={close} alt="settings" className="propic-image" />
          )}
        </button>
        {/* Aggiungi il contenuto della tua home page qui */}
      </div>
      <div className="undernavbar">

        <div className="flex h-screen bg-background">
          <ExpandableSidebar
            activeChatType={activeChatType}
            setActiveChatType={setActiveChatType}
          />
          <main className="flex-1 p-6">
            <h1 className="text-2xl font-bold">Welcome to the Chat App</h1>
            <p className="mt-2">
              Select a chat type from the sidebar to start chatting.
            </p>
          </main>
        </div>

        {/*				<div className="sidebar">
					<button className="chat-buttons" onClick={toggleDiv}>
						<img src={chatImg} alt="chat" className="chat-image" />
					</button>
				</div>
				{isDivVisible && <SideChats />}
				<div className={`content ${isDivVisible ? 'content-reduced' : ''}`}>
					{isProfileVisible && <Profile />}
					<TaskAvaiable />
					<TaskActive />
					<div className="box"></div> 
					<div className="box"></div> 
					<div className="box"></div> 
					 //task in corso e quando le checki aggiorna il tuo score
				</div>
*/}
      </div>
    </div>
  );
};

export default Home;
