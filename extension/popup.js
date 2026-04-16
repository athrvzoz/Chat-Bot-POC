document.getElementById('scrapeBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const status = document.getElementById('status');
    status.innerText = "Scraping...";

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => document.body.innerText, // Simple text scrape
    }, (results) => {
        if (results && results[0]) {
            const pageText = results[0].result;
            status.innerText = "Sending to Bridge...";
            
            fetch('http://localhost:8000/process_html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html: pageText, url: tab.url })
            })
            .then(response => response.json())
            .then(data => {
                status.innerText = "Context updated successfully!";
                console.log('Success:', data);
            })
            .catch((error) => {
                status.innerText = "Error: Local Bridge not found.";
                console.error('Error:', error);
            });
        }
    });
});
