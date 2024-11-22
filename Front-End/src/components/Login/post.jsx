import { getCookie } from '../Cookie.jsx';

// Funzione per ottenere i dati dell'utente
const handleGetUser = async (csrftoken) => {
  try {
    const response = await fetch('http://localhost:8000/login/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const { user, user_id } = data;
      const { email, username } = user;

      localStorage.setItem('user_email', email);
      localStorage.setItem('user_username', username);
      localStorage.setItem('user_id', user_id);
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
};

// Funzione per eseguire la richiesta di login
const loginUser = async (email, password, csrftoken, navigate) => {
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
      localStorage.setItem('token', data.access_token);
			return true;
    } else {
			const errorData = await response.json();
      console.error('Errore nella risposta del server:', errorData);
			return false;
    }
  } catch (error) {
    console.error('Errore nella richiesta:', error);
		return false;
  }
};

// Funzione per gestire l'evento di submit
export const onHandleSubmit = async (e, email, password, navigate) => {
	e.preventDefault();
  if (email && password) {
		console.log('Username:', email);
    console.log('Password:', password);
    const csrftoken = getCookie('csrftoken');
    const loginSuccess = await loginUser(email, password, csrftoken, navigate);
		if (loginSuccess) {
			await handleGetUser(csrftoken); // TODO gestire return false?
			navigate('/home');
		}
  } else {
    console.log('Per favore, inserisci sia username che password.');
  }
};
