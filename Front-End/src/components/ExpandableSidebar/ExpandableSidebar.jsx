'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Users, Shuffle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import './ExpandableSidebar.css'

export function ExpandableSidebar({ activeChatType, setActiveChatType }) {
  const [chats, setChats] = useState([])
  const [expandedChat, setExpandedChat] = useState(null)

  const handleChatTypeClick = (type) => {
    setActiveChatType(prevType => prevType === type ? null : type)
  }

  useEffect(() => {
    const fetchChats = async () => {
      const mockChats = [
        { id: '1', name: 'Alice', lastMessage: 'Hey, how are you?', type: 'single' },
        { id: '2', name: 'Bob', lastMessage: 'Did you see the game last night?', type: 'single' },
        { id: '3', name: 'Project Team', lastMessage: 'Meeting at 3 PM', type: 'group' },
        { id: '4', name: 'Random User', lastMessage: 'Nice to meet you!', type: 'random' },
      ]
      setChats(activeChatType ? mockChats.filter(chat => chat.type === activeChatType) : [])
    }

    fetchChats()
  }, [activeChatType])

  return (
    <div className="expandable-sidebar">
      <nav className="sidebar-nav">
        <button
          onClick={() => handleChatTypeClick('single')}
          className={cn(
            'sidebar-button',
            activeChatType === 'single' && 'active'
          )}
        >
          <MessageCircle className="icon" />
          <span className="sr-only">Single Chat</span>
        </button>
        <button
          onClick={() => handleChatTypeClick('group')}
          className={cn(
            'sidebar-button',
            activeChatType === 'group' && 'active'
          )}
        >
          <Users className="icon" />
          <span className="sr-only">Group Chat</span>
        </button>
        <button
          onClick={() => handleChatTypeClick('random')}
          className={cn(
            'sidebar-button',
            activeChatType === 'random' && 'active'
          )}
        >
          <Shuffle className="icon" />
          <span className="sr-only">Random Chat</span>
        </button>
      </nav>
      <AnimatePresence>
        {activeChatType && (
          <motion.div
            key="chat-list"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="chat-list"
          >
            <div className="chat-list-content">
              <h2 className="chat-list-title">{activeChatType} Chats</h2>
              {chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  layout
                  className="chat-item"
                  animate={{ height: expandedChat === chat.id ? 'auto' : '80px' }}
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
                  {expandedChat === chat.id && (
                    <div className="chat-item-content">
                      <p>Full chat content for {chat.id} would go here.</p>
                      <p>This is where you'd render the complete chat history and message input.</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}