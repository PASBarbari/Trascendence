import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	MessageCircle,
	Users,
	Shuffle,
	ChevronDown,
	ChevronUp,
	ChevronRight,
	ChevronLeft,
	Plus,
	Send,
} from "lucide-react";
import Chat from "../Chat/Chat";
import "./ExpandableSidebar.css";
import AddChat from "../Chat/AddChat";
import { ChatBubble } from "./ChatBubble";

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

export function ExpandableSidebar() {
	const [chats, setChats] = useState([]);
	const [expandedChat, setExpandedChat] = useState(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [areChatItemsVisible, setAreChatItemsVisible] = useState(true);
	const [activeButton, setActiveButton] = useState(null);
	const [newMessage, setNewMessage] = useState("");
	const chatRefs = useRef({});

	const handleChatTypeClick = (type) => {
		const firstChatOfType = chats.find((chat) => chat.type === type);
		if (firstChatOfType && chatRefs.current[firstChatOfType.id]) {
			chatRefs.current[firstChatOfType.id].scrollIntoView({
				behavior: "smooth",
			});
		}
		setActiveButton(type);
	};

	const isAddChat = (chat_id) => {
		return chat_id === "0";
	};

	const handleCloseSidebar = () => {
		setAreChatItemsVisible(false);
		setTimeout(() => {
			setIsSidebarOpen(false);
		}, 350); // dipende da quante chat ci sono e dalla durata delle loro animazioni, o anche da quante chat hai scorso
	};

	const handleOpenSidebar = () => {
		setIsSidebarOpen(true);
		setAreChatItemsVisible(true);
	};

	const handleAddSidebar = () => {
		handleCloseSidebar();
	};

	const handleSendMessage = (chatId) => {
		if (newMessage.trim() !== "") {
			console.log(`Sending message to chat ${chatId}: ${newMessage}`);
			setNewMessage("");
		}
	};

	useEffect(() => {
		const fetchChats = async () => {
			const serverChats = await getChatRooms();
			const addGroupChat = [{
				id: "0",
				name: "Crea",
				lastMessage: "Hey, crea?",
				type: "crea",
			}];

			const mockChats = [
				{
					id: "3",
					name: "Charlie",
					lastMessage: "Meeting at 2 PM",
					type: "single",
				},
				{
					id: "4",
					name: "David",
					lastMessage: "Can you help me with this?",
					type: "single",
				},
				{
					id: "5",
					name: "Eve",
					lastMessage: "Thanks for your help!",
					type: "single",
				},
				{
					id: "6",
					name: "Project Team",
					lastMessage: "Meeting at 3 PM",
					type: "group",
				},
				{
					id: "7",
					name: "Project Team",
					lastMessage: "Meeting at 3 PM",
					type: "group",
				},
				{
					id: "8",
					name: "Project Team",
					lastMessage: "Meeting at 3 PM",
					type: "group",
				},
				{
					id: "9",
					name: "Project Team",
					lastMessage: "Meeting at 3 PM",
					type: "group",
				},
				{
					id: "10",
					name: "Project Team",
					lastMessage: "Meeting at 3 PM",
					type: "group",
				},
				{
					id: "11",
					name: "Random User",
					lastMessage: "Nice to meet you!",
					type: "random",
				}, 
				{
					id: "12",
					name: "Random User",
					lastMessage: "Nice to meet you!",
					type: "random",
				},
				{
					id: "13",
					name: "Random User",
					lastMessage: "Nice to meet you!",
					type: "random",
				},
				{
					id: "14",
					name: "Random User",
					lastMessage: "Nice to meet you!",
					type: "random",
				},
				{
					id: "15",
					name: "Random User",
					lastMessage: "Nice to meet you!",
					type: "random",
				},
				{
					id: "16",
					name: "Random User",
					lastMessage: "Nice to meet you!",
					type: "random",
				},
			];

			if (serverChats) {
				const serverChatsFormatted = serverChats.map(chat => ({
					id: chat.room_id.toString(),
					name: chat.room_name,
					lastMessage: chat.room_description,
					type: "group",
				}));
				setChats([...addGroupChat, ...serverChatsFormatted, ...mockChats]);
			} else {
				setChats([...addGroupChat, ...mockChats]);
			}
		};

		fetchChats();
	}, []);

	return (
		<div className="expandable-sidebar">
			<nav className="sidebar-nav">
				{isSidebarOpen ? (
					<button
						onClick={handleCloseSidebar}
						className={`sidebar-button ${activeButton === "close" ? "active" : ""}`}
					>
						<ChevronLeft className="icon" />
						<span className="button-label">Chiudi</span>
					</button>
				) : (
					<button
						onClick={handleOpenSidebar}
						className={`sidebar-button ${activeButton === "open" ? "active" : ""}`}
					>
						<ChevronRight className="icon" />
						<span className="button-label">Apri</span>
					</button>
				)}

				<button
					onClick={() => handleChatTypeClick("crea")}
					className={`sidebar-button ${activeButton === "crea" ? "active" : ""}`}
				>
					<Plus className="icon" />
					<span className="button-label">Crea</span>
				</button>

				<button
					onClick={() => handleChatTypeClick("single")}
					className={`sidebar-button ${activeButton === "single" ? "active" : ""}`}
				>
					<MessageCircle className="icon" />
					<span className="button-label">Single</span>
				</button>

				<button
					onClick={() => handleChatTypeClick("group")}
					className={`sidebar-button ${activeButton === "group" ? "active" : ""}`}
				>
					<Users className="icon" />
					<span className="button-label">Group</span>
				</button>

				<button
					onClick={() => handleChatTypeClick("random")}
					className={`sidebar-button ${activeButton === "random" ? "active" : ""}`}
				>
					<Shuffle className="icon" />
					<span className="button-label">Random</span>
				</button>
			</nav>

			<AnimatePresence>
				{isSidebarOpen && (
					<motion.div
						initial={{ width: 0 }}
						animate={{ width: 300 }}
						exit={{ width: 0 }}
						transition={{ duration: 0.2 }}
						className="chat-list"
					>
						<AnimatePresence>
							{areChatItemsVisible &&
								chats.map((chat, index) => (
									<motion.div
										key={chat.id}
										initial={{ opacity: 0, x: -50 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -50 }}
										transition={{ duration: 0.2, delay: index * 0.1 }}
										className="chat-item"
										ref={(el) => (chatRefs.current[chat.id] = el)}
									>
										{/*<div className="add-chat">
											<input type="text" placeholder="Nome del gruppo" />
											<input type="text" placeholder="Descrizione" />
											<input
												type="text"
												placeholder="Aggiungi membri con userID"
											/>
											<button onClick={handleAddSidebar}>Aggiungi</button>
										</div>*/}
										{isAddChat(chat.id) ? (
											<AddChat />
										) : (
											<div>
												<div
													className="chat-item-header"
													onClick={() =>
														setExpandedChat((prev) =>
															prev === chat.id ? null : chat.id
														)
													}
												>
													<div className="chat-item-header-content">
														<div className="avatar">
															<div className="avatar-placeholder"></div>
														</div>
														<div className="chat-item-info">
															<div className="chat-item-name">{chat.name}</div>
															<div className="chat-item-message">
																{chat.lastMessage}
															</div>
														</div>
														<div className="chat-item-icon">
															{expandedChat !== chat.id ? (
																<ChevronDown className="icon" />
															) : (
																<ChevronUp className="icon" />
															)}
														</div>
													</div>
												</div>
												<AnimatePresence>
													{expandedChat === chat.id && (
														<motion.div
															initial={{ height: 0, opacity: 0 }}
															animate={{ height: 384, opacity: 1 }}
															exit={{ height: 0, opacity: 0 }}
															transition={{ duration: 0.3 }}
															className="chat-item-content"
														>
															<Chat roomID={chat.id} isSingleChat={chat.type === "single"} />
															{/*<div className="chat-messages">
									{/* bubble messages */}
															{/*</div>*/}
															{/*							<input
								<div className="chats-input">
									type="text"
									placeholder="Type a message..."
									value={newMessage}
									onChange={(e) =>
										setNewMessage(e.target.value)
									}
									/>
									<button
									onClick={() => handleSendMessage(chat.id)}
									>
									<Send className="icon" />
									</button>
								</div>
		*/}
														</motion.div>
													)}
												</AnimatePresence>
											</div>
										)}
									</motion.div>
								))}
						</AnimatePresence>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}