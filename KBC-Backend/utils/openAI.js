const axios = require('axios');  
  
// Azure OpenAI configuration  
const endpoint = process.env.AZURE_OPENAI_ENDPOINT; // The endpoint for Azure OpenAI  
const apiKey = process.env.AZURE_OPENAI_API_KEY; // Your Azure OpenAI API key  
  
// Function to call the Azure OpenAI API  
async function callOpenAIAPI(prompt, deploymentName = "gpt-4o", maxTokens = 1000, temperature = 1.0) {  
    const apiVersion = '2024-08-01-preview'; // Update to match the API version  
    const headers = {  
        'api-key': apiKey,  
        'Content-Type': 'application/json'  
    };  
  
    const data = {  
        messages: [
            { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,  
        temperature: temperature  
    };  


    try {  
        const response = await axios.post(
            `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`, 
            data, 
            { headers: headers }
        ); 
        return response.data;  
    } catch (error) {
        console.error("Error message:", error.message);
        throw error;  
    }  
}  
  
module.exports = {  
    callOpenAIAPI  
};