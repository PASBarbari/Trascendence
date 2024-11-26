import "./TaskActive.css";
import React, { useEffect, useState } from "react";
import { getCookie } from "../Cookie.jsx";

{
  /* //elenco delle task in cui sei iscritto e percentuale di avanzamento */
}

export default function TaskActive() {
  const [tasks, setTask] = useState([]);
  const user_id = localStorage.getItem("user_id");

  const handleGetActiveTasks = async () => {
    try {
      const response = await fetch(
        `http://localhost:8002/task/progress?user_id=${user_id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTask(data);
        console.log("ActiveTask:", data);
      } else {
        const errorData = await response.json();
        console.error("Errore ActiveTask:", errorData);
      }
    } catch (error) {
      console.error("Errore ActiveTask:", error);
    }
  };

  // const handleCompleteTask = async (task_id) => {
  // 	try {
  // 		const response = await fetch(`http://localhost:8002/task/progress/${task_id}/`, {
  // 			method: "DELETE",
  // 			headers: {
  // 				"Content-Type": "application/json",
  // 				"X-CSRFToken": getCookie("csrftoken"),
  // 				"Authorization": `Bearer ${localStorage.getItem("token")}`,
  // 			},
  // 		});

  // 		if (response.ok) {
  // 			const data = await response.json();
  // 			console.log("CompletedTask:", data);
  // 			handleGetActiveTasks();
  // 		} else {
  // 			const errorData = await response.json();
  // 			console.error("Errore CompletedTask:", errorData);
  // 		}
  // 	} catch (error) {
  // 		console.error("Errore CompletedTask:", error);
  // 	}
  // }

  const handleCompleteTask = async (task_id, task_rate) => {
    const user_id = localStorage.getItem("user_id");
    try {
      const response = await fetch(
        `http://localhost:8002/task/progress/${task_id}&${user_id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
					body: JSON.stringify({ rate: task_rate }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        console.log("CompletedTask:", data);
        handleGetActiveTasks();
      } else {
        const errorData = await response.json();
        console.error("Errore CompletedTask:", errorData);
      }
    } catch (error) {
      console.error("Errore CompletedTask:", error);
    }
  };

  useEffect(() => {
    handleGetActiveTasks();
  }, []);

  return (
    <div className="taskbox">
      <div className="task-active">
        <div className="task-active-text">
          {tasks.length > 0 ? (
            <div>
              {tasks.map((task, index) => (
                <div
                  key={index}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <p>{`${task.task.name}: ${task.task.description}, ${task.task.duration}, ${task.task.exp}, ${task.rate}`}</p>
                  <button onClick={() => handleCompleteTask(task.task.id, 100)}>
                    Completa {task.task.name}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>No tasks active</p>
          )}
        </div>
      </div>
    </div>
  );
}
