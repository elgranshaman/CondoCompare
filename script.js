// Store properties in localStorage
let properties = JSON.parse(localStorage.getItem('properties')) || [];

// Form elements
const propertyForm = document.getElementById('propertyForm');
const propertyList = document.getElementById('propertyList');
const summarizeBtn = document.querySelector('.summarize');
const apiKeyInput = document.getElementById('apiKey');
const generateSummariesToggle = document.getElementById('generateSummaries');
const photoInput = document.getElementById('photoCapture');
const photoPreview = document.getElementById('photoPreview');
const previewImage = document.getElementById('previewImage');
const noPhotoText = document.getElementById('noPhotoSelected');
const photoUrlInput = document.getElementById('photoUrl');
const resetButton = document.getElementById('resetButton');

// Add event listener for the CondoCompare button
summarizeBtn.addEventListener('click', function() {
    generateComparisonResults();
});

// Add event listener for the Reset button
resetButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to start from beginning? This will delete all your recorded properties and cannot be undone.')) {
        // Clear properties array
        properties = [];
        
        // Clear localStorage data
        localStorage.removeItem('properties');
        
        // Keep API key if it exists
        const apiKey = localStorage.getItem('apiKey');
        const generateSummaries = localStorage.getItem('generateSummaries');
        
        // Clear comparison results if they exist
        const comparisonResults = document.getElementById('comparisonResults');
        if (comparisonResults) {
            comparisonResults.remove();
        }
        
        // Update the UI
        displayProperties();
        
        // Show confirmation to user
        alert('All property data has been cleared. You can now start fresh!');
    }
});

// Initialize from localStorage
if (localStorage.getItem('apiKey')) {
    apiKeyInput.value = localStorage.getItem('apiKey');
}

// Save API key to localStorage when it changes
apiKeyInput.addEventListener('change', function() {
    localStorage.setItem('apiKey', this.value);
});

// Set the toggle to the saved state
if (localStorage.getItem('generateSummaries') === 'false') {
    generateSummariesToggle.checked = false;
} else {
    generateSummariesToggle.checked = true;
}

// Save toggle state to localStorage
generateSummariesToggle.addEventListener('change', function() {
    localStorage.setItem('generateSummaries', this.checked);
});

// Handle photo capture or file upload
let capturedPhoto = null;
photoInput.addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            capturedPhoto = e.target.result; // Store the base64 data
            previewImage.src = capturedPhoto;
            previewImage.style.display = 'block';
            noPhotoText.style.display = 'none';
        };
        
        reader.readAsDataURL(file);
    }
});

// Rating descriptions
const ratingDescriptions = {
    '1': 'Poor',
    '2': 'Fair',
    '3': 'Good',
    '4': 'Very Good',
    '5': 'Excellent'
};

// Rating CSS classes
const ratingClasses = {
    '1': 'rating-poor',
    '2': 'rating-fair',
    '3': 'rating-good',
    '4': 'rating-very-good',
    '5': 'rating-excellent'
};

// Add tooltips to rating labels
document.querySelectorAll('.rating-dots label').forEach(label => {
    const value = label.getAttribute('for').slice(-1);
    label.setAttribute('data-rating', `${value} - ${ratingDescriptions[value]}`);
});

// Display existing properties on page load
displayProperties();

// Helper function to get rating description
function getRatingDescription(rating) {
    return ratingDescriptions[rating] || rating;
}

// Helper function to get rating class
function getRatingClass(rating) {
    return ratingClasses[rating] || '';
}

// Handle form submission
propertyForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Collect form data
    const propertyData = {
        id: Date.now(), // Unique identifier
        name: document.getElementById('name').value,
        location: document.getElementById('location').value,
        size: document.getElementById('size').value,
        price: document.getElementById('price').value,
        gutFeeling: document.getElementById('gutFeeling').value,
        likes: Array.from(document.querySelectorAll('.like')).map(input => input.value),
        dislikes: Array.from(document.querySelectorAll('.dislike')).map(input => input.value),
        amenities: {
            kitchen: document.querySelector('input[name="kitchen"]:checked')?.value,
            bathroom: document.querySelector('input[name="bathroom"]:checked')?.value,
            bedroom: document.querySelector('input[name="bedroom"]:checked')?.value,
            storage: document.querySelector('input[name="storage"]:checked')?.value,
            balcony: document.querySelector('input[name="balcony"]:checked')?.value,
            ac: document.querySelector('input[name="ac"]:checked')?.value
        },
        noise: document.querySelector('input[name="noise"]:checked')?.value,
        cleanliness: document.querySelector('input[name="cleanliness"]:checked')?.value,
        transportation: document.querySelector('input[name="transportation"]:checked')?.value,
        nearbyAmenities: document.querySelector('input[name="amenities"]:checked')?.value,
        oneWord: document.getElementById('oneWord').value,
        photoUrl: capturedPhoto || document.getElementById('photoUrl').value
    };

    // Add to properties array
    properties.push(propertyData);

    // Save to localStorage
    localStorage.setItem('properties', JSON.stringify(properties));

    // Check if AI summaries are enabled
    if (generateSummariesToggle.checked && apiKeyInput.value) {
        generateAISummary(propertyData);
    } else {
        // Display updated properties right away if no AI summary needed
        displayProperties();
    }

    // Reset the form and photo preview
    propertyForm.reset();
    capturedPhoto = null;
    previewImage.style.display = 'none';
    noPhotoText.style.display = 'block';
    
    // Scroll to the property list
    propertyList.scrollIntoView({ behavior: 'smooth' });
});

// Format rating display
function formatRating(value) {
    return `<span class="rating-value ${getRatingClass(value)}">${value}/5 - ${getRatingDescription(value)}</span>`;
}

// Generate AI summary using OpenAI API
async function generateAISummary(property) {
    const apiKey = apiKeyInput.value;
    if (!apiKey) {
        console.error('API key is missing');
        return;
    }

    // More reliable way to find the property card element
    const propertyId = property.id;
    let propertyCard = document.querySelector(`.property-card[data-id="${propertyId}"]`);
    
    // If we can't find the property card, try again with a short delay
    if (!propertyCard) {
        console.log('Property card not found initially, trying again...');
        await new Promise(resolve => setTimeout(resolve, 500));
        propertyCard = document.querySelector(`.property-card[data-id="${propertyId}"]`);
        
        if (!propertyCard) {
            console.error('Property card not found after retry');
            return;
        }
    }

    // Create or find a summary section
    let summarySection = propertyCard.querySelector('.ai-summary');
    if (!summarySection) {
        summarySection = document.createElement('div');
        summarySection.className = 'ai-summary';
        summarySection.innerHTML = '<div class="summary-loading">Generating AI summary</div>';
        propertyCard.appendChild(summarySection);
    } else {
        summarySection.innerHTML = '<div class="summary-loading">Generating AI summary</div>';
    }

    try {
        // Prepare the property data for the API
        const propertyDescription = `
            Property Name: ${property.name}
            Location: ${property.location}
            Size: ${property.size} sqm
            Price: ${property.price}
            Overall Gut Feeling: ${property.gutFeeling}/5
            
            Likes:
            - ${property.likes.join('\n- ')}
            
            Dislikes:
            - ${property.dislikes.join('\n- ')}
            
            Amenities Ratings:
            - Kitchen: ${property.amenities.kitchen}/5
            - Bathroom: ${property.amenities.bathroom}/5
            - Bedroom: ${property.amenities.bedroom}/5
            - Storage: ${property.amenities.storage}/5
            - Balcony: ${property.amenities.balcony}/5
            - AC: ${property.amenities.ac}/5
            
            Building & Location:
            - Noise: ${property.noise}/5
            - Cleanliness: ${property.cleanliness}/5
            - Transportation: ${property.transportation}/5
            - Nearby Amenities: ${property.nearbyAmenities}/5
            
            One Word Description: ${property.oneWord}
        `;

        console.log('Making API request to OpenAI...');
        
        // Make the API request
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a real estate assistant. Provide a concise summary of this property based on the viewing notes. Highlight key strengths and weaknesses. Keep the summary under 100 words.'
                    },
                    {
                        role: 'user',
                        content: propertyDescription
                    }
                ],
                max_tokens: 250
            })
        });

        const data = await response.json();
        console.log('API response received:', data);
        
        if (data.error) {
            throw new Error(data.error.message || 'Error generating summary');
        }

        // Extract the summary from the response
        const summary = data.choices[0].message.content.trim();
        
        // Update the summary section with the result
        summarySection.innerHTML = `
            <div class="section-title">AI Summary</div>
            <p>${summary}</p>
        `;

        // Update the property data with the summary
        const propertyIndex = properties.findIndex(p => p.id === property.id);
        if (propertyIndex !== -1) {
            properties[propertyIndex].aiSummary = summary;
            localStorage.setItem('properties', JSON.stringify(properties));
        }
        
    } catch (error) {
        console.error('Error generating summary:', error);
        summarySection.innerHTML = `
            <div class="section-title">AI Summary</div>
            <p class="error-message">Error generating summary: ${error.message || 'Unknown error'}</p>
            <button class="btn retry-summary" data-property-id="${property.id}">Retry</button>
        `;
        
        // Add event listener for retry button
        setTimeout(() => {
            const retryButton = summarySection.querySelector('.retry-summary');
            if (retryButton) {
                retryButton.addEventListener('click', function() {
                    generateAISummary(property);
                });
            }
        }, 100);
    }
}

// Display properties
function displayProperties() {
    propertyList.innerHTML = '';
    
    properties.forEach(property => {
        const propertyCard = document.createElement('div');
        propertyCard.className = 'property-card';
        propertyCard.setAttribute('data-id', property.id);
        
        // Parse price and size for formatting
        const price = parseFloat(property.price) || 0;
        const size = parseFloat(property.size) || 0;
        
        // Check if the photo is a base64 image or a URL
        const photoSrc = property.photoUrl && (property.photoUrl.startsWith('data:image') || property.photoUrl.startsWith('http')) 
            ? property.photoUrl 
            : 'https://via.placeholder.com/400x300?text=No+Image+Available';
        
        // Main details HTML with modern layout
        let mainDetailsHTML = `
            <div class="property-header">
                <h3>${property.name}</h3>
                <button class="delete-property-btn" data-id="${property.id}" title="Delete this property">×</button>
            </div>
            <img src="${photoSrc}" alt="${property.name}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image+Available'">
            <div class="property-price">฿${price.toLocaleString()}</div>
            <div class="property-location">${property.location}</div>
            
            <div class="basic-info-grid">
                <div class="info-item">
                    <div class="info-label">Size</div>
                    <div class="info-value">${size} sqm</div>
                </div>
                <div class="info-item">
                    <div class="info-label">฿/sqm</div>
                    <div class="info-value">${size > 0 ? Math.round(price / size).toLocaleString() : 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Rating</div>
                    <div class="info-value">${property.gutFeeling}/5</div>
                </div>
            </div>`;
        
        // Likes and dislikes HTML
        let preferencesHTML = `
            <div class="property-details">
                <div class="property-detail">
                    <div class="section-title">Likes:</div>
                    <ul>
                        ${property.likes.map(like => `<li>${like}</li>`).join('')}
                    </ul>
                </div>
                <div class="property-detail">
                    <div class="section-title">Dislikes:</div>
                    <ul>
                        ${property.dislikes.map(dislike => `<li>${dislike}</li>`).join('')}
                    </ul>
                </div>
            </div>`;
        
        // Amenities and building HTML
        let amenitiesHTML = `
            <div class="property-details">
                <div class="property-detail">
                    <div class="section-title">Key Amenities:</div>
                    <ul>
                        <li>Kitchen: ${formatRating(property.amenities.kitchen)}</li>
                        <li>Bathroom: ${formatRating(property.amenities.bathroom)}</li>
                        <li>Bedroom: ${formatRating(property.amenities.bedroom)}</li>
                        <li>Storage: ${formatRating(property.amenities.storage)}</li>
                        <li>Balcony: ${formatRating(property.amenities.balcony)}</li>
                        <li>AC: ${formatRating(property.amenities.ac)}</li>
                    </ul>
                </div>
                <div class="property-detail">
                    <div class="section-title">Building & Location:</div>
                    <ul>
                        <li>Noise: ${formatRating(property.noise)}</li>
                        <li>Cleanliness: ${formatRating(property.cleanliness)}</li>
                        <li>Transportation: ${formatRating(property.transportation)}</li>
                        <li>Nearby Amenities: ${formatRating(property.nearbyAmenities)}</li>
                    </ul>
                </div>
            </div>`;
        
        // AI Summary HTML if it exists
        let summaryHTML = '';
        if (property.aiSummary) {
            summaryHTML = `
                <div class="ai-summary">
                    <div class="section-title">AI Summary</div>
                    <p>${property.aiSummary}</p>
                </div>`;
        }
        
        // One word description
        let oneWordHTML = property.oneWord ? `
            <div class="one-word-container">
                <span class="one-word-label">In one word:</span>
                <span class="one-word-value">${property.oneWord}</span>
            </div>
        ` : '';
        
        // Combine all sections
        propertyCard.innerHTML = mainDetailsHTML + oneWordHTML + preferencesHTML + amenitiesHTML + summaryHTML;
        
        propertyList.appendChild(propertyCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-property-btn').forEach(button => {
        button.addEventListener('click', function() {
            deleteProperty(this.getAttribute('data-id'));
        });
    });
}

// Add delete property functionality
function deleteProperty(propertyId) {
    if (confirm('Are you sure you want to delete this property? This cannot be undone.')) {
        // Convert string ID to number if needed
        propertyId = Number(propertyId) || propertyId;
        
        // Find the property index
        const propertyIndex = properties.findIndex(p => p.id === propertyId);
        
        if (propertyIndex !== -1) {
            // Remove the property from the array
            properties.splice(propertyIndex, 1);
            
            // Save to localStorage
            localStorage.setItem('properties', JSON.stringify(properties));
            
            // Update the display
            displayProperties();
        }
    }
}

// Add error message styling
const styleElement = document.createElement('style');
styleElement.textContent = `
    .error-message {
        color: #e74c3c;
        margin-bottom: 10px;
    }
    
    .retry-summary {
        background-color: #3498db;
        color: white;
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .property-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .delete-property-btn {
        background-color: #e74c3c;
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s;
    }

    .delete-property-btn:hover {
        background-color: #c0392b;
    }
`;
document.head.appendChild(styleElement);

// Handle image loading errors
document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        e.target.src = 'https://via.placeholder.com/400x300?text=No+Image+Available';
    }
}, true);

// Generate comparison results
function generateComparisonResults() {
    if (properties.length === 0) {
        alert('Please record at least one property before comparing.');
        return;
    }
    
    // Calculate metrics for each property
    const propertyMetrics = properties.map(property => {
        // Calculate baht per sqm
        const price = Number(property.price);
        const size = Number(property.size);
        const bahtPerSqm = size > 0 ? (price / size).toFixed(2) : Infinity;
        
        // Calculate overall score (average of all ratings)
        const ratings = [
            Number(property.gutFeeling),
            Number(property.amenities.kitchen),
            Number(property.amenities.bathroom),
            Number(property.amenities.bedroom),
            Number(property.amenities.storage),
            Number(property.amenities.balcony),
            Number(property.amenities.ac),
            Number(property.noise),
            Number(property.cleanliness),
            Number(property.transportation),
            Number(property.nearbyAmenities)
        ].filter(rating => !isNaN(rating) && rating > 0);
        
        const overallScore = ratings.length > 0 
            ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2) 
            : 0;
        
        return {
            id: property.id,
            name: property.name,
            price: price,
            size: size,
            bahtPerSqm: bahtPerSqm,
            overallScore: overallScore,
            property: property
        };
    });
    
    // Find winners
    const bahtPerSqmWinner = [...propertyMetrics]
        .filter(p => p.bahtPerSqm !== Infinity)
        .sort((a, b) => a.bahtPerSqm - b.bahtPerSqm)[0] || null;
    
    const overallScoreWinner = [...propertyMetrics]
        .sort((a, b) => b.overallScore - a.overallScore)[0] || null;
    
    // Sort properties by overall score (descending)
    const sortedProperties = [...propertyMetrics]
        .sort((a, b) => b.overallScore - a.overallScore);
    
    // Create or get comparison results container
    let comparisonContainer = document.getElementById('comparisonResults');
    if (!comparisonContainer) {
        comparisonContainer = document.createElement('div');
        comparisonContainer.id = 'comparisonResults';
        comparisonContainer.className = 'comparison-results';
        propertyList.parentNode.appendChild(comparisonContainer);
    }
    
    // Build HTML for the comparison results
    let comparisonHTML = `
        <h2>CondoCompare Results</h2>
        <div class="winners-section">
            <div class="winner-card">
                <h3>Best Value (฿/sqm)</h3>
                ${bahtPerSqmWinner ? `
                    <div class="winner-detail">
                        <p class="winner-name">${bahtPerSqmWinner.name}</p>
                        <p class="winner-score">฿${bahtPerSqmWinner.bahtPerSqm}/sqm</p>
                        <p class="winner-info">฿${bahtPerSqmWinner.price.toLocaleString()} for ${bahtPerSqmWinner.size} sqm</p>
                    </div>
                ` : '<p>No data available</p>'}
            </div>
            <div class="winner-card">
                <h3>Highest Overall Score</h3>
                ${overallScoreWinner ? `
                    <div class="winner-detail">
                        <p class="winner-name">${overallScoreWinner.name}</p>
                        <p class="winner-score">${overallScoreWinner.overallScore}/5</p>
                        <p class="winner-info">${overallScoreWinner.property.oneWord}</p>
                    </div>
                ` : '<p>No data available</p>'}
            </div>
        </div>
        
        <h3>All Properties Ranked</h3>
        <div class="comparison-table">
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Property</th>
                        <th>Overall Score</th>
                        <th>฿/sqm</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedProperties.map((prop, index) => `
                        <tr class="${prop.id === (overallScoreWinner?.id) ? 'winner-overall' : ''} ${prop.id === (bahtPerSqmWinner?.id) ? 'winner-value' : ''}">
                            <td>${index + 1}</td>
                            <td>${prop.name}</td>
                            <td>${prop.overallScore}</td>
                            <td>฿${prop.bahtPerSqm}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    comparisonContainer.innerHTML = comparisonHTML;
    
    // Scroll to the comparison results
    comparisonContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Add CSS for comparison results if not already added
    if (!document.getElementById('comparison-styles')) {
        const comparisonStyles = document.createElement('style');
        comparisonStyles.id = 'comparison-styles';
        comparisonStyles.textContent = `
            .comparison-results {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin-top: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .comparison-results h2 {
                text-align: center;
                margin-bottom: 20px;
                color: #2c3e50;
            }
            
            .winners-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .winner-card {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                border-left: 4px solid #3498db;
            }
            
            .winner-card h3 {
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 1.2rem;
            }
            
            .winner-name {
                font-size: 1.5rem;
                font-weight: bold;
                margin-bottom: 5px;
                color: #2c3e50;
            }
            
            .winner-score {
                font-size: 1.8rem;
                font-weight: bold;
                color: #27ae60;
                margin-bottom: 5px;
            }
            
            .winner-info {
                color: #7f8c8d;
                font-style: italic;
            }
            
            .comparison-table {
                overflow-x: auto;
            }
            
            .comparison-table table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .comparison-table th, .comparison-table td {
                padding: 10px;
                text-align: left;
                border-bottom: 1px solid #eee;
            }
            
            .comparison-table th {
                background-color: #f5f5f5;
                font-weight: bold;
                color: #2c3e50;
            }
            
            .comparison-table tr.winner-overall {
                background-color: rgba(46, 204, 113, 0.1);
            }
            
            .comparison-table tr.winner-value {
                background-color: rgba(52, 152, 219, 0.1);
            }
            
            .comparison-table tr.winner-overall.winner-value {
                background: linear-gradient(to right, rgba(46, 204, 113, 0.1), rgba(52, 152, 219, 0.1));
            }
            
            @media (max-width: 768px) {
                .winners-section {
                    grid-template-columns: 1fr;
                }
                
                .comparison-table {
                    font-size: 0.9rem;
                }
            }
        `;
        document.head.appendChild(comparisonStyles);
    }
} 