import "./Message.css";
import React from "react";

export default function Message({ message }) {
	const isPersonalMessage = message.personal_message === true;

  return (
    <div className={`message ${isPersonalMessage ? "personal" : ""}`}>
      {!isPersonalMessage && (<div className="propic"></div>)}
      <div className="message-content">
				<p>{message.sender_name}</p>
        <p>{message.text}</p>
      </div>
    </div>
  );
}
