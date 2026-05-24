// --- VISA CHECKLIST LOGIC & BINDING ---

let currentVisaId = null;
let agencyLogoBase64 = "";

// Default values for China Business Visa
const DEFAULT_DOCS = [
    "Current & Old Passport Scan Copy",
    "Passport 3 Blank pages scan copy",
    "China old Visa all Scan Copy",
    "Two Photos white back ground 48m X 33m",
    "Cover Letter on Company Letter head Scan Copy (with round stamp)",
    "Invitation letter Scan Copy",
    "Invitee Id Copy Scan Copy",
    "Invitee Business License Scan Copy",
    "GST Certificate Scan Copy",
    "Aadhar Card Scan Copy"
];

const DEFAULT_DETAILS = [
    "Phone number",
    "Email id",
    "Highest level of Education",
    "Name of Collage - Diploma /Degree",
    "Occupation /Designation",
    "Name/Address/Phone number/Mail id",
    "Supervisor name/Contact number /mail id",
    "Father / Mother – DOB",
    "Child Name and DOB",
    "Spouse DOB | City of birth/ eMail Id / Contact Number"
];

const DEFAULT_PHOTO_SPECS = [
    "Not more than 3 months old",
    "Photo size is passport size (35mm wide x 45mm high)",
    "Face visibility should be 70% - 80%",
    "Colored, with plain white background and matte finish",
    "Taken looking straight forward and face seen clearly with ears",
    "On a good quality paper matte finish"
];

// Custom Logo File Loader
function loadCustomLogo(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            agencyLogoBase64 = e.target.result;
            document.getElementById('viewAgencyLogo').src = e.target.result;
            updatePreview();
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Load defaults
function resetToDefaults() {
    document.getElementById('inputAgencyName').value = "FlyAgain Online Pvt. Ltd.";
    document.getElementById('inputAgencyEmail').value = "visas@flyagainonline.com";
    document.getElementById('inputAgencyPhone').value = "+91 99887 76655";
    document.getElementById('inputAgencyWebsite').value = "www.flyagainonline.com";
    agencyLogoBase64 = "";
    document.getElementById('viewAgencyLogo').src = "https://adminapi.flyeasygo.com/assets-files/8e17aad2-9df5-4e81-a841-7551a0b03ddb.png";
    document.getElementById('inputAgencyLogo').value = "";

    document.getElementById('inputGreetings').value = "Greetings from FlyAgain Online Pvt. Ltd.!!!";
    document.getElementById('inputChecklistTitle').value = "Checklist – China Business Visa";
    document.getElementById('inputFees').value = "FEES: 11000 INR FOR SINGLE ENTRY PER APPLICANT";
    document.getElementById('inputTerms').value = "NOTE: Courier Charges are not included and will be charged additionally.";

    document.getElementById('inputRequiredDocs').value = "# PERSONAL DOCUMENTS\n" + DEFAULT_DOCS.slice(0, 4).join("\n") + "\n\n# COMPANY & INVITATION\n" + DEFAULT_DOCS.slice(4).join("\n");
    document.getElementById('inputDetailsList').value = DEFAULT_DETAILS.join("\n");

    updatePreview();

    Swal.fire({
        title: 'Loaded!',
        text: 'Default China Business Visa requirements loaded successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });
}

// Collect data from inputs
function collectVisaData() {
    const docsVal = document.getElementById('inputRequiredDocs').value || '';
    const detailsVal = document.getElementById('inputDetailsList').value || '';

    const docsArray = docsVal.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    const detailsArray = detailsVal.split("\n").map(line => line.trim()).filter(line => line.length > 0);

    return {
        id: currentVisaId || 'visa_' + Date.now(),

        // Agency Info
        agencyName: document.getElementById('inputAgencyName').value,
        agencyEmail: document.getElementById('inputAgencyEmail').value,
        agencyPhone: document.getElementById('inputAgencyPhone').value,
        agencyWebsite: document.getElementById('inputAgencyWebsite').value,
        agencyLogo: agencyLogoBase64 || "https://adminapi.flyeasygo.com/assets-files/8e17aad2-9df5-4e81-a841-7551a0b03ddb.png",

        greetings: document.getElementById('inputGreetings').value,
        checklistTitle: document.getElementById('inputChecklistTitle').value,


        fees: document.getElementById('inputFees').value,
        terms: document.getElementById('inputTerms').value,

        requiredDocs: docsArray,
        detailsList: detailsArray,
        updatedAt: new Date().toISOString()
    };
}

// Update Live A4 Preview
function updatePreview() {
    const data = collectVisaData();

    // 1. Agency binds
    document.getElementById('viewAgencyName').innerText = data.agencyName || 'FlyAgain Online Pvt. Ltd.';
    document.getElementById('viewAgencyEmail').innerText = data.agencyEmail || 'visas@flyagainonline.com';
    document.getElementById('viewAgencyPhone').innerText = data.agencyPhone || '+91 99887 76655';
    document.getElementById('viewAgencyWebsite').innerText = data.agencyWebsite || 'www.flyagainonline.com';
    document.getElementById('viewAgencyLogo').src = data.agencyLogo;

    // Footer Agency binds
    document.getElementById('pdfFooterAgencyName').innerText = `${data.agencyName || 'FlyAgain Online Pvt. Ltd.'} — Global Visa Specialists`;
    document.getElementById('pdfFooterEmail').innerText = data.agencyEmail || 'visas@flyagainonline.com';
    document.getElementById('pdfFooterWebsite').innerText = data.agencyWebsite || 'www.flyagainonline.com';
    document.getElementById('pdfFooterPhone').innerText = data.agencyPhone || '+91 99887 76655';

    // 2. Text binds
    document.getElementById('pdfGreetings').innerText = data.greetings || 'Greetings!!!';
    document.getElementById('pdfChecklistTitle').innerText = data.checklistTitle || 'Visa Checklist';

    document.getElementById('pdfFees').innerText = data.fees || 'FEES: N/A';
    document.getElementById('pdfTerms').innerText = data.terms || 'N/A';

    // 4. Required docs list with Heading support
    const docsContainer = document.getElementById('pdfDocsListContainer');
    if (docsContainer) {
        if (data.requiredDocs.length > 0) {
            let html = '';
            let itemCount = 1;

            data.requiredDocs.forEach(line => {
                if (line.startsWith('#')) {
                    // It's a heading
                    const headingText = line.replace(/^#\s*/, '').toUpperCase();
                    html += `<div class="mt-3 mb-2 fw-bold voucher-section-title border-bottom pb-1" style="font-size: 11px; letter-spacing: 0.5px;"><i class="fas fa-folder-open"></i> ${headingText}</div>`;
                    itemCount = 1; // Reset counter for new section if desired, or keep global. Let's keep global for now but styling is different.
                } else {
                    // It's a document point
                    html += `
                        <div class="mb-1" style="font-size: 10px; color: #334155; line-height: 1.35; display: flex; align-items: flex-start; gap: 6px; padding-left: 5px;">
                            <span style="color: #1e3a8a; font-weight: 700;">•</span>
                            <span>${line}</span>
                        </div>
                    `;
                }
            });
            docsContainer.innerHTML = html;
        } else {
            docsContainer.innerHTML = `<span class="text-muted small">No documents listed.</span>`;
        }
    }

    // 5. Details list checklist
    const detailsContainer = document.getElementById('pdfDetailsListContainer');
    if (detailsContainer) {
        if (data.detailsList.length > 0) {
            detailsContainer.innerHTML = data.detailsList.map(detail => `
                <div class="visa-check-item">
                    <i class="fas fa-circle text-secondary text-black" style="font-size: 9.5px; margin-top: 1.5px;"></i>
                    <span>${detail}</span>
                </div>
            `).join('');
        } else {
            detailsContainer.innerHTML = `<span class="text-muted small col-12">No detail parameters requested.</span>`;
        }
    }
}

// Save Visa Checklist to localStorage
function saveVisa(e) {
    if (e) e.preventDefault();

    // Check validation
    const form = document.getElementById('visaForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = collectVisaData();
    let savedVisas = JSON.parse(localStorage.getItem('saved_visas') || '[]');

    const index = savedVisas.findIndex(v => v.id === data.id);
    if (index > -1) {
        savedVisas[index] = data;
    } else {
        savedVisas.push(data);
    }

    localStorage.setItem('saved_visas', JSON.stringify(savedVisas));

    Swal.fire({
        title: 'Visa Checklist Saved!',
        text: 'The Visa Requirement parameters were successfully saved.',
        icon: 'success',
        showCancelButton: true,
        cancelButtonColor: '#3085d6',
        confirmButtonColor: '#007bd1',
        confirmButtonText: 'View Saved Visas',
        cancelButtonText: 'Keep Editing'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'saved-visas.html';
        }
    });
}

// Generate PDF using html2pdf
async function downloadPDF() {
    const data = collectVisaData();
    const template = document.getElementById('pdfTemplate');

    Swal.fire({
        title: 'Generating Checklist...',
        text: 'Rendering and formatting your premium visa checklist PDF...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const opt = {
            margin: 0,
            filename: `${(data.checklistTitle || 'visa').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_checklist.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2.5,
                useCORS: true,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(template).save();

        Swal.fire({
            title: 'Downloaded!',
            text: 'Premium Visa Checklist PDF successfully downloaded.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to render PDF checklist.', 'error');
    }
}

// Setup real-time event listeners
function setupBinds() {
    const ids = [
        'inputAgencyName', 'inputAgencyEmail', 'inputAgencyPhone', 'inputAgencyWebsite',
        'inputGreetings', 'inputChecklistTitle', 'inputFees',
        'inputTerms', 'inputRequiredDocs', 'inputDetailsList'
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updatePreview);
            el.addEventListener('change', updatePreview);
        }
    });
}

// Initialize Checklist page
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('visaForm')) return;

    setupBinds();

    // Check for edit ID
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');

    if (editId) {
        const savedVisas = JSON.parse(localStorage.getItem('saved_visas') || '[]');
        const toEdit = savedVisas.find(v => v.id === editId);

        if (toEdit) {
            currentVisaId = toEdit.id;
            document.getElementById('pageMainTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Edit Visa Checklist';

            document.getElementById('inputAgencyName').value = toEdit.agencyName || '';
            document.getElementById('inputAgencyEmail').value = toEdit.agencyEmail || '';
            document.getElementById('inputAgencyPhone').value = toEdit.agencyPhone || '';
            document.getElementById('inputAgencyWebsite').value = toEdit.agencyWebsite || '';
            agencyLogoBase64 = toEdit.agencyLogo || '';

            document.getElementById('inputGreetings').value = toEdit.greetings || '';
            document.getElementById('inputChecklistTitle').value = toEdit.checklistTitle || '';


            document.getElementById('inputFees').value = toEdit.fees || '';
            document.getElementById('inputTerms').value = toEdit.terms || '';

            document.getElementById('inputRequiredDocs').value = (toEdit.requiredDocs || []).join("\n");
            document.getElementById('inputDetailsList').value = (toEdit.detailsList || []).join("\n");

            Swal.fire({
                title: 'Checklist Loaded',
                text: `Editing checklist "${toEdit.checklistTitle}"`,
                icon: 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }
    } else {
        // Set Default pre-fills
        document.getElementById('inputRequiredDocs').value = DEFAULT_DOCS.join("\n");
        document.getElementById('inputDetailsList').value = DEFAULT_DETAILS.join("\n");
    }

    updatePreview();

    // Attach Submit & Quick download events
    document.getElementById('visaForm').addEventListener('submit', saveVisa);
    document.getElementById('quickDownloadPDF').addEventListener('click', (e) => {
        e.preventDefault();
        downloadPDF();
    });
});
