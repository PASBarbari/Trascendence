import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { Button, TextField } from "@mui/material";
import { onHandleSubmit } from "./post";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
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
                    <form className="login_form" onSubmit={handleSubmit}>
                        <TextField
                            label="Email"
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            variant="outlined"
                            fullWidth
                            margin="none"
                            size="small"
                        />
                        <TextField
                            label="Password"
                            type="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            variant="outlined"
                            fullWidth
                            margin="none"
                            size="small"
                        />
						<div className="empty">
						</div>
                        <Button variant="contained" color="primary" type="submit" fullWidth style={{ height: 40 }}>
                            Login
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={onRegisterClick} fullWidth style={{ height: 40 }}>
                            Register
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}