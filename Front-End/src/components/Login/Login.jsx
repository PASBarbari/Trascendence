import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";
import Button from "../Button/Button";
import Input from "../Input/Input";
import { onHandleSubmit } from "./post";

export default function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();

	const handleSubmit = (e) => {
    onHandleSubmit(e, email, password, navigate); //file post.jsx
  };

	const onRegisterClick = () => {
		navigate("/register");
	};

	return (
		<div className="login">
			<div className="login_box">
				<h1>Login</h1>
				<div className="login_form">
					<form className="login_form" onSubmit={(e) => handleSubmit(e)}>
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
						<Button text={"Login"} type={"submit"} />
						<Button onclick={onRegisterClick} text={"Register"} type={"submit"} />
					</form>
				</div>
			</div>
		</div>
	);
}
