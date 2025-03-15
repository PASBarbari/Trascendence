let variables = {
	token: null,
	userEmail: null,
	userUsername: null,
	userId: null,
	name: null,
	surname: null,
	birthdate: null,
	bio: null,
	level: 0,
	exp: 0,
	profileImageUrl: null,

	multiplayer_username: null,
	multiplayer_id: null,
	url_api: "https://trascendence.42firenze.it/api",
	wss_api: "wss://trascendence.42firenze.it/api",
};

// Carica le variabili da localStorage se esistono
const savedVariables = localStorage.getItem("variables");
if (savedVariables) {
	variables = JSON.parse(savedVariables);
}

export function setVariables(newVariables) {
	variables = { ...variables, ...newVariables };
	localStorage.setItem("variables", JSON.stringify(variables));
	//console.log('Variables set:', variables);
}

export function getVariables() {
	//console.log('Variables retrieved:', variables);
	return variables;
}
