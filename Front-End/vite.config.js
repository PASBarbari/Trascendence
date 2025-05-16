export default {
	server: {
		port: 3000,
		host: "0.0.0.0",
		watch: {
			usePolling: true,
			interval: 100,
			ignored: ["**/node_modules/**", "**/dist/**"],
		},
		hmr: {
			// Change this to properly handle WebSocket connections
			clientPort: null, // Let Vite detect the port
			path: "/@hmr", // Explicit HMR path
			timeout: 5000, // Longer timeout
			overlay: true, // Show errors as overlay
		},
		allowedHosts: ["localhost", "127.0.0.1", "trascendence.42firenze.it"],
	},
	publicDir: "public",
	cacheDir: ".vite",
	optimizeDeps: {
		force: true,
	},
};
