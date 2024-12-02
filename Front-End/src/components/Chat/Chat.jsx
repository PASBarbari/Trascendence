import "./Chat.css";
import React, { useState, useEffect, useRef } from "react";
import useWebSocket from "react-use-websocket";
import Input from "../Input/Input";
import Button from "../Button/Button";
import { ChatBubble } from "../ExpandableSidebar/ChatBubble";
import { Send } from "lucide-react";

// to test the chat you need to create 2 new chat to have the roomID that exist (hardcoded in this file)

export default function Chat({ roomID, isSingleChat }) {
	console.log("Chat", roomID, isSingleChat);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const token = localStorage.getItem("token");
  const wsUrl = useRef(`ws://127.0.0.1:8001/ws/chat/${roomID}/?token=${token}`).current;

  const { sendMessage, lastMessage, readyState, getWebSocket } = useWebSocket(
    wsUrl,
    {
      onOpen: () => {
        console.log("WebSocket connection opened");
      },
      onClose: () => console.log("WebSocket connection closed"),
      onError: (e) => console.error("WebSocket error:", e),
    },
  );

  useEffect(() => {
    console.log("WebSocket URL:", wsUrl);

    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      console.log("Messaggio ricevuto:", data);
      setChat((prevChat) => [...prevChat, data]);
    }

    return () => {
      const socket = getWebSocket();
      //if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      //  console.log('Chiudendo la connessione WebSocket');
      //  socket.close();
      //}
    };
  }, [lastMessage, getWebSocket]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8001/chat/chat_rooms/${roomID}/get_message/`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": localStorage.getItem("csrftoken"),
              "Authorization": `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setChat(data);
        } else {
          console.error(
            "Errore nella risposta del server:",
            response.statusText
          );
        }
      } catch (error) {
        console.error("Errore nella richiesta:", error);
      }
    };

    fetchMessages();
  }, [roomID]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const socket = getWebSocket();
    console.log("Stato della connessione WebSocket:", socket.readyState);
    if (socket && socket.readyState === WebSocket.OPEN) {
      const messageData = {
        type: "chat_message",
        room_id: roomID,
        message: message,
        timestamp: new Date().toISOString(),
        sender: localStorage.getItem("user_username"),
      };
      sendMessage(JSON.stringify(messageData));
      setMessage("");
    } else {
      alert("Connessione WebSocket non attiva");
    }
  };

  return (
	<div>
	  <div className="scrollable-content">
		<div>
		  {chat.map((msg, index) => (
			<ChatBubble
			  key={index}
			  sender={msg.sender}
			  date={new Date(msg.timestamp).toLocaleString()}
			  message={msg.message}
			  isSingleChat={isSingleChat} // Puoi cambiare questo valore in base alle tue esigenze
			/>
		  ))}
		</div>
	  </div>
		  <form onSubmit={handleSendMessage} className="chats-input">
			<input
			  type="text"
			  value={message}
			  onChange={(e) => setMessage(e.target.value)}
			  placeholder="Type a message"
			/>
			<button onClick={handleSendMessage}>
			<Send className="icon" />
			</button>
		  </form>
	</div>
		);
    {/*<div className={`chat separated ${isExpanded ? "expanded" : ""}`}>
      <div className="chat-button">
        <button className="clickable-div" onClick={handleExpand}>
          <div className="chat-header">
            <h1>Chat</h1>
            <p>Ready state: {readyState}</p>
          </div>
        </button>
      </div>
      {isExpanded && (*/}
			  {/*
      )}
      {isExpanded && (
      )}
    </div>
	*/}
}