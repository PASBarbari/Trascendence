import "./TaskAvaiable.css";
import React, { useEffect, useState } from "react";
import { getCookie } from "../Cookie.jsx";

{
  /* //task disponibili a cui ti puoi iscrivere per categoria  */
}

const joinTasks = async (task_id, user_id) => {
	try {
		const response = await fetch(`http://localhost:8002/task/progress`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": getCookie("csrftoken"),
				"Authorization": `Bearer ${localStorage.getItem("token")}`,
			},
			body: JSON.stringify({ task: task_id, user: user_id, }),
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
	const user_id = localStorage.getItem("user_id");
  const [tasks, setTask] = useState([]);

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

  return (
    <div className="taskbox">
      <div className="task-avaiable">
        <div className="task-avaiable-text">
          {tasks.length > 0 ? (
            <div>
              {tasks.map((task, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center" }}>
                  <p>{`${task.name}: ${task.description}, ${task.duration}, ${task.exp}`}</p>
                  <button onClick={() => handleJoinTask(task.id)}>Iscriviti a {task.name}</button>
                </div>
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
