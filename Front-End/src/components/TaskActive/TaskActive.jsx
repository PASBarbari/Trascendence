import "./TaskActive.css";
import React, { useEffect, useState } from "react";
import { getCookie } from "../Cookie.jsx";
import Task2 from "../Task/Task2"; // Import Task2 component
import Box from "@mui/material/Box";

export default function TaskActive() {
  const [tasks, setTask] = useState([]);

  const handleGetActiveTasks = async () => {
    try {
      const response = await fetch("http://localhost:8002/task/progress", {
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
        console.log("ActiveTask:", data);
      } else {
        const errorData = await response.json();
        console.error("Errore nella risposta del server:", errorData);
      }
    } catch (error) {
      console.error("Errore nella richiesta:", error);
    }
  };

  useEffect(() => {
    handleGetActiveTasks();
  }, []);

  return (
    <Box
      sx={{
        backgroundColor: "white",
        padding: "10px",
        borderRadius: "10px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
   		overflowY: 'auto',
		minHeight: '380px',
		maxHeight: '380px',
      }}
    >
      {tasks.length > 0 ? (
        tasks.map((task, index) => (
          <Task2 key={index} task={task} /> // Use Task2 component
        ))
      ) : (
        <p>No tasks active</p>
      )}
    </Box>
  );
}
