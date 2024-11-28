import React, { useState } from 'react';
import './index.css';
import SideChats from '../Chat/SideChats';
import Button from '../Button/Button';
import Profile from "../Profile/Profile";
import logo from './logo.png';
import settings from './settings.png';
import chatImg from './chat.png';
import propic from '../Profile/propic.jpeg';
import close from './close.png';
import { ExpandableSidebar } from '../ExpandableSidebar/ExpandableSidebar';

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
					{!isProfileVisible && <img src={propic} alt="propic" className="propic-image" />}
					{isProfileVisible && <img src={close} alt="settings" className="propic-image" />}
				</button>
				{/* Aggiungi il contenuto della tua home page qui */}
			</div>
			<div className="undernavbar">

			<div className="expandable-sidebar-container">
				<ExpandableSidebar 
					activeChatType={activeChatType}
					setActiveChatType={setActiveChatType}
				/>
			</div>

{/*				<div className="sidebar">
					<button className="chat-buttons" onClick={toggleDiv}>
						<img src={chatImg} alt="chat" className="chat-image" />
					</button>
				</div>
				{isDivVisible && <SideChats />}
*/}
				<div className={`content ${isDivVisible ? 'content-reduced' : ''}`}>
					{isProfileVisible && <Profile />}
					<div className="box"></div>
					<div className="box"></div>
					<div className="box"></div>

				</div>
			</div>
		</div>
	);
};

export default Home;