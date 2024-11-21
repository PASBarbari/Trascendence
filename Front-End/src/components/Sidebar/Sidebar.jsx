import React, { useState } from 'react';
import { List, ListItemText, Collapse, Box } from '@mui/material';
import { FiHome, FiCheckSquare, FiMessageSquare, FiBarChart, FiFolder, FiUsers, FiSettings } from 'react-icons/fi';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import StyledDrawer from './StyledDrawer';
import MenuButton from './MenuButton';
import StyledListItem from './StyledListItem';
import SideChats from '../Chat/SideChats'; // Import SideChats component

const Sidebar = ({ onChatClick }) => {
  const [open, setOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState("Home");
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const menuItems = [
    { text: "Home", icon: <FiHome size={24} /> },
    { text: "Chat", icon: <FiMessageSquare size={24} />, onClick: onChatClick },
    { text: "Analytics", icon: <FiBarChart size={24} /> },
    {
      text: "Tasks",
      icon: <FiCheckSquare size={24} />,
      subItems: ["Active", "Archived", "Completed"]
    },
    { text: "Team", icon: <FiUsers size={24} /> },
    { text: "Settings", icon: <FiSettings size={24} /> }
  ];

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleItemClick = (text, onClick) => {
    setSelectedItem(text);
    if (text === "Tasks") {
      setSubMenuOpen(!subMenuOpen);
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <Box sx={{ display: "flex" }}>
      <StyledDrawer variant="permanent" open={open}>
        <List>
          {menuItems.map((item) => (
            <React.Fragment key={item.text}>
              <StyledListItem
                button
                onClick={() => handleItemClick(item.text, item.onClick)}
                selected={selectedItem === item.text}
                aria-label={item.text}
              >
                {item.icon}
                <ListItemText primary={item.text} />
              </StyledListItem>
              {item.subItems && (
                <Collapse in={subMenuOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <StyledListItem
                        key={subItem}
                        button
                        onClick={() => setSelectedItem(subItem)}
                        selected={selectedItem === subItem}
                        sx={{ pl: 4 }}
                        aria-label={subItem}
                      >
                        <ListItemText primary={subItem} />
                      </StyledListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
      </StyledDrawer>
    </Box>
  );
};

export default Sidebar;