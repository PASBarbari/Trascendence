import { setVariables, getVariables } from './var.js';
import { getCookie } from './cookie.js';

function renderLogin() {
    const appDiv = document.querySelector('.App');

    // Aggiungi dinamicamente il file CSS per la pagina di login
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'login.css';
    document.head.appendChild(link);

    appDiv.innerHTML = `
        <div class="login">
            <div class="login_box">
                <h1>Login</h1>
                <div class="login_form">
                    <form class="login_form" id="loginForm">
                        <div class="mb-3">
                            <input type="email" id="email" placeholder="Email" class="form-control" required />
                        </div>
                        <div class="mb-3">
                            <input type="password" id="password" placeholder="Password" class="form-control" required />
                        </div>
                        <div class="empty"></div>
                        <button type="submit" class="btn btn-primary w-100" style="height: 40px;">Login</button>
                        <button type="button" id="registerButton" class="btn btn-secondary w-100 mt-2" style="height: 40px;">Register</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        await onHandleSubmit(e, email, password);
    });

    document.getElementById('registerButton').addEventListener('click', function() {
        window.navigateTo('/register');
    });
}

async function onHandleSubmit(e, email, password) {
    e.preventDefault();
    if (email && password) {
        console.log('Email:', email);
        console.log('Password:', password);
        const csrftoken = getCookie('csrftoken');
        const loginSuccess = await loginUser(email, password, csrftoken);
        if (loginSuccess) {
            await handleGetUser(csrftoken);
            window.navigateTo('/home');
        }
    } else {
        console.log('Per favore, inserisci sia email che password.');
    }
}

async function loginUser(email, password, csrftoken) {
    try {
        const response = await fetch('http://localhost:8000/login/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Risposta dal server:', data);

            setVariables({ token: data.access_token });
            return true;
        } else {
            const errorData = await response.json();
            console.error('Errore login:', errorData);
            return false;
        }
    } catch (error) {
        console.error('Exception login:', error);
        return false;
    }
}

async function handleGetUser(csrftoken) {
    try {
        const { token } = getVariables();
        const response = await fetch('http://localhost:8000/login/user', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            const { user, user_id } = data;
            const { email, username } = user;

            setVariables({
                userEmail: email,
                userUsername: username,
                userId: user_id
            });

            console.log('User email:', email);
            console.log('User username:', username);
            console.log('User ID:', user_id);
        } else {
            const errorData = await response.json();
            console.error('Errore nella risposta del server:', errorData);
        }
    } catch (error) {
        console.error('Errore nella richiesta:', error);
    }
}

export { renderLogin };