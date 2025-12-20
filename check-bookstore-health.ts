import axios from 'axios';

const BOOKSTORE_URL = 'https://indie-quill-bookstore.onrender.com/api/authors/register';

async function checkHealth() {
  console.log(`[${new Date().toLocaleTimeString()}] Checking Bookstore health...`);
  try {
    const response = await axios.post(BOOKSTORE_URL, {}, { timeout: 5000 });
    console.log(`✅ Status: ${response.status} - The Bookstore is responding!`);
  } catch (error: any) {
    if (error.response) {
      if (error.response.status === 500) {
        console.error(`❌ Status: 500 - Bookstore is still crashing.`);
      } else {
        console.log(`⚠️ Status: ${error.response.status} - Server is up, but rejecting the empty payload (This is good!).`);
      }
    } else {
      console.error(`🚫 Connection Error: ${error.message}`);
    }
  }
}

setInterval(checkHealth, 30000);
checkHealth();
