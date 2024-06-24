const axios = require('axios');

// Function to get dynamic data from the provided URL
async function getDynamicData() {
  try {
    const response = await axios.get('https://magic.notion.lol/webhook/bbl_refresh_ocr_qna');
    return response.data;
  } catch (error) {
    console.error('Error fetching dynamic data:', error);
    throw error;
  }
}

// Function to make the POST request with dynamic data
async function makePostRequest() {
  try {
    const dynamicData = await getDynamicData();

    // console.log(dynamicData[0].text1);
    const message = dynamicData[0].text1;

    // Assuming the dynamicData is in the correct format, otherwise adjust accordingly
    const data = JSON.stringify({
      "messages": message,
      "model": "gpt-4"
    });

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'http://localhost:8766/v1/chat/completions',
      headers: { 
        'Content-Type': 'application/json'
      },
      data: data
    };

    const response = await axios.request(config);
    console.log(JSON.stringify(response.data));
  } catch (error) {
    console.error('Error making POST request:', error);
  }
}

// Execute the function to make the POST request
makePostRequest();