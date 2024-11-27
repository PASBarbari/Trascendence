import "./TaskAvaiable.css";
import React, { useEffect, useState } from "react";
import { getCookie } from "../Cookie.jsx";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { Avatar, ListItemAvatar } from "@mui/material";
import Task from "../Task/Task.jsx";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";

export default function TaskAvaiable() {
  const [tasks, setTask] = useState([]);
  const [value, setValue] = React.useState("SP");
  const tabListRef = React.useRef(null);
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const filteredTasks = tasks.filter((task) => task.category === value);

  const handleGetTasks = async () => {
    try {
      const response = await fetch("http://localhost:8002/task/task", {
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

  useEffect(() => {
    const selectedTab = tabListRef.current.querySelector(
      `[aria-selected="true"]`
    );
    if (selectedTab) {
      selectedTab.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [value]);

  function renderTabPanel(category) {
    const filteredTasks = tasks.filter((task) => task.category === category);
    return (
      <TabPanel key={category} value={category}>
        <List>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task, index) => (
              <ListItem key={index}>
                <Task task={task} />
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

  const categories = ["SP", "ED", "HE", "AR", "SS", "MD"];

  return (
    <Box sx={{ bgcolor: "white", borderRadius: "8px", maxWidth: "400px" }}>
      <TabContext value={value}>
        <Box sx={{ borderBottom: 0, borderColor: "divider" }}>
          <TabList
            onChange={handleChange}
            aria-label="lab API tabs example"
            variant="scrollable"
            scrollButtons="false"
            ref={tabListRef}
          >
            {categories.map((category) => (
              <Tab key={category} label={category} value={category} />
            ))}
          </TabList>
        </Box>
        {categories.map((category) => renderTabPanel(category))}
      </TabContext>
    </Box>
  );
}
