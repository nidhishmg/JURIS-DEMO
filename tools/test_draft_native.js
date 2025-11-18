const https = require('https');
const http = require('http');

function makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = (parsedUrl.protocol === 'https:' ? https : http).request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: body,
                    headers: res.headers
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testDraftAPI() {
    console.log('🧪 Testing draft generation...\n');

    const testData = {
        templateId: 'bail_application',
        inputs: {
            CourtName: 'Sessions Court Delhi',
            CaseNumber: 'SC-123/2025',
            PetitionerName: 'John Doe',
            AccusedName: 'John Doe',
            FIRNumber: '420 IPC',
            PoliceStation: 'Central Police Station',
            OffenceSections: '506 IPC',
            Facts: 'murder as begni comtted',
            Grounds: 'ufhufuf the cops',
            ResidenceAddress: '123 Test Street, Test City',
            MaxPunishment: '7 years',
            Prayer: 'Grant bail to the accused'
        },
        title: 'Test Bail Application'
    };

    try {
        const response = await makeRequest('http://localhost:5000/api/drafts/generate-sync', 'POST', testData);
        
        console.log(`Status: ${response.status}`);
        
        if (response.status === 200) {
            const result = JSON.parse(response.body);
            console.log('✅ SUCCESS!');
            console.log(`Draft ID: ${result.id}`);
            console.log(`Content preview: ${result.content.substring(0, 200)}...`);
        } else {
            console.log('❌ Error response:');
            console.log(response.body);
        }
    } catch (error) {
        console.log('❌ Request failed:', error.message);
    }
}

testDraftAPI();