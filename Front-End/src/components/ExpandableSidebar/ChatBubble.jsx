import React from "react";
import PropTypes from "prop-types";
import "./ChatBubble.css";

export function ChatBubble({ username, sender, date, message }) {
  const isSingleChat = !username;
  const isSenderMe = sender === "Me";

  return (
    <div className={`chat-bubble ${isSenderMe ? "me" : "you"}`}>
      {!isSingleChat && (
        <div className="avatar">
          <div className="avatar-placeholder"></div>
					<div className="date under">{date}</div>
        </div>
      )}
      <div className="chat-content">
        {!isSingleChat && <div className="username">{username}</div>}
        <div className="message">{message}</div>
        {isSingleChat && <div className={`date ${isSenderMe ? "me" : "you"}`}>{date}</div>}
      </div>
    </div>
  );
}

ChatBubble.propTypes = {
  username: PropTypes.string,
  sender: PropTypes.oneOf(["Me", "You"]).isRequired,
  date: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
};