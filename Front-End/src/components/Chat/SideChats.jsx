import "./SideChats.css";
import React from "react";
import Chat from "./Chat";
import AddChat from "./AddChat";
import Input from "../Input/Input";

export default function SideChats() {
	return (
		<div className="sidechat">
			<AddChat />
			<Input type="text" placeholder="Cerca chat" className="sidechat-input" />
			<Chat />
		</div>
	);
}