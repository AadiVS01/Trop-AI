export function validateEnv() {
    const required = [
        "GROQ_API_KEY",
        "SERP_API_KEY",
        "RAPIDAPI_KEY",
        "RAPIDAPI_HOST",
        "RAPIDAPI_HOST_AGODA",
        "RAPIDAPI_HOST_IRCTC"
    ];

    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
        throw new Error(`Missing environment variables: ${missing.join(", ")}`);
    }
}

export function getCurrentDateStr(): string {
    return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
