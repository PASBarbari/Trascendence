export function renderAlert(message, type) {
	const wrapper = document.createElement("div");
	wrapper.className = `alert alert-${type} alert-dismissible fade show`;
	wrapper.setAttribute("role", "alert");

	const msgSpan = document.createElement("span");
	msgSpan.textContent = message; // Safe: escapes HTML

	const closeBtn = document.createElement("button");
	closeBtn.type = "button";
	closeBtn.className = "btn-close";
	closeBtn.setAttribute("data-bs-dismiss", "alert");
	closeBtn.setAttribute("aria-label", "Close");

	wrapper.appendChild(msgSpan);
	wrapper.appendChild(closeBtn);

	return wrapper;
}

export function showAlertForXSeconds(message, type, seconds, options = {}) {
	const { asToast = false, game = false } = options;
	if (game) {
		// Use the notification system for game alerts
		showNotification(message, type, seconds);
		return;
	}
	let container;

	if (asToast) {
		container = document.getElementById("toast-container");
		if (!container) {
			container = document.createElement("div");
			container.id = "toast-container";
			container.style.position = "fixed";
			container.style.bottom = "20px";
			container.style.left = "20px";
			container.style.zIndex = "9999";
			container.style.display = "flex";
			container.style.flexDirection = "column";
			container.style.gap = "10px";
			document.body.appendChild(container);
		}
	} else {
		container = document.getElementById("alert-container");
		if (!container) {
			console.error("Alert container not found");
			return;
		}
	}

	const alertElement = renderAlert(message, type);

	if (asToast) {
		container.appendChild(alertElement);
		setTimeout(() => {
			if (alertElement.parentNode) {
				alertElement.parentNode.removeChild(alertElement);
			}
		}, seconds * 1000);
	} else {
		container.innerHTML = ""; // Clear previous
		container.appendChild(alertElement);
		setTimeout(() => {
			container.innerHTML = "";
		}, seconds * 1000);
	}
}

// Show Bootstrap toast notification
export function showNotification(message, type = "info", seconds = 5) {
	// Remove existing notifications
	const existingNotifications = document.querySelectorAll(
		".unified-notification"
	);
	existingNotifications.forEach((notification) => notification.remove());

	const typeIcons = {
		success: "✅",
		error: "❌",
		info: "ℹ️",
		warning: "⚠️",
	};

	const typeNames = {
		success: "Success",
		error: "Error",
		info: "Information",
		warning: "Warning",
	};

	// Build notification DOM safely
	const notification = document.createElement("div");
	notification.className = `unified-notification ${type}`;

	const header = document.createElement("div");
	header.className = "unified-notification-header";

	const iconSpan = document.createElement("span");
	iconSpan.className = "unified-notification-icon";
	iconSpan.textContent = typeIcons[type] || "";

	const titleSpan = document.createElement("span");
	titleSpan.className = "unified-notification-title";
	titleSpan.textContent = typeNames[type] || "";

	const closeBtn = document.createElement("button");
	closeBtn.className = "unified-notification-close";
	closeBtn.type = "button";
	closeBtn.setAttribute("aria-label", "Close");
	closeBtn.textContent = "×";
	closeBtn.onclick = function () {
		if (notification.parentNode)
			notification.parentNode.removeChild(notification);
	};

	header.appendChild(iconSpan);
	header.appendChild(titleSpan);
	header.appendChild(closeBtn);

	const body = document.createElement("div");
	body.className = "unified-notification-body";
	body.textContent = message; // XSS safe

	const progress = document.createElement("div");
	progress.className = "unified-notification-progress";
	progress.style.width = "100%";

	notification.appendChild(header);
	notification.appendChild(body);
	notification.appendChild(progress);

	document.body.appendChild(notification);

	// Show with animation
	setTimeout(() => {
		notification.classList.add("show");
	}, 100);

	// Auto-dismiss after 5 seconds
	setTimeout(() => {
		if (notification.parentNode) {
			notification.classList.remove("show");
			notification.classList.add("hide");
			setTimeout(() => {
				if (notification.parentNode) {
					notification.remove();
				}
			}, 300);
		}
	}, seconds * 1000);

	// Animate progress bar
	progress.style.transition = `width ${seconds * 1000}ms linear`;
	progress.style.width = "0%";
}
