import React, { useState } from 'react';
import './index.css';
import SideChats from '../Chat/SideChats';
import propic from './propic.jpeg';
import WebSocketComponent from '../WebSocket/WebSocket';
import popbutton from '../Popover/Popover';
// import { Nav, navbar } from 'react-bootstrap';
// import 'bootstrap/dist/css/bootstrap.min.css';

const Home = () => {
	const [isDivVisible, setIsDivVisible] = useState(true);

	const toggleDiv = () => {
    setIsDivVisible(!isDivVisible);
  };

  return (
    <div className="home">
			<div className="navbar">
				<h1>logo</h1>
				<popbutton />
				<p>panino</p>
				{/* Aggiungi il contenuto della tua home page qui */}
			</div>
			<div className="undernavbar">
        <div className="sidebar">
					<button onClick={toggleDiv}>Toggle Div</button>
				</div>
        {isDivVisible && <SideChats />}
        <div className={`content ${isDivVisible ? 'content-reduced' : ''}`}>
			<div className="profile">
				<img src={propic} alt="propic" />
			</div>
			<div className="box"></div>
			<div className="box"></div>
			<div className="box"></div>

		</div>
			</div>
    </div>
  );
};

export default Home;