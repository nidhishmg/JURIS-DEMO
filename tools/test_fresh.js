import fetch from 'node-fetch';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function testConnection() {
    console.log('\n🧪 Testing connection to server...\n');

    try {
        const response = await fetch('http://localhost:5000/health');
        console.log(`✅ Health check: ${response.status} ${response.statusText}`);
        
        const data = await response.text();
        console.log('Response body:', data);
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
    }
}

async function testSyncDraft() {
    console.log('\n🧪 Testing sync draft endpoint...\n');

    const testData = {
        type: 'consumerComplaint',
        inputs: {
            complainantName: 'John Doe',
            age: '30',
            address: '123 Test Street, Test City',
            respondentName: 'ABC Company Ltd',
            natureOfComplaint: 'Defective product and poor service quality'
        }
    };

    try {
        const response = await fetch('http://localhost:5000/api/drafts/generate-sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ SUCCESS! Generated draft:');
            console.log(`ID: ${result.id}`);
            console.log(`Words: ${result.wordCount}`);
            console.log(`Files: ${result.files.length}`);
            console.log(`Preview: ${result.content.substring(0, 200)}...`);
        } else {
            const error = await response.text();
            console.log('❌ Error response:', error);
        }
    } catch (error) {
        console.log('❌ Request failed:', error.message);
    }
}

// Run tests
testConnection().then(() => {
    return delay(1000);
}).then(() => {
    return testSyncDraft();
});