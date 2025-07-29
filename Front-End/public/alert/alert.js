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
	const { asToast = false } = options;
	let container;

	if (asToast) {
		container = document.getElementById("toast-container");
		if (!container) {
			container = document.createElement("div");
			container.id = 'toast-container';
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
