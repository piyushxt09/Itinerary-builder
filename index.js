// Global Data
let currentItineraryId = null;
let quillInstances = {};
let companyLogoBase64 = null;
let itinerarySearchTerm = '';

// --- UTILITIES ---
function getItineraries() {
    return JSON.parse(localStorage.getItem('itineraries') || '[]');
}

function saveItineraries(itineraries) {
    localStorage.setItem('itineraries', JSON.stringify(itineraries));
}

function generateId() {
    return 'itin_' + Date.now();
}

function getInputValue(id, fallback = '') {
    const element = document.getElementById(id);
    return element ? element.value : fallback;
}

const CURRENCY_FORMATS = {
    USD: { symbol: '$', locale: 'en-US' },
    INR: { symbol: '₹', locale: 'en-IN' },
    EUR: { symbol: '€', locale: 'de-DE' },
    AUD: { symbol: 'A$', locale: 'en-AU' }
};

function formatCurrency(value, currency = 'INR') {
    const amount = Number.parseFloat(value);
    const config = CURRENCY_FORMATS[currency] || CURRENCY_FORMATS.INR;
    if (!Number.isFinite(amount)) {
        return `${config.symbol}0.00`;
    }
    return `${config.symbol}${amount.toLocaleString(config.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function getCurrencySymbol(currency = 'INR') {
    return (CURRENCY_FORMATS[currency] || CURRENCY_FORMATS.INR).symbol;
}

function formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return 'Schedule on request';

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 'Schedule on request';
    }

    return `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

function getTravelerSummary(data) {
    const adults = Number(data.adultCount) || Number(data.travelers) || 0;
    const children = Number(data.childCount) || 0;
    const fallbackTravelers = Number(data.travelers) || 0;
    let summary = '';

    if (adults > 0) {
        summary = `${adults} Adult${adults === 1 ? '' : 's'}`;
    } else if (fallbackTravelers > 0) {
        summary = `${fallbackTravelers} Traveler${fallbackTravelers === 1 ? '' : 's'}`;
    } else {
        summary = 'Travelers not set';
    }

    if (children > 0) {
        summary += `, ${children} Child${children === 1 ? '' : 'ren'}`;
        if (data.childAges) {
            summary += ` (ages: ${data.childAges})`;
        }
    }

    return summary;
}

function parseToListItems(htmlOrText) {
    if (!htmlOrText) return [];

    // 1. If it's already a structured HTML list (contains <li>), extract the text of each <li>
    if (htmlOrText.includes('<li')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlOrText;
        const lis = tempDiv.getElementsByTagName('li');
        if (lis.length > 0) {
            const items = [];
            for (let i = 0; i < lis.length; i++) {
                const txt = lis[i].innerText.trim();
                if (txt) items.push(txt);
            }
            return items;
        }
    }

    // 2. Otherwise, convert HTML breaks/paragraphs to newlines and strip remaining HTML
    let text = htmlOrText
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, ''); // strip all other HTML tags

    // Decode HTML entities (like &amp; or &nbsp;)
    const txtNode = document.createElement('textarea');
    txtNode.innerHTML = text;
    text = txtNode.value;

    // Split by newlines first
    let lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // Clean bullet prefixes from each line
    lines = lines.map(line => {
        return line.replace(/^[\s•\-\*\✓\✕\+\.\d\)]+/, '').trim();
    }).filter(line => line.length > 0);

    // 3. If there is only 1 line, but it contains commas or semicolons, split by them!
    if (lines.length === 1) {
        const singleLine = lines[0];
        let separators = [';', ','];
        for (let s = 0; s < separators.length; s++) {
            const sep = separators[s];
            if (singleLine.includes(sep)) {
                const splitItems = singleLine.split(sep)
                    .map(item => item.trim())
                    .map(item => item.replace(/^[\s•\-\*\✓\✕\+\.\d\)]+/, '').trim())
                    .filter(item => item.length > 0);
                if (splitItems.length > 1) {
                    return splitItems;
                }
            }
        }
    }

    return lines;
}

// Helper to format dates for PDF
function formatDate(dateStr) {
    if (!dateStr) return 'TBA';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch (e) {
        return dateStr;
    }
}

// Logo Preview and Conversion
function previewLogo(input) {
    const preview = document.getElementById('logoPreview');
    const placeholder = document.getElementById('logoPlaceholder');

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            companyLogoBase64 = e.target.result;
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// --- FORM HANDLERS ---

// Add Hotel
function addHotel(data = {}) {
    const hotelId = 'hotel_' + Math.random().toString(36).substr(2, 9);
    const hotelHtml = `
        <div class="hotel-card border mb-3" id="${hotelId}">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold mb-0 text-primary"><i class="fas fa-hotel me-2"></i>Hotel Detail</h6>
                <button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="removeHotel('${hotelId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label small fw-bold text-muted">Hotel Name</label>
                    <input type="text" class="form-control hotel-name" placeholder="Hotel Name" value="${data.name || ''}" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold text-muted">Check-in Date</label>
                    <input type="date" class="form-control hotel-checkin" value="${data.checkIn || ''}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold text-muted">Check-out Date</label>
                    <input type="date" class="form-control hotel-checkout" value="${data.checkOut || ''}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold text-muted">Nights</label>
                    <input type="number" class="form-control hotel-nights" min="1" value="${data.nights || 1}">
                </div>
                <div class="col-md-9">
                    <label class="form-label small fw-bold text-muted">Room Category</label>
                    <select class="form-select hotel-room">
                        <option value="Standard" ${data.room === 'Standard' ? 'selected' : ''}>Standard</option>
                        <option value="Deluxe" ${data.room === 'Deluxe' ? 'selected' : ''}>Deluxe</option>
                        <option value="Suite" ${data.room === 'Suite' ? 'selected' : ''}>Suite</option>
                        <option value="Villa" ${data.room === 'Villa' ? 'selected' : ''}>Villa</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    document.getElementById('hotelsList').insertAdjacentHTML('beforeend', hotelHtml);

    // Bind real-time preview listeners to new hotel inputs
    const hotelEl = document.getElementById(hotelId);
    if (hotelEl) {
        hotelEl.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', () => { if (typeof updatePreview === 'function') updatePreview(); });
            input.addEventListener('change', () => { if (typeof updatePreview === 'function') updatePreview(); });
        });
    }

    if (typeof updatePreview === 'function') updatePreview();
}

function removeHotel(id) {
    const el = document.getElementById(id);
    if (el) {
        el.remove();
    }
    if (typeof updatePreview === 'function') updatePreview();
}

// Add Day
function addDay(data = {}) {
    const dayId = 'day_' + Math.random().toString(36).substr(2, 9);
    const dayHtml = `
        <div class="day-card border mb-4" id="${dayId}">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold mb-0 text-primary"><i class="fas fa-calendar-day me-2"></i>Day Activity</h6>
                <button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="removeDay('${dayId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="row g-3">
                <div class="col-12">
                    <label class="form-label small fw-bold text-muted">Day Title</label>
                    <input type="text" class="form-control day-title" placeholder="e.g. Day 1: Arrival & Local Sightseeing" value="${data.title || ''}" required>
                </div>
                <div class="col-12">
                    <label class="form-label small fw-bold text-muted">Detailed Itinerary</label>
                    <div id="editor_${dayId}" class="day-editor"></div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('daysList').insertAdjacentHTML('beforeend', dayHtml);

    // Initialize Quill with Full Features
    const quill = new Quill(`#editor_${dayId}`, {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image', 'video'],
                ['clean']
            ]
        },
        placeholder: 'Enter detailed description for this day...'
    });

    if (data.description) {
        quill.root.innerHTML = data.description;
    }

    quillInstances[dayId] = quill;

    // Bind real-time preview listeners to new day inputs
    const dayEl = document.getElementById(dayId);
    if (dayEl) {
        dayEl.querySelector('.day-title').addEventListener('input', () => { if (typeof updatePreview === 'function') updatePreview(); });
    }
    quill.on('text-change', () => { if (typeof updatePreview === 'function') updatePreview(); });

    if (typeof updatePreview === 'function') updatePreview();
}

function removeDay(id) {
    const el = document.getElementById(id);
    if (el) {
        el.remove();
    }
    delete quillInstances[id];
    if (typeof updatePreview === 'function') updatePreview();
}

// --- DATA COLLECTION ---
function collectFormData() {
    const itinerary = {
        id: currentItineraryId || generateId(),
        // Company Data
        companyLogo: companyLogoBase64,
        companyName: getInputValue('companyName'),
        companyEmail: getInputValue('companyEmail'),
        companyWebsite: getInputValue('companyWebsite'),
        companyPhone: getInputValue('companyPhone'),
        // Trip Data
        tripName: getInputValue('tripName'),
        destination: getInputValue('destination'),
        startDate: getInputValue('startDate'),
        endDate: getInputValue('endDate'),
        totalCost: getInputValue('totalCost'),
        currencyCode: getInputValue('currencyCode', 'USD') || 'USD',
        travelers: getInputValue('travelers'),
        adultCount: getInputValue('adultCount'),
        adultNames: getInputValue('adultNames'),
        childCount: getInputValue('childCount'),
        childAges: getInputValue('childAges'),
        rooms: getInputValue('rooms'),
        vehicle: getInputValue('vehicle'),
        pickup: getInputValue('pickup'),
        dropoff: getInputValue('dropoff'),
        mealPlan: getInputValue('mealPlan'),

        inclusions: quillInstances['inclusions'].root.innerHTML,
        exclusions: quillInstances['exclusions'].root.innerHTML,
        importantNotes: quillInstances['importantNotes'].root.innerHTML,
        cancellationPolicy: quillInstances['cancellationPolicy'].root.innerHTML,

        createdAt: new Date().toISOString(),
        hotels: [],
        days: []
    };

    // Collect Hotels
    document.querySelectorAll('.hotel-card').forEach(card => {
        itinerary.hotels.push({
            name: card.querySelector('.hotel-name').value,
            checkIn: card.querySelector('.hotel-checkin').value,
            checkOut: card.querySelector('.hotel-checkout').value,
            nights: card.querySelector('.hotel-nights').value,
            room: card.querySelector('.hotel-room').value
        });
    });

    // Collect Days
    document.querySelectorAll('.day-card').forEach(card => {
        const id = card.id;
        itinerary.days.push({
            title: card.querySelector('.day-title').value,
            description: quillInstances[id].root.innerHTML
        });
    });

    return itinerary;
}

// Helper to wait for images to load before PDF generation
function waitForImages(container) {
    const images = container.getElementsByTagName('img');
    const promises = [];
    for (let img of images) {
        if (!img.complete) {
            promises.push(new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            }));
        }
    }
    return Promise.all(promises);
}

function generateFooter(data) {
    return `
        <div class="pdf-page-footer">
            <div class="footer-info d-flex align-items-center gap-4">
                <span><i class="fas fa-phone-alt me-2 fa-flip-horizontal" style="color: #be840d;"></i> ${data.companyPhone || '+91 98765 43210'}</span>
                <span><i class="fas fa-globe me-2" style="color: #be840d;"></i> ${data.companyWebsite || 'www.luxuryexplorer.com'}</span>
            </div>
            <div class="footer-branding" style="font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                ${data.companyName || 'LUXURY EXPLORER'}
            </div>
        </div>
    `;
}

function renderItineraryHTML(data) {
    const hotels = Array.isArray(data.hotels) ? data.hotels : [];
    const days = Array.isArray(data.days) ? data.days : [];
    const inclusionsItems = parseToListItems(data.inclusions);
    const exclusionsItems = parseToListItems(data.exclusions);
    const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    let html = '';

    // IMPORTANT: Do NOT insert an empty dedicated page-break DIV between pages.
    // html2pdf/html2canvas can treat it as an extra renderable node and may create
    // blank pages.
    const pageBreak = '';

    // --- PAGE 1: FRONT PAGE (REDESIGNED) ---
    html += `
        <div class="pdf-page pdf-front-page">
            <div class="pdf-page-content text-center">
                <!-- Brand Header -->
                <div class="pdf-front-logo-container">
                    <img src="${data.companyLogo || 'https://adminapi.flyeasygo.com/assets-files/8e17aad2-9df5-4e81-a841-7551a0b03ddb.png'}" 
                         class="pdf-front-logo">
                    <div class="pdf-front-header-accent"></div>
                </div>

                <!-- Hero Title Section -->
                <div class="mb-5">
                    <h1 class="pdf-front-package-name">${data.tripName || 'Experience the Extraordinary'}</h1>
                    <div class="pdf-front-destination">${data.destination || 'Global Discovery'}</div>
                </div>

                <!-- Sophisticated Highlight Grid -->
                <div class="pdf-front-details">
                    <div class="pdf-front-highlight-card">
                        <div class="highlight-icon-box"><i class="fas fa-calendar-day"></i></div>
                        <small class="highlight-label">Duration</small>
                        <span class="highlight-value">${data.days?.length || 0} Days</span>
                    </div>
                    <div class="pdf-front-highlight-card">
                        <div class="highlight-icon-box"><i class="fas fa-users"></i></div>
                        <small class="highlight-label">Travelers</small>
                        <span class="highlight-value">${getTravelerSummary(data)}</span>
                    </div>
                    <div class="pdf-front-highlight-card">
                        <div class="highlight-icon-box"><i class="fas fa-bed"></i></div>
                        <small class="highlight-label">Rooms</small>
                        <span class="highlight-value">${data.rooms || 1} Room(s)</span>
                    </div>
                    <div class="pdf-front-highlight-card">
                        <div class="highlight-icon-box"><i class="fas fa-car-side"></i></div>
                        <small class="highlight-label">Vehicle</small>
                        <span class="highlight-value">${data.vehicle || 'Private Car'}</span>
                    </div>
                    <div class="pdf-front-highlight-card">
                        <div class="highlight-icon-box"><i class="fas fa-utensils"></i></div>
                        <small class="highlight-label">Meal Plan</small>
                        <span class="highlight-value">${data.mealPlan || 'Half Board'}</span>
                    </div>
                    <div class="pdf-front-highlight-card">
                        <div class="highlight-icon-box"><i class="fas fa-map-pin"></i></div>
                        <small class="highlight-label">Pickup Point</small>
                        <span class="highlight-value">${data.pickup || 'As Specified'}</span>
                    </div>
                </div>

                <!-- Luxury Price Badge -->
                <div class="pdf-front-price-section">
                    <span class="pdf-front-price-label">Starting From</span>
                    <div class="pdf-front-price-value">${formatCurrency(data.totalCost || 0, data.currencyCode || 'INR')}</div>
                </div>

                <!-- Premium Accommodations Section -->
                <div class="pdf-front-hotels-section">
                    <h3 class="pdf-front-hotels-title">Premium Accommodations</h3>
                    <table class="pdf-front-hotels-table">
                        <thead>
                            <tr>
                                <th>Hotel / Resort Name</th>
                                <th>Check-in</th>
                                <th>Check-out</th>
                                <th>Nights</th>
                                <th>Room Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${hotels.length > 0 ? hotels.map(h => `
                                <tr>
                                    <td class="hotel-name">${h.name || 'Selected Premium Hotel'}</td>
                                    <td>${formatDate(h.checkIn)}</td>
                                    <td>${formatDate(h.checkOut)}</td>
                                    <td>${h.nights || 1} Night(s)</td>
                                    <td>${h.room || 'Deluxe Room'}</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="5" class="text-center py-4 text-muted" style="opacity: 0.5; letter-spacing: 1px;">LUXURY STAYS CURATED FOR YOUR JOURNEY</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;


    // --- ITINERARY PAGES: ONE DAY PER PAGE ---
    days.forEach((d, index) => {
        html += `
            <div class="pdf-page">
                <div class="pdf-page-content">
                
                <h2 class="fw-bold text-dark" style="font-size: 24px; margin-bottom: 20px;">${d.title || 'Activity Title'}</h2>
                <div class="d-flex align-items-center gap-3 mb-4">

                     <div class="day-icon d-none" style="width: 60px; height: 60px; font-size: 20px; flex-shrink: 0;">Day ${index + 1}</div>
                     <div style="height: 2px; flex-grow: 1; background: #064e3b; opacity: 0.2;"></div>
                     
                </div>
                    
                    <div class="pdf-rich-content" style="font-size: 13px; line-height: 1.8; color: #333;">
                        ${d.description.replace(/(<img\b[^>]*>)/g, '<div class="pdf-image-wrapper">$1</div>')}
                    </div>
                </div>
            ${generateFooter(data)}
        </div>
        `;
    });

    // --- FINAL PAGE: TERMS & POLICIES ---
    html += `
        <div class="pdf-page">
            <div class="pdf-page-content">
                <div class="row g-4 mb-4">
                    <div class="col-12">
                        <div class="card border-0 bg-white p-4 shadow-sm" style="background: rgba(255,255,255,0.7) !important; border-top: 4px solid #198754 !important;">
                            <div class="d-flex align-items-center gap-2 border-bottom pb-2 mb-3">
                                <i class="fas fa-check-circle fs-5 text-success"></i>
                                <h4 class="fw-bold mb-0 text-dark" style="font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;">Inclusions</h4>
                            </div>
                            <div class="inclusions-list">
                                ${inclusionsItems.length > 0 ? `<ul class="list-check">${inclusionsItems.map(item => `<li>${item}</li>`).join('')}</ul>` : '<p class="text-muted">Not specified</p>'}
                            </div>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="card border-0 bg-white p-4 shadow-sm" style="background: rgba(255,255,255,0.7) !important; border-top: 4px solid #dc3545 !important;">
                            <div class="d-flex align-items-center gap-2 border-bottom pb-2 mb-3">
                                <i class="fas fa-times-circle fs-5 text-danger"></i>
                                <h4 class="fw-bold mb-0 text-dark" style="font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;">Exclusions</h4>
                            </div>
                            <div class="exclusions-list">
                                ${exclusionsItems.length > 0 ? `<ul class="list-times">${exclusionsItems.map(item => `<li>${item}</li>`).join('')}</ul>` : '<p class="text-muted">Not specified</p>'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="advisory-card mb-4 shadow-sm rounded-3 p-4">
                    <h5 class="fw-bold mb-3 text-dark" style="font-size: 14px; letter-spacing: 1px;"><i class="fas fa-shield-alt me-2 accent-orange"></i> IMPORTANT ADVISORY</h5>
                    <div style="font-size: 11.5px; color: #444; line-height: 1.8;">
                         ${data.importantNotes || 'Terms and conditions apply as per company policy.'}
                    </div>
                </div>

                <div class="policy-card shadow-sm rounded-3 p-4">
                    <h5 class="fw-bold mb-3 text-dark" style="font-size: 14px; letter-spacing: 1px;"><i class="fas fa-file-invoice-dollar me-2" style="color: var(--primary-color);"></i> BOOKING & CANCELLATION POLICY</h5>
                    <div style="font-size: 11.5px; color: #444; line-height: 1.8;">
                        ${data.cancellationPolicy || 'Cancellation charges may apply based on the lead time of cancellation.'}
                    </div>
                </div>
            </div>
            ${generateFooter(data)}
        </div>
    `;

    return html;
}

// --- PDF EXPORT ---
async function exportToPDF(itineraryData) {
    if (!itineraryData) {
        Swal.fire('Error', 'No data to export', 'error');
        return;
    }

    const wrapper = document.getElementById('pdfTemplateWrapper');
    const template = document.getElementById('pdfTemplate');
    if (!wrapper || !template) return;

    // Show loading indicator
    Swal.fire({
        title: 'Generating PDF...',
        text: 'Curating your premium adventure proposal. Please wait...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Render the multi-page content
    template.innerHTML = renderItineraryHTML(itineraryData);

    // Show wrapper for capture
    const originalDisplay = wrapper.style.display;
    wrapper.style.display = 'block';

    try {
        // Wait for all fonts and images to load completely
        await document.fonts.ready;
        await waitForImages(template);

        // Options for html2pdf
        const opt = {
            margin: 0,
            filename: `${itineraryData.tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary.pdf`,
            image: { type: 'jpeg', quality: 1.0 }, // Maximum quality
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0,
                backgroundColor: '#f6f3ea' // Ensure background color is captured
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        // Generate directly and download
        await html2pdf().set(opt).from(template).save();

        Swal.fire({
            title: 'Generated!',
            text: 'Premium multi-page PDF downloaded successfully.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Failed to generate PDF.', 'error');
    } finally {
        wrapper.style.display = originalDisplay;
    }
}

// --- APP LOGIC ---

// Save Itinerary
function handleSave(e) {
    e.preventDefault();
    const data = collectFormData();
    let itineraries = getItineraries();

    const index = itineraries.findIndex(it => it.id === data.id);
    if (index > -1) {
        itineraries[index] = data;
    } else {
        itineraries.push(data);
    }

    saveItineraries(itineraries);

    Swal.fire({
        title: 'Itinerary Saved Successfully!',
        text: 'Your curated adventure proposal has been stored inside the itineraries library.',
        icon: 'success',
        showCancelButton: true,
        cancelButtonColor: '#3085d6',
        confirmButtonColor: '#007bd1',
        confirmButtonText: 'View Saved Itineraries',
        cancelButtonText: 'Keep Editing'
    }).then((navResult) => {
        if (navResult.isConfirmed) {
            window.location.href = 'itineraries.html';
        }
    });
}

// Load List (itineraries.html)
function renderItinerariesList() {
    const container = document.getElementById('itinerariesList');
    if (!container) return;

    const itineraries = getItineraries();
    const filteredItineraries = itineraries.filter((it) => {
        if (!itinerarySearchTerm) return true;

        const haystack = [
            it.tripName,
            it.destination,
            it.companyName,
            it.adultNames,
            it.pickup,
            it.dropoff,
            it.vehicle,
            it.mealPlan
        ].join(' ').toLowerCase();

        return haystack.includes(itinerarySearchTerm);
    });

    updateOverviewStats(itineraries);

    if (itineraries.length === 0) {
        document.getElementById('noDataMessage').classList.remove('d-none');
        document.getElementById('itinerariesTable').classList.add('d-none');
        const noDataTitle = document.getElementById('noDataTitle');
        const noDataText = document.getElementById('noDataText');
        if (noDataTitle) noDataTitle.textContent = 'No itineraries found';
        if (noDataText) noDataText.textContent = 'Start by creating your first travel plan!';
        return;
    }

    if (filteredItineraries.length === 0) {
        container.innerHTML = '';
        document.getElementById('noDataMessage').classList.remove('d-none');
        document.getElementById('itinerariesTable').classList.add('d-none');
        const noDataTitle = document.getElementById('noDataTitle');
        const noDataText = document.getElementById('noDataText');
        if (noDataTitle) noDataTitle.textContent = 'No matching itineraries';
        if (noDataText) noDataText.textContent = 'Try a different trip name, company, or destination keyword.';
        return;
    }

    document.getElementById('noDataMessage').classList.add('d-none');
    document.getElementById('itinerariesTable').classList.remove('d-none');

    container.innerHTML = filteredItineraries.map(it => `
        <tr>
            <td class="ps-4">
                <div class="d-flex align-items-center">
                    ${it.companyLogo ? `<img src="${it.companyLogo}" alt="Company logo" class="border rounded itinerary-logo-thumb">` : ''}
                    <div class="itinerary-meta">
                        <div class="itinerary-name">${it.tripName}</div>
                        <div class="small text-muted itinerary-company">${it.companyName || 'No Company'}</div>
                        <div class="small text-muted">${it.createdAt ? `Saved ${new Date(it.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Recently saved'}</div>
                    </div>
                </div>
            </td>
            <td>${it.destination || 'Destination not set'}</td>
            <td>
                <div class="fw-semibold">${getTravelerSummary(it)}</div>
                <div class="small text-muted">${Number(it.rooms) > 0 ? `${it.rooms} Room${Number(it.rooms) === 1 ? '' : 's'}` : 'Room details not set'}</div>
            </td>
            <td>
                <div class="fw-semibold">${it.vehicle || 'Vehicle not set'}</div>
                <div class="small text-muted">${it.mealPlan || 'Meal plan not set'}</div>
                <div class="small text-muted">${[it.pickup, it.dropoff].filter(Boolean).join(' to ') || 'Pickup/drop-off not set'}</div>
            </td>
            <td>${formatCurrency(it.totalCost, it.currencyCode || 'USD')}</td>
            <td class="text-center">
                <div class="btn-group shadow-sm rounded action-btn-group">
                    <button class="btn btn-sm btn-primary" onclick="generatePDFById('${it.id}')" title="Download PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <a href="add-itinerary.html?id=${it.id}" class="btn btn-sm btn-info text-white" title="Edit">
                        <i class="fas fa-edit"></i>
                    </a>
                    <button class="btn btn-sm btn-danger" onclick="deleteItinerary('${it.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateOverviewStats(itineraries) {
    const countEl = document.getElementById('totalItinerariesCount');
    const travelerEl = document.getElementById('totalTravelersCount');
    const valueEl = document.getElementById('totalValueCount');

    if (!countEl || !travelerEl || !valueEl) return;

    const totalTravelers = itineraries.reduce((sum, it) => {
        const travelerCount = Number(it.travelers);
        if (Number.isFinite(travelerCount) && travelerCount > 0) {
            return sum + travelerCount;
        }

        const adults = Number(it.adultCount) || 0;
        const children = Number(it.childCount) || 0;
        return sum + adults + children;
    }, 0);

    const totalValue = itineraries.reduce((sum, it) => {
        const amount = Number.parseFloat(it.totalCost);
        return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);

    countEl.textContent = itineraries.length;
    travelerEl.textContent = totalTravelers;
    valueEl.textContent = formatCurrency(totalValue);
}

function generatePDFById(id) {
    const itineraries = getItineraries();
    const it = itineraries.find(i => i.id === id);
    if (it) exportToPDF(it);
}

function deleteItinerary(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            let itineraries = getItineraries();
            itineraries = itineraries.filter(it => it.id !== id);
            saveItineraries(itineraries);
            renderItinerariesList();
            Swal.fire('Deleted!', 'Your itinerary has been deleted.', 'success');
        }
    });
}

// Load Edit Data (add-itinerary.html)
function loadEditData() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    // Initialize standard editors
    const quillConfig = {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    };

    quillInstances['inclusions'] = new Quill('#inclusionsEditor', quillConfig);
    quillInstances['exclusions'] = new Quill('#exclusionsEditor', quillConfig);
    quillInstances['importantNotes'] = new Quill('#importantNotesEditor', quillConfig);
    quillInstances['cancellationPolicy'] = new Quill('#cancellationPolicyEditor', quillConfig);

    if (!id) {
        addHotel();
        addDay();
        updatePreview();
        return;
    }

    const itineraries = getItineraries();
    const it = itineraries.find(item => item.id === id);
    if (!it) return;

    currentItineraryId = it.id;
    const pageMainTitleEl = document.getElementById('pageMainTitle');
    if (pageMainTitleEl) {
        pageMainTitleEl.innerHTML = '<i class="fas fa-edit me-2"></i>Edit Itinerary';
    }

    // Show custom toast notification
    Swal.fire({
        title: 'Editing Itinerary',
        text: `Loaded saved itinerary: "${it.tripName}"`,
        icon: 'info',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });

    // Company Data
    if (it.companyLogo) {
        companyLogoBase64 = it.companyLogo;
        document.getElementById('logoPreview').src = it.companyLogo;
        document.getElementById('logoPreview').style.display = 'block';
        document.getElementById('logoPlaceholder').style.display = 'none';
    }
    document.getElementById('companyName').value = it.companyName || '';
    document.getElementById('companyEmail').value = it.companyEmail || '';
    document.getElementById('companyWebsite').value = it.companyWebsite || '';
    document.getElementById('companyPhone').value = it.companyPhone || '';

    // Basic Fields
    if (document.getElementById('tripName')) document.getElementById('tripName').value = it.tripName || '';
    if (document.getElementById('destination')) document.getElementById('destination').value = it.destination || '';
    if (document.getElementById('startDate')) document.getElementById('startDate').value = it.startDate || '';
    if (document.getElementById('endDate')) document.getElementById('endDate').value = it.endDate || '';
    if (document.getElementById('totalCost')) document.getElementById('totalCost').value = it.totalCost || '';
    if (document.getElementById('currencyCode')) document.getElementById('currencyCode').value = it.currencyCode || 'USD';
    if (document.getElementById('travelers')) document.getElementById('travelers').value = it.travelers || '';
    if (document.getElementById('adultCount')) document.getElementById('adultCount').value = it.adultCount || 0;
    if (document.getElementById('adultNames')) document.getElementById('adultNames').value = it.adultNames || '';
    if (document.getElementById('childCount')) document.getElementById('childCount').value = it.childCount || 0;
    if (document.getElementById('childAges')) document.getElementById('childAges').value = it.childAges || '';
    if (document.getElementById('rooms')) document.getElementById('rooms').value = it.rooms || '';
    if (document.getElementById('vehicle')) document.getElementById('vehicle').value = it.vehicle || '';
    if (document.getElementById('pickup')) document.getElementById('pickup').value = it.pickup || '';
    if (document.getElementById('dropoff')) document.getElementById('dropoff').value = it.dropoff || '';
    if (document.getElementById('mealPlan')) document.getElementById('mealPlan').value = it.mealPlan || '';

    quillInstances['inclusions'].root.innerHTML = it.inclusions || '';
    quillInstances['exclusions'].root.innerHTML = it.exclusions || '';
    quillInstances['importantNotes'].root.innerHTML = it.importantNotes || '';
    quillInstances['cancellationPolicy'].root.innerHTML = it.cancellationPolicy || '';

    // Hotels
    (Array.isArray(it.hotels) ? it.hotels : []).forEach(h => addHotel(h));
    // Days
    (Array.isArray(it.days) ? it.days : []).forEach(d => addDay(d));

    // Initial preview render
    updatePreview();
}

// --- DUAL PANE LIVE PREVIEW & BINDING ---
function updatePreview() {
    const data = collectFormData();
    const template = document.getElementById('pdfTemplate');
    if (template) {
        template.innerHTML = renderItineraryHTML(data);
    }
}

function setupBinding() {
    const inputs = [
        'companyName', 'companyEmail', 'companyWebsite', 'companyPhone',
        'tripName', 'destination', 'startDate', 'endDate', 'totalCost',
        'currencyCode', 'travelers', 'adultCount', 'adultNames', 'childCount', 'childAges',
        'rooms', 'vehicle', 'pickup', 'dropoff', 'mealPlan'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updatePreview);
            el.addEventListener('change', updatePreview);
        }
    });

    // Dynamic keyup/input listeners for Quill editor fields
    if (quillInstances['inclusions']) {
        quillInstances['inclusions'].on('text-change', updatePreview);
    }
    if (quillInstances['exclusions']) {
        quillInstances['exclusions'].on('text-change', updatePreview);
    }
    if (quillInstances['importantNotes']) {
        quillInstances['importantNotes'].on('text-change', updatePreview);
    }
    if (quillInstances['cancellationPolicy']) {
        quillInstances['cancellationPolicy'].on('text-change', updatePreview);
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('itineraryForm')) {
        loadEditData();
        setupBinding();
        document.getElementById('itineraryForm').addEventListener('submit', handleSave);

        document.getElementById('exportPDFBtn').addEventListener('click', (e) => {
            e.preventDefault();
            const data = collectFormData();
            exportToPDF(data);
        });
    }

    if (document.getElementById('itinerariesList')) {
        renderItinerariesList();
        const searchInput = document.getElementById('itinerarySearch');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                itinerarySearchTerm = event.target.value.trim().toLowerCase();
                renderItinerariesList();
            });
        }
    }
});
