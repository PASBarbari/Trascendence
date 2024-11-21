import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";
import Button from "../Button/Button";
import Input from "../Input/Input";
import { onHandleSubmit } from "./post";

export default function Login() {
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	//const [birthdate, setBirthdate] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();

	const handleSubmit = (e) => {
    onHandleSubmit(e, username, email, password, navigate); //file post.jsx
  };

	const onLoginClick = () => {
		navigate("/login");
	};

	return (
		<div className="register">
			<div className="login_box">
				<h1>Register</h1>
				<div className="login_form">
					<form className="login_form" onSubmit={(e) => handleSubmit(e)}>
						<Input
							type="text"
							name="username"
							placeholder="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
						/>
						<Input
							type="email"
							name="email"
							placeholder="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
						<Input
							type="password"
							name="password"
							placeholder="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
							<Button text={"Register"} type={"submit"} />
							<Button text={"Login"} onclick={onLoginClick} type={"submit"} />
					</form>
				</div>
			</div>
		</div>
	);
}
