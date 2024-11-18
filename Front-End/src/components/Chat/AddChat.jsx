import "./AddChat.css";
import React, { useState } from "react";
import Input from "../Input/Input";
import Button from "../Button/Button";

export default function AddChat() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [room_name, setRoomName] = useState("");
  const [room_description, setRoomDescription] = useState("");
  const [user_ids, setUsers] = useState("");
  const [creator] = useState(localStorage.getItem('user_id'));
	const [room_id, setRoomId] = useState("");

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

	
  const handleSubmit = async (e) => {
		e.preventDefault();
		
    try {
			const response = await fetch('http://localhost:8001/chat/chat_rooms/create/', {
        method: 'POST',
        headers: {
					'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ room_name, room_description, creator }),
      });

      if (response.ok) {
				const data = await response.json();
				console.log('Chat room creata:', data);
      } else {
				const errorData = await response.json();
        console.error('Errore nella risposta del server:', errorData);
      }
    } catch (error) {
			console.error('Errore nella richiesta:', error);
    }
		
		//post su path('create_channel_group/'         room_name = request.data.get('room_name')
		//        user_ids = request.data.get('user_ids', [])
		try {
			const response = await fetch('http://localhost:8001/chat/create_channel_group/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCookie('csrftoken'),
				},
				body: JSON.stringify({ room_id, user_ids }),
			});

			if (response.ok) {
				const data = await response.json();
				console.log('Gruppo creato:', data);
			} else {
				const errorData = await response.json();
				console.error('Errore nella risposta del server:', errorData);
			}
		} catch (error) {
			console.error('Errore nella richiesta:', error);
		}
  };

  return (
    <div className={`chat separated ${isExpanded ? "expanded" : ""}`}>
      <div className="chat-button">
        <button className="clickable-div" onClick={handleExpand}>
          <div className="chat-header">
            <h1>Chat</h1>
          </div>
        </button>
      </div>
      {isExpanded && (
        <div className="scrollable-content">
          <form onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="Nome del gruppo"
              value={room_name}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Descrizione"
              value={room_description}
              onChange={(e) => setRoomDescription(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Aggiungi membri con userID"
              value={user_ids}
              onChange={(e) => setUsers(e.target.value)}
            />
						<Input
							type="text"
							placeholder="room_id"
							value={room_id}
							onChange={(e) => setRoomId(e.target.value)}
						/>
            <Button text="Invia" type="submit" />
          </form>
        </div>
      )}
    </div>
  );
}