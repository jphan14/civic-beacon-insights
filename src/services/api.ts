/**
 * Detects if the user is on a mobile device.
 * @returns {boolean} - True if on mobile, false otherwise.
 */
const isMobile = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  // A standard regex to detect most mobile and tablet user agents
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Gets the correct API base URL based on the device.
 * @returns {string} - The API URL (HTTP for mobile, HTTPS for desktop).
 */
const getApiBaseUrl = (): string => {
  if (isMobile()) {
    console.log("📱 Mobile device detected. Using HTTP endpoint: http://hueyphanclub.myqnapcloud.com:8080");
    return 'http://hueyphanclub.myqnapcloud.com:8080';
  } else {
    console.log("💻 Desktop device detected. Using HTTPS endpoint: https://hueyphanclub.myqnapcloud.com:8443");
    return 'https://hueyphanclub.myqnapcloud.com:8443';
  }
};

// The single, configured API URL for the entire app to use
const API_BASE_URL = getApiBaseUrl();

/**
 * Fetches the meeting summaries from the correct endpoint.
 * Includes a 15-second timeout for network reliability.
 * @returns {Promise<object>} - The JSON response from the API.
 */
export const fetchMeetingSummaries = async () => {
  const url = `${API_BASE_URL}/api/summaries`;
  console.log(`📡 Fetching summaries from: ${url}`);

  try {
    // AbortController is used to set a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error("Request timed out after 15 seconds.");
      controller.abort();
    }, 15000); // 15-second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`API request failed with status ${response.status}`);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Summaries loaded successfully.");
    return data;

  } catch (error) {
    console.error("❌ Failed to fetch meeting summaries:", error);
    // Re-throw the error so the UI component knows the request failed
    throw error;
  }
};