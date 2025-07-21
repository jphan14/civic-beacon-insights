// Use a single, secure URL for all devices. The QNAP Reverse Proxy handles the rest.
const API_BASE_URL = 'https://hueyphanclub.myqnapcloud.com:8443';

/**
 * Fetches the meeting summaries from the unified API endpoint.
 * @returns {Promise<object>} - The JSON response from the API.
 */
export const fetchMeetingSummaries = async () => {
  // IMPORTANT: The path must start with /api/ for the proxy and server to recognize it.
  const url = `${API_BASE_URL}/api/summaries`;
  console.log(`[FIXED] Attempting to fetch from the single, correct URL: ${url}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json' // Add this header
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[ERROR] API request failed with status: ${response.status}`);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("[SUCCESS] Summaries loaded successfully via Reverse Proxy.");
    return data;

  } catch (error) {
    console.error("[FATAL] Could not fetch meeting summaries:", error);
    throw error;
  }
};