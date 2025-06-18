let variables = {
	token: null,
	refreshToken: null,
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
	has_two_factor_auth: false,
	oauth_url: null,
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

export function processOAuthRedirect() {
	const urlParams = new URLSearchParams(
		window.location.hash.replace("#home", "")
	);

	const accessToken = urlParams.get("access_token");
	if (accessToken) {
		// Store the tokens
		setVariables({
			token: accessToken,
			refreshToken: urlParams.get("refresh_token"),
			userId: urlParams.get("user_id"),
			userUsername: urlParams.get("username"),
			userEmail: urlParams.get("email"),
		});

		// Clean the URL
		const cleanUrl =
			window.location.origin + window.location.pathname + "#home";
		window.history.replaceState({}, document.title, cleanUrl);
		console.log("OAuth tokens stored:", variables);
		return true;
	}
	return false;
}
