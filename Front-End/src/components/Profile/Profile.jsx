import React from 'react';
import propic from './propic.jpeg';
import './Profile.css';
import Input from '../Input/Input';

export default function Profile() {
	const username = localStorage.getItem('user_username');
	const email = localStorage.getItem('user_email');
	return (
		<div className="profile">
			<div className="profile-text">
				<p>user: {username}</p>
				<p>email: {email}</p>
				<Input
							type="text"
							name="name"
							placeholder="name"
							// value={name}
							// onChange={(e) => setName(e.target.value)}
						/>
						<Input
							type="text"
							name="surname"
							placeholder="surname"
							// value={surname}
							// onChange={(e) => setSurname(e.target.value)}
						/>
						<Input
							type="date"
							name="birthdate"
							className="date_input"
							// value={birthdate}
							// onChange={(e) => setBirthdate(e.target.value)}
						/>
			</div>
			<img src={propic} alt="propic" className="profile-image" />
		</div>
	);
}
