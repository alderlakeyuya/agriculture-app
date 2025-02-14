document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');
    
    fetch('https://agriculture-app-ynyo.onrender.com/vegetables')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            contentDiv.innerHTML = '<h2>Vegetable List</h2>';
            const list = document.createElement('ul');
            data.forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = `${item.vegetable_name} - ${item.harvest_quantity} ${item.unit}`;
                list.appendChild(listItem);
            });
            contentDiv.appendChild(list);
        })
        .catch(error => {
            console.error('Error fetching vegetable data:', error);
            contentDiv.innerHTML = '<p>Error loading vegetable data. Please try again later.</p>';
        });
});