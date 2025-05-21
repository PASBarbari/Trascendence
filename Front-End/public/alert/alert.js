const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/alert/alert.css';
document.head.appendChild(link);

export function renderAlert(message, type) {
	return `
	<div class="alert ${type}">
		${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close">&times;</button>
	</div>
	`;
}

export function showAlertForXSeconds(message, type, seconds, options = {}) {
	const { asToast = false } = options;
	let container;

	if (asToast) {
		container = document.getElementById('toast-container');
		if (!container) {
			container = document.createElement('div');
			container.id = 'toast-container';
			container.style.position = 'fixed';
			container.style.bottom = '20px';
			container.style.left = '20px';
			container.style.zIndex = '9999';
			container.style.display = 'flex';
			container.style.flexDirection = 'column';
			container.style.gap = '10px';
			document.body.appendChild(container);
		}
	} else {
		container = document.getElementById('alert-container');
		if (!container) {
			console.error("Alert container not found");
			return;
		}
	}

	const alertHTML = renderAlert(message, type);
	const wrapper = document.createElement('div');
	wrapper.innerHTML = alertHTML;

	if (asToast) {
		const alertElement = wrapper.firstElementChild;
		container.appendChild(alertElement);
		setTimeout(() => {
			if (alertElement.parentNode) {
				alertElement.parentNode.removeChild(alertElement);
			}
		}, seconds * 1000);
	} else {
		container.innerHTML = alertHTML;
		setTimeout(() => {
			container.innerHTML = '';
		}, seconds * 1000);
	}
}
