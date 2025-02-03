let variables = {
    token: null,
    userEmail: null,
    userUsername: null,
    userId: null,
    name: null,
    surname: null,
    birthdate: null,
    bio: null,
};

// Carica le variabili da localStorage se esistono
const savedVariables = localStorage.getItem('variables');
if (savedVariables) {
    variables = JSON.parse(savedVariables);
}

export function setVariables(newVariables) {
    variables = { ...variables, ...newVariables };
    localStorage.setItem('variables', JSON.stringify(variables));
    //console.log('Variables set:', variables);
}

export function getVariables() {
    //console.log('Variables retrieved:', variables);
    return variables;
}