import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import useWebSocket from 'react-use-websocket';

const WebSocketComponent = forwardRef(({ isVisible }, ref) => {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const roomName = '2';
  const token = localStorage.getItem('token');
  const wsUrl = useRef(`ws://127.0.0.1:8001/ws/chat/${roomName}/`).current;

  const { sendMessage, lastMessage, readyState, getWebSocket } = useWebSocket(wsUrl, {
    onOpen: () => {
      console.log('WebSocket connection opened');
    },
    onClose: () => console.log('WebSocket connection closed'),
    onError: (e) => console.error('WebSocket error:', e),
  }, isVisible);

  useEffect(() => {
    console.log('WebSocket URL:', wsUrl);

    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      setChat((prevChat) => [...prevChat, data.message]);
    }

    return () => {
      const socket = getWebSocket();
      //if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      //  console.log('Chiudendo la connessione WebSocket');
      //  socket.close();
      //}
    };
  }, [lastMessage, getWebSocket]);

  useImperativeHandle(ref, () => ({
    setMessage,
    handleSendMessage,
  }));

  const handleSendMessage = () => {
    const socket = getWebSocket();
    console.log('Stato della connessione WebSocket:', socket.readyState);
    if (socket && socket.readyState === WebSocket.OPEN) {
      const messageData = {
        message: message,
        room_name: roomName,
        sender: localStorage.getItem('user_id'),
      };
      sendMessage(JSON.stringify(messageData));
      setMessage('');
    } else {
      alert('Connessione WebSocket non attiva');
    }
  };

  return (
    <div>
      <div>Ready state: {readyState}</div>
      <div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={handleSendMessage}>Send Message</button>
      </div>
      <div>
        <h2>Chat</h2>
        <div>
          {chat.map((msg, index) => (
            <div key={index}>{msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default WebSocketComponent;