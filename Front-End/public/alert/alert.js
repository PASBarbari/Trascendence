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
        const position = getRandomToastPosition();
        const containerId = `toast-container-${position}`;
        
        container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.style.position = 'fixed';
            container.style.zIndex = '9999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            container.style.maxWidth = '350px';
            container.style.minWidth = '300px';
            
            // Set position based on random corner
            setToastContainerPosition(container, position);
            
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
        
        // Add animation class for entrance
        alertElement.style.opacity = '0';
        alertElement.style.transform = 'translateY(20px)';
        alertElement.style.transition = 'all 0.3s ease-in-out';
        
        container.appendChild(alertElement);
        
        // Trigger entrance animation
        setTimeout(() => {
            alertElement.style.opacity = '1';
            alertElement.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove with exit animation
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.style.opacity = '0';
                alertElement.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    if (alertElement.parentNode) {
                        alertElement.parentNode.removeChild(alertElement);
                        
                        // Clean up empty containers
                        if (container.children.length === 0) {
                            container.parentNode.removeChild(container);
                        }
                    }
                }, 300);
            }
        }, seconds * 1000 - 300);
    } else {
        container.innerHTML = alertHTML;
        setTimeout(() => {
            container.innerHTML = '';
        }, seconds * 1000);
    }
}

function getRandomToastPosition() {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    return positions[Math.floor(Math.random() * positions.length)];
}

function setToastContainerPosition(container, position) {
    // Reset all position properties
    container.style.top = '';
    container.style.bottom = '';
    container.style.left = '';
    container.style.right = '';
    
    const offset = '20px';
    
    switch (position) {
        case 'top-left':
            container.style.top = offset;
            container.style.left = offset;
            break;
        case 'top-right':
            container.style.top = offset;
            container.style.right = offset;
            break;
        case 'bottom-left':
            container.style.bottom = offset;
            container.style.left = offset;
            break;
        case 'bottom-right':
            container.style.bottom = offset;
            container.style.right = offset;
            break;
        default:
            // Default to bottom-left
            container.style.bottom = offset;
            container.style.left = offset;
    }
}

// Optional: Export function to show toast in specific position
export function showToastAtPosition(message, type, seconds, position) {
    const containerId = `toast-container-${position}`;
    let container = document.getElementById(containerId);
    
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.maxWidth = '350px';
        container.style.minWidth = '300px';
        
        setToastContainerPosition(container, position);
        document.body.appendChild(container);
    }
    
    const alertHTML = renderAlert(message, type);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = alertHTML;
    const alertElement = wrapper.firstElementChild;
    
    // Add animation
    alertElement.style.opacity = '0';
    alertElement.style.transform = 'translateY(20px)';
    alertElement.style.transition = 'all 0.3s ease-in-out';
    
    container.appendChild(alertElement);
    
    // Trigger entrance animation
    setTimeout(() => {
        alertElement.style.opacity = '1';
        alertElement.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove with exit animation
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.style.opacity = '0';
            alertElement.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.parentNode.removeChild(alertElement);
                    
                    // Clean up empty containers
                    if (container.children.length === 0) {
                        container.parentNode.removeChild(container);
                    }
                }
            }, 300);
        }
    }, seconds * 1000 - 300);
}