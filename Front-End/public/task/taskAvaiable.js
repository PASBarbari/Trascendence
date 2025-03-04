import { setVariables, getVariables } from '../var.js';
import { renderTaskActive } from './taskActive.js';
import { getCookie } from '../cookie.js';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/public/taskAvaiable/taskAvaiable.css';
document.head.appendChild(link);

async function joinTasks(task_id, user_id) {
	const { token,url_api } = getVariables();
	console.log("Joining task:", task_id, user_id);
	try {
		const response = await fetch(`${url_api}/task/progress`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": getCookie("csrftoken"),
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ task: task_id, user: user_id }),
		});

		if (response.ok) {
			const data = await response.json();
			console.log("Joined chat:", data);
			document.getElementById(`task-${task_id}`).remove();
			renderTaskActive();
		} else {
			const errorData = await response.json();
			console.error("Errore nella risposta del server:", errorData);
		}
	} catch (error) {
		console.error("Errore nella richiesta:", error);
	}
}

function renderTask(task) {
	const { userId } = getVariables();

	return `
		<div class="card mb-3" id="task-${task.id}">
			<div class="card-body">
				<h5 class="card-title">${task.name} ${task.category}</h5>
				<p class="card-text">${task.description}</p>
				<div class="d-flex justify-content-between">
					<div>
						<h6>Time remaining</h6>
						<p>${task.duration.split(' ')[0]} days</p>
					</div>
					<div>
						<h6>EXP</h6>
						<p>${task.exp}</p>
					</div>
				</div>
				<button class="btn btn-outline-primary" onclick="handleJoinTask(${task.id}, '${userId}')">Join</button>
			</div>
		</div>
	`;
}

async function handleGetTasks(category = 'ALL') {
	const { userId, token, url_api } = getVariables();
	try {
		const response = await fetch(`${url_api}/task/task?user_id=${userId}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": getCookie("csrftoken"),
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.ok) {
			const data = await response.json();
			const filteredTasks = category === 'ALL' ? data : data.filter(task => task.category === category);
			const taskContainer = document.getElementById('taskContainer');
			taskContainer.innerHTML = filteredTasks.map(task => renderTask(task)).join('');
			console.log("AviableTask:", filteredTasks);
		} else {
			const errorData = await response.json();
			console.error("Errore nella risposta del server:", errorData);
		}
	} catch (error) {
		console.error("Errore nella richiesta:", error);
	}
}

function renderTaskAvaiable() {
	const taskContainer = document.getElementById('taskAvailableContainer');
	taskContainer.innerHTML = `
		<div class="taskbox">
			<div class="d-flex justify-content-between align-items-center mb-3">
				<h5>Task Available</h5>
				<div class="dropdown">
					<button class="btn btn-outline-secondary dropdown-toggle" type="button" id="categoryDropdown" data-bs-toggle="dropdown" aria-expanded="false">
						ALL
					</button>
					<ul class="dropdown-menu" aria-labelledby="categoryDropdown">
						<li><a class="dropdown-item" href="#" onclick="filterTasks(event, 'ALL')">ALL</a></li>
						<li><a class="dropdown-item" href="#" onclick="filterTasks(event, 'SP')">SP</a></li>
						<li><a class="dropdown-item" href="#" onclick="filterTasks(event, 'ED')">ED</a></li>
						<li><a class="dropdown-item" href="#" onclick="filterTasks(event, 'HE')">HE</a></li>
						<li><a class="dropdown-item" href="#" onclick="filterTasks(event, 'AR')">AR</a></li>
						<li><a class="dropdown-item" href="#" onclick="filterTasks(event, 'SS')">SS</a></li>
						<li><a class="dropdown-item" href="#" onclick="filterTasks(event, 'MD')">MD</a></li>
					</ul>
				</div>
			</div>
			<div id="taskContainer" class="d-flex flex-column gap-3"></div>
		</div>
	`;

	handleGetTasks();
}

window.renderTaskAvaiable = renderTaskAvaiable;
window.filterTasks = function (event, category) {
	event.preventDefault();
	document.getElementById('categoryDropdown').innerText = category;
	handleGetTasks(category);
};
window.handleJoinTask = joinTasks;

export { renderTaskAvaiable, joinTasks };