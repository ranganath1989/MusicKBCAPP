const axios = require('axios');  

const apiKey = 'baaee9b9f726484abf30a3c7434ff93b'; // Replace with your actual Azure OpenAI API key  baaee9b9f726484abf30a3c7434ff93b
const endpoint = 'https://oai-playground-dev-01.openai.azure.com'; // Replace with your Azure endpoint  
const deploymentName = 'gpt-35-turbo-16k'; // Replace with your deployment name  
const apiVersion = '2024-05-01-preview'; // Update to match the API version  

async function callOpenAIAPI(prompt, maxTokens = 1000, temperature = 1.0) {  
    const headers = {  
        'api-key': apiKey,  
        'Content-Type': 'application/json'  
    };  

    const data = {  
        messages: [
            { role: "system", content: "You are a helpful assistant." },
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
        console.log("Response Data:", response.data);
        console.log("Response Status:", response.status);
        return response.data;  
    } catch (error) {  
        console.error("Error calling OpenAI API:", error);  
        throw error;  
    }  
}  

// Use the function  
callOpenAIAPI("Generate an easy level multiple-choice question on Math. Provide options (A, B, C, D) and mark the correct answer.")  
    .then(response => console.log("Final Response:", JSON.stringify(response, null, 2)))  
    .catch(error => console.error("Error:", error));
