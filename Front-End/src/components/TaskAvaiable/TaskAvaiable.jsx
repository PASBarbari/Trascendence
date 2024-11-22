import "./TaskAvaiable.css";
import React, { useEffect, useState } from "react";
import { getCookie } from "../Cookie.jsx";

{
  /* //task disponibili a cui ti puoi iscrivere per categoria  */
}

export default function TaskAvaiable() {
  const [tasks, setTask] = useState([]);

  const handleGetTasks = async () => {
    try {
      const response = await fetch("http://localhost:8002/task/task", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
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

  return (
    <div className="taskbox">
      <div className="task-avaiable">
        <div className="task-avaiable-text">
          {tasks.length > 0 ? (
            <div>
              {tasks.map((task, index) => (
                <p key={index}>{`${task.name}: ${task.description}, ${task.duration}, ${task.exp}`}</p>
              ))}
            </div>
          ) : (
            <p>No tasks available</p>
          )}
        </div>
      </div>
    </div>
  );
}
