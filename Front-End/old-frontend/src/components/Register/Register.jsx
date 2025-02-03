import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";
import { Button, TextField } from "@mui/material";
import { onHandleSubmit } from "./post";

export default function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
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
                    <form className="login_form" onSubmit={handleSubmit}>
                        <TextField
                            label="Username"
                            type="text"
                            name="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            variant="outlined"
                            fullWidth
                            margin="none"
                            size="small"
                        />
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
                        <Button variant="contained" color="primary" type="submit" fullWidth style={{ height: 40 }}>
                            Register
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={onLoginClick} fullWidth style={{ height: 40 }}>
                            Login
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}