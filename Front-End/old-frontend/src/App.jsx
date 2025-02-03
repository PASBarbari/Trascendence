import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar/Navbar';
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import Home from './components/Home/Home';
import ExternalRedirect from './components/ExternalRedirect/ExternalRedirect';

function App() {
	return (
		<Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
			<div className="App">
				<Routes>
					<Route path="/" element={<Navigate to="/login" />} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/home" element={<Home />} />
					<Route path="/mine" element={<ExternalRedirect to="https://minesweeper.online/it/" />} />
				</Routes>
			</div>
		</Router>
	);
}

export default App;