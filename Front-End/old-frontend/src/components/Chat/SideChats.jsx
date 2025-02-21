import "./SideChats.css";
import React, {useEffect, useState } from "react";
import Chat from "./Chat.jsx";
import AddChat from "./AddChat.jsx";
import Input from "../Input/Input.jsx";
import { getCookie } from "../Cookie.jsx";

//restituisce tutte le chatrooms in cui l'utente è presente
const getChatRooms = async () => {
	const user_id = localStorage.getItem("user_id");
	const token = localStorage.getItem('token');
	console.log("user_id in sidechat: ", user_id);
	console.log("Token inviato nell'header Authorization:", token);
	console.log(`http://localhost:8001/chat/chat_rooms/getchat/?users=${user_id}`);
  try {
    const response = await fetch(
      `http://localhost:8001/chat/chat_rooms/getchat/?user_id=${user_id}`,
      {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
		  		'X-CSRFToken': getCookie('csrftoken'),
					'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("Risposta dal server:", data);
      localStorage.setItem("chat_rooms", JSON.stringify(data));
			return data;
    } else {
      const errorData = await response.json();
      console.error("Errore nella risposta del server:", errorData);
			return null;
		}
  } catch (error) {
    console.error("Errore nella richiesta:", error);
		return null;	
  }
};

export default function SideChats() {
  const [chatRooms, setChatRooms] = useState([]);

  useEffect(() => {
    const fetchChatRooms = async () => {
      const data = await getChatRooms();
      if (data) {
				const storedChatRooms = JSON.parse(localStorage.getItem("chat_rooms")) || [];
				setChatRooms(storedChatRooms);
			}
			else {
				console.log("Dati non ricevuti:", data);
				setChatRooms([]);
			}
    };

    fetchChatRooms();
  }, []);

  return (
    <div className="sidechat">
      <AddChat />
      <Input type="text" placeholder="Cerca chat" className="sidechat-input" />
      {chatRooms.map((room) => (
        <Chat key={room.room_id} roomID={room.room_id} isSingleChat={false} />
      ))}
    </div>
  );
}
