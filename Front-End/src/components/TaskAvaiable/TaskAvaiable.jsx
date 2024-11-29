import "./TaskAvaiable.css";
import React, { useEffect, useState } from "react";
import { getCookie } from "../Cookie.jsx";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import TabContext from "@mui/lab/TabContext";
import TabPanel from "@mui/lab/TabPanel";
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Grow from '@mui/material/Grow';
import Typography from '@mui/material/Typography';
import Task from "./Task.jsx";

const joinTasks = async (task_id, user_id) => {
  console.log("Joining task:", task_id, user_id);
  try {
    const response = await fetch(`http://localhost:8002/task/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ task: task_id, user: user_id }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Joined chat:", data);
    } else {
      const errorData = await response.json();
      console.error("Errore nella risposta del server:", errorData);
    }
  } catch (error) {
    console.error("Errore nella richiesta:", error);
  }
};

export default function TaskAvaiable() {
  const [tasks, setTask] = useState([]);
  const [value, setValue] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [anchorEl, setAnchorEl] = useState(null);
	const user_id = localStorage.getItem("user_id");


  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (category) => {
    setValue(category);
    setSelectedCategory(category);
    handleClose();
  };

  const filteredTasks = value === "ALL" ? tasks : tasks.filter((task) => task.category === value);

  const handleGetTasks = async () => {
    try {
      const response = await fetch(`http://localhost:8002/task/task?user_id=${user_id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTask(data);
        console.log("AviableTask:", data);
      } else {
        const errorData = await response.json();
        console.error("Errore nella risposta del server:", errorData);
      }
    } catch (error) {
      console.error("Errore nella richiesta:", error);
    }
  };

  useEffect(() => {
    handleGetTasks();
  }, []);

  const handleJoinTask = (task_id) => {
    const user_id = localStorage.getItem("user_id");
    joinTasks(task_id, user_id);
  };

  function renderTabPanel(category) {
    const filteredTasks = category === "ALL" ? tasks : tasks.filter((task) => task.category === category);
    return (
      <TabPanel key={category} value={category} sx={{ padding: "0px" }}>
        <List sx={{ padding: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task, index) => (
              <ListItem key={index} sx={{ padding: "0px", flexDirection: "column", alignItems: "stretch"}}>
				<Task task={task}/>
                {/*<Task task={task} handleJoinTask={handleJoinTask()} />*/}
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="No tasks available" />
            </ListItem>
          )}
        </List>
      </TabPanel>
    );
  }

  const categories = ["ALL", "SP", "ED", "HE", "AR", "SS", "MD"];

  return (
    <Box sx={{ bgcolor: "white", borderRadius: "8px"}}>
      <TabContext value={value}>
        <Box sx={{ display: "flex", justifyContent: "space-between", borderBottom: 0, borderColor: "divider", alignItems: "center", padding: "10px" }}>
		<Typography variant="body1">task disponibili</Typography>
          <Button
            id="demo-positioned-button"
            aria-controls={Boolean(anchorEl) ? 'demo-positioned-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
            onClick={handleClick}
			variant="outlined"
          >
            {selectedCategory}
          </Button>
          <Menu
            id="demo-positioned-menu"
            aria-labelledby="demo-positioned-button"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            TransitionComponent={Grow}
			sx={{padding: "10px"}}

          >
            {categories.map((category) => (
              <MenuItem
                key={category}
                onClick={() => handleMenuItemClick(category)}
              >
                {category}
              </MenuItem>
            ))}
          </Menu>
        </Box>
        {categories.map((category) => renderTabPanel(category))}
      </TabContext>
    </Box>
  );
}