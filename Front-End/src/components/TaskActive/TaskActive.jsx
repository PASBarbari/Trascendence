import "./TaskActive.css";
import React, { useEffect, useState } from "react";
import { getCookie } from "../Cookie.jsx";
import Task2 from "./Task2.jsx"; // Import Task2 component
import Box from "@mui/material/Box";
import Button from '@mui/material/Button';
import Typography from "@mui/material/Typography";

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

		<Box
			sx={{
				backgroundColor: "white",
				borderRadius: "10px",
				boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
				minWidth: "250px",
				width: "100%",
			}}
		>
			<Box sx={{ display: "flex", justifyContent: "space-between", borderBottom: 0, borderColor: "divider", alignItems: "center", padding: "10px", height: "40px" }}>
				<Typography variant="body1">task active</Typography>
			</Box>
			<Box sx={{ padding: "10px", paddingTop: "0px", display: "flex", flexDirection: "column", gap: "10px" }}>
			{tasks.length > 0 ? (
				tasks.map((task, index) => (
					<Task2 key={index} id={task.id} task={task} /> // Use Task2 component
				))
			) : (
				<p>No tasks active</p>
			)}
			</Box>
		</Box>
	);
}