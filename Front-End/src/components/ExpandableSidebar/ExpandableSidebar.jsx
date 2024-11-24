import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Users, Shuffle, ChevronDown, ChevronUp, ChevronRight, ChevronLeft } from 'lucide-react'
import './ExpandableSidebar.css'

export function ExpandableSidebar() {
  const [chats, setChats] = useState([])
  const [expandedChat, setExpandedChat] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [areChatItemsVisible, setAreChatItemsVisible] = useState(true)
  const [activeButton, setActiveButton] = useState(null)
  const chatRefs = useRef({})

  const handleChatTypeClick = (type) => {
    const firstChatOfType = chats.find(chat => chat.type === type)
    if (firstChatOfType && chatRefs.current[firstChatOfType.id]) {
      chatRefs.current[firstChatOfType.id].scrollIntoView({ behavior: 'smooth' })
    }
    setActiveButton(type)
  }

  const handleCloseSidebar = () => {
    setAreChatItemsVisible(false)
    setTimeout(() => {
      setIsSidebarOpen(false)
    }, 350) // dipende da quante chat ci sono e dalla durata delle loro animazioni
  }

  const handleOpenSidebar = () => {
    setIsSidebarOpen(true)
    setAreChatItemsVisible(true)
  }

  useEffect(() => {
    const fetchChats = async () => {
      const mockChats = [
        { id: '1', name: 'Alice', lastMessage: 'Hey, how are you?', type: 'single' },
        { id: '2', name: 'Bob', lastMessage: 'Did you see the game last night?', type: 'single' },
        { id: '3', name: 'Charlie', lastMessage: 'Meeting at 2 PM', type: 'single' },
        { id: '4', name: 'David', lastMessage: 'Can you help me with this?', type: 'single' },
        { id: '5', name: 'Eve', lastMessage: 'Thanks for your help!', type: 'single' },
        { id: '6', name: 'Project Team', lastMessage: 'Meeting at 3 PM', type: 'group' },
		{ id: '7', name: 'Project Team', lastMessage: 'Meeting at 3 PM', type: 'group' },
		{ id: '8', name: 'Project Team', lastMessage: 'Meeting at 3 PM', type: 'group' },
		{ id: '9', name: 'Project Team', lastMessage: 'Meeting at 3 PM', type: 'group' },
		{ id: '10', name: 'Project Team', lastMessage: 'Meeting at 3 PM', type: 'group' },
        { id: '11', name: 'Random User', lastMessage: 'Nice to meet you!', type: 'random' },
		{ id: '12', name: 'Random User', lastMessage: 'Nice to meet you!', type: 'random' },
		{ id: '13', name: 'Random User', lastMessage: 'Nice to meet you!', type: 'random' },
		{ id: '14', name: 'Random User', lastMessage: 'Nice to meet you!', type: 'random' },
		{ id: '15', name: 'Random User', lastMessage: 'Nice to meet you!', type: 'random' },
		{ id: '16', name: 'Random User', lastMessage: 'Nice to meet you!', type: 'random' },
      ]
      setChats(mockChats)
    }

    fetchChats()
  }, [])

  return (
    <div className="expandable-sidebar">
      <nav className="sidebar-nav">
        {isSidebarOpen ? (
          <button
            onClick={handleCloseSidebar}
            className={`sidebar-button ${activeButton === 'close' ? 'active' : ''}`}
          >
            <ChevronLeft className="icon" />
            <span className="button-label">Chiudi</span>
          </button>
        ) : (
          <button
            onClick={handleOpenSidebar}
            className={`sidebar-button ${activeButton === 'open' ? 'active' : ''}`}
          >
            <ChevronRight className="icon" />
            <span className="button-label">Apri</span>
          </button>
        )}

        <button
          onClick={() => handleChatTypeClick('single')}
          className={`sidebar-button ${activeButton === 'single' ? 'active' : ''}`}
        >
          <MessageCircle className="icon" />
          <span className="button-label">Single Chat</span>
        </button>

        <button
          onClick={() => handleChatTypeClick('group')}
          className={`sidebar-button ${activeButton === 'group' ? 'active' : ''}`}
        >
          <Users className="icon" />
          <span className="button-label">Group Chat</span>
        </button>

        <button
          onClick={() => handleChatTypeClick('random')}
          className={`sidebar-button ${activeButton === 'random' ? 'active' : ''}`}
        >
          <Shuffle className="icon" />
          <span className="button-label">Random Chat</span>
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
              {areChatItemsVisible && chats.map((chat, index) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                  className="chat-item"
                  ref={el => chatRefs.current[chat.id] = el}
                >
                  <div
                    className="chat-item-header"
                    onClick={() => setExpandedChat(prev => prev === chat.id ? null : chat.id)}
                  >
                    <div>
                      <h3 className="chat-item-name">{chat.name}</h3>
                      <p className="chat-item-message">{chat.lastMessage}</p>
                    </div>
                    {expandedChat === chat.id ? <ChevronUp className="icon" /> : <ChevronDown className="icon" />}
                  </div>
                  <AnimatePresence>
                    {expandedChat === chat.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="chat-item-content"
                      >
                        <p>Full chat content for {chat.id} would go here.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}