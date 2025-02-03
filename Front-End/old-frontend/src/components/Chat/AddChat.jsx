import "./AddChat.css";
import React, { useState } from "react";
import Input from "../Input/Input";
import Button from "../Button/Button";
import { getCookie } from "../Cookie.jsx";

export default function AddChat() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [room_name, setRoomName] = useState("");
  const [room_description, setRoomDescription] = useState("");
  const [user_ids, setUsers] = useState("");
  const [creator] = useState(localStorage.getItem('user_id'));

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };
	
  const handleSubmit = async (e) => {
		e.preventDefault();

    let userIdsArray = user_ids.split(',').map(id => id.trim()).filter(id => id);
    if (!userIdsArray.includes(creator)) {
      userIdsArray.push(creator);
    }

    console.log('Utenti:', userIdsArray);

    try {
			const response = await fetch('http://localhost:8001/chat/chat_rooms/create/', {
        method: 'POST',
        headers: {
					'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
					'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ room_name, room_description, creator, users: userIdsArray }),
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
		// try {
		// 	const response = await fetch('http://localhost:8001/chat/create_channel_group/', {
		// 		method: 'POST',
		// 		headers: {
		// 			'Content-Type': 'application/json',
		// 			'X-CSRFToken': getCookie('csrftoken'),
		// 			'Authorization': `Bearer ${localStorage.getItem('token')}`,
		// 		},
		// 		body: JSON.stringify({ room_id, user_ids }),
		// 	});

		// 	if (response.ok) {
		// 		const data = await response.json();
		// 		console.log('Gruppo creato:', data);
		// 	} else {
		// 		const errorData = await response.json();
		// 		console.error('Errore nella risposta del server:', errorData);
		// 	}
		// } catch (error) {
		// 	console.error('Errore nella richiesta:', error);
		// }
  };

										{/*<div className="add-chat">
											<input type="text" placeholder="Nome del gruppo" />
											<input type="text" placeholder="Descrizione" />
											<input
												type="text"
												placeholder="Aggiungi membri con userID"
											/>
											<button onClick={handleAddSidebar}>Aggiungi</button>
										</div>*/}

  return (
			<form onSubmit={handleSubmit} className="add-chat">
				<input
					type="text"
					placeholder="Nome del gruppo"
					value={room_name}
					onChange={(e) => setRoomName(e.target.value)}
				></input>
				<input
					type="text"
					placeholder="Descrizione"
					value={room_description}
					onChange={(e) => setRoomDescription(e.target.value)}
				></input>
				<input
					type="text"
					placeholder="Aggiungi membri con userID"
					value={user_ids}
					onChange={(e) => setUsers(e.target.value)}
				></input>
				<button type="submit">Add</button>
			</form>
			);
    {/*<div className={`chat separated ${isExpanded ? "expanded" : ""}`}>
      <div className="chat-button">
			<button className="clickable-div" onClick={handleExpand}>
			<div className="chat-header">
			<h1>Chat</h1>
			</div>
			</button>
      </div>
      {isExpanded && (*/}
      {/*)}
    </div>*/}
}