import "./Notification.css";
import React, { useState, useEffect, useRef } from "react";
import useWebSocket from "react-use-websocket";
import { TextField, Button, Box, Typography } from "@mui/material";

export default function Notification() {
	const user_id = localStorage.getItem("user_id");
    const wsUrl = useRef(`ws://127.0.0.1:8003/ws/user_notifications/`).current;
    const [messageHistory, setMessageHistory] = useState([]);
    const [friendID, setFriendID] = useState("");
    const { lastMessage } = useWebSocket(wsUrl);

    useEffect(() => {
        if (lastMessage !== null) {
            setMessageHistory((prev) => prev.concat(lastMessage));
        }
    }, [lastMessage]);

    const handleSendFriendRequest = async () => {
		console.log("Friend ID:", friendID);
		console.log("User ID:", user_id);
        try {
            const response = await fetch("http://localhost:8002/user/addfriend", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_1: user_id,
                    user_2: friendID,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Friend Request Sent:", data);
            } else {
                const errorData = await response.json();
                console.error("Error in server response:", errorData);
            }
        } catch (error) {
            console.error("Error in request:", error);
        }
    };

    return (
        <Box>
            <Box>
                {messageHistory.map((message, index) => (
                    <Typography key={index}>{message.data}</Typography>
                ))}
            </Box>
            <TextField
                label="User ID"
                variant="outlined"
                value={friendID}
                onChange={(e) => setFriendID(e.target.value)}
            />
            <Button variant="contained" color="primary" onClick={handleSendFriendRequest}>
                Send Friend Request
            </Button>
        </Box>
    );
}