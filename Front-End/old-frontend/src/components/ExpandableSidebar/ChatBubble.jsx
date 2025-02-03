import React from "react";
import PropTypes from "prop-types";
import "./ChatBubble.css";

export function ChatBubble({ sender, date, message, isSingleChat }) {
	console.log("ChatBubble");
	console.log(sender);
	console.log(date);
	console.log(message);
	console.log(isSingleChat);
  const user_name = localStorage.getItem("user_username");
  console.log("user_name:", user_name);
  const isSenderMe = user_name === sender;
  console.log("isSenderMe:", isSenderMe);

  return (
    <div className={`chat-bubble ${isSenderMe ? "true" : "false"}`}>
      {!isSingleChat && !isSenderMe && (
        <div className="avatar">
          <div className="avatar-placeholder"></div>
          <div className="date under">{date}</div>
        </div>
      )}
      <div className={`chat-content ${isSenderMe ? "true" : ""}`}>
        {!isSingleChat && !isSenderMe && <div className="username">{sender}</div>}
        <div className="message">{message}</div>
        {isSingleChat || isSenderMe && <div className={`date ${isSenderMe ? "true" : "false"}`}>{date}</div>}
      </div>
    </div>
  );
}

ChatBubble.propTypes = {
  date: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  isSingleChat: PropTypes.bool.isRequired,
};