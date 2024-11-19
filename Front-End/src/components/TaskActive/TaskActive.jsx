import "./TaskActive.css";
import React, { useEffect, useState } from "react";
import { getCookie } from "../Cookie.jsx";

{
	/* //elenco delle task in cui sei iscritto e percentuale di avanzamento */
}

export default function TaskActive() {
	const [tasks, setTask] = useState([]);

	const handleGetActiveTasks = async () => {
		try {
			const response = await fetch("http://localhost:8002/task/progress", {
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
		<div className="taskbox">
			<div className="task-active">
				<div className="task-active-text">
					{tasks.length > 0 ? (
						<div>
							{tasks.map((task, index) => (
								<p key={index}>{`${task.name}: ${task.description}, ${task.duration}, ${task.exp}`}</p>
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