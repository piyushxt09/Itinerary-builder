// Global variables
let agencyLogoBase64 = null;
let currentEditingVoucherId = null;
let currentVoucherLabel = "";

const DEFAULT_LOGO_URL = "https://adminapi.flyeasygo.com/assets-files/8e17aad2-9df5-4e81-a841-7551a0b03ddb.png";

// Default Data requested by the USER
const defaultVoucherData = {
    agencyName: "flyeasygo PVT LTD",
    agencyEmail: "bookings@flyeasygo.com",
    agencyPhone: "+91 98765 43210",
    agencyWebsite: "www.flyeasygo.com",
    hotelName: "Best Western Plus Revanta",
    address: "Satobari Hills, Near Dal Lake, Upper, McLeod Ganj, Dharamshala, Dhial, Himachal Pradesh 176216",
    phone: "8091402800",
    confirmation: "52164",
    nights: "03",
    status: "CONFIRMED",
    checkIn: "03 Jun 2026",
    checkOut: "06 Jun 2026",
    roomRows: [
        { room: "Room 1", pax: "2 Adults (Ms. Nisha Gogia)", type: "Deluxe Balcony", meal: "Breakfast" },
        { room: "Room 2", pax: "2 Adults (Mr. Shalleen Puri)", type: "Deluxe Balcony", meal: "Breakfast" }
    ],
    rooms: "2",
    guests: "4",
    cancellationPolicy: "Booking is Non Refundable.",
    terms: [
        "You must present a photo ID at the time of check in. Hotel may ask for credit card or cash deposit for the extra services at the time of check in.",
        "All extra charges should be collected directly from clients prior to departure such as parking, phone calls, room service, city tax, etc.",
        "We don't accept any responsibility for additional expenses due to the changes or delays in air, road, rail, sea or indeed of any other causes, all such expenses will have to be borne by passengers.",
        "Any special request for bed type, early check in, late check out, smoking rooms, etc are not guaranteed as subject to availability at the time of check in.",
        "Early check out will attract full cancellation charges unless otherwise specified. In case of a late check in by the guest, it is essential to inform us or the hotel in advance to avoid the booking being marked as a no-show.",
        "Check In Time- Begin: 2:00 PM | Check Out Time: 12:00 PM",
        "Extra person charges may apply at check-in, as per the property's policy.",
        "No refund either in part or in full will be made for any unused part of the services provided in the hotel.",
        "Full payment is required on confirmation of all services."
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const editTarget = localStorage.getItem('hotel_voucher_edit_target');

    if (editTarget) {
        try {
            const parsedTarget = JSON.parse(editTarget);
            console.log("Edit target found:", parsedTarget);
            
            // Set session identifiers
            currentEditingVoucherId = parsedTarget.id || null;
            currentVoucherLabel = parsedTarget.label || "";
            
            // Populate form
            loadVoucherData(parsedTarget);
            
            // Persist as current draft immediately
            saveToLocalStorage();
            
            // Clear the trigger
            localStorage.removeItem('hotel_voucher_edit_target');

            Swal.fire({
                title: 'Editing Voucher',
                text: `Loaded saved voucher: "${currentVoucherLabel}"`,
                icon: 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (error) {
            console.error("Error loading edit target", error);
            loadFreshDefaultVoucher();
        }
    } else if (urlParams.get('new') === '1') {
        loadFreshDefaultVoucher();
        window.history.replaceState({}, document.title, 'hotel-voucher.html');
    } else {
        const savedData = localStorage.getItem('hotel_voucher_current');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                currentEditingVoucherId = parsedData.id || null;
                currentVoucherLabel = parsedData.label || "";
                loadVoucherData(parsedData);
            } catch (error) {
                console.error("Error parsing saved voucher data", error);
                loadFreshDefaultVoucher();
            }
        } else {
            loadFreshDefaultVoucher();
        }
    }

    setupBinding();

    document.getElementById('generatePDFBtn').addEventListener('click', exportVoucherToPDF);
    document.getElementById('quickDownloadPDF').addEventListener('click', exportVoucherToPDF);
    document.getElementById('saveVoucherBtn').addEventListener('click', saveVoucherToHistory);
    document.getElementById('newVoucherBtn').addEventListener('click', () => startNewVoucher(false));
});

function loadVoucherData(data) {
    document.getElementById('inputAgencyName').value = data.agencyName || "";
    document.getElementById('inputAgencyEmail').value = data.agencyEmail || "";
    document.getElementById('inputAgencyPhone').value = data.agencyPhone || "";
    document.getElementById('inputAgencyWebsite').value = data.agencyWebsite || "";
    document.getElementById('inputHotelName').value = data.hotelName || "";
    document.getElementById('inputHotelAddress').value = data.address || "";
    document.getElementById('inputHotelPhone').value = data.phone || "";
    document.getElementById('inputConfirmation').value = data.confirmation || "";
    document.getElementById('inputNights').value = data.nights || "";
    document.getElementById('inputStatus').value = data.status || "CONFIRMED";
    document.getElementById('inputCheckIn').value = data.checkIn || "";
    document.getElementById('inputCheckOut').value = data.checkOut || "";
    document.getElementById('inputRooms').value = data.rooms || "";
    document.getElementById('inputGuests').value = data.guests || "";
    document.getElementById('inputCancellationPolicy').value = data.cancellationPolicy || "";

    const container = document.getElementById('roomRowsContainer');
    if (container) {
        container.innerHTML = '';
        const rowsToLoad = Array.isArray(data.roomRows) && data.roomRows.length > 0
            ? data.roomRows
            : defaultVoucherData.roomRows;
        rowsToLoad.forEach(row => addRoomRow(row));
    }

    if (Array.isArray(data.terms)) {
        document.getElementById('inputTerms').value = data.terms.join('\n');
    } else if (typeof data.terms === 'string') {
        document.getElementById('inputTerms').value = data.terms;
    } else {
        document.getElementById('inputTerms').value = (defaultVoucherData.terms || []).join('\n');
    }

    agencyLogoBase64 = data.agencyLogo || null;
    document.getElementById('viewAgencyLogo').src = agencyLogoBase64 || DEFAULT_LOGO_URL;

    updateLivePreview();
}

function getVoucherFormData(overrides = {}) {
    return {
        ...overrides,
        id: currentEditingVoucherId,
        label: currentVoucherLabel,
        agencyName: document.getElementById('inputAgencyName').value,
        agencyEmail: document.getElementById('inputAgencyEmail').value,
        agencyPhone: document.getElementById('inputAgencyPhone').value,
        agencyWebsite: document.getElementById('inputAgencyWebsite').value,
        hotelName: document.getElementById('inputHotelName').value,
        address: document.getElementById('inputHotelAddress').value,
        phone: document.getElementById('inputHotelPhone').value,
        confirmation: document.getElementById('inputConfirmation').value,
        nights: document.getElementById('inputNights').value,
        status: document.getElementById('inputStatus').value,
        checkIn: document.getElementById('inputCheckIn').value,
        checkOut: document.getElementById('inputCheckOut').value,
        roomRows: getRoomRowsData(),
        rooms: document.getElementById('inputRooms').value,
        guests: document.getElementById('inputGuests').value,
        cancellationPolicy: document.getElementById('inputCancellationPolicy').value,
        terms: document.getElementById('inputTerms').value.split('\n').filter(line => line.trim() !== ""),
        agencyLogo: agencyLogoBase64
    };

}

function loadFreshDefaultVoucher() {
    agencyLogoBase64 = null;
    currentEditingVoucherId = null;
    currentVoucherLabel = "";
    localStorage.removeItem('hotel_voucher_edit_target');
    localStorage.removeItem('hotel_voucher_current');

    const logoInput = document.getElementById('inputAgencyLogo');
    if (logoInput) {
        logoInput.value = '';
    }

    document.getElementById('viewAgencyLogo').src = DEFAULT_LOGO_URL;
    loadVoucherData(defaultVoucherData);
    saveToLocalStorage();
}

function startNewVoucher(skipConfirm = false) {
    if (skipConfirm) {
        loadFreshDefaultVoucher();
        return;
    }

    Swal.fire({
        title: 'Start New Voucher?',
        text: 'This will open a fresh voucher draft with default details.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, start new'
    }).then((result) => {
        if (result.isConfirmed) {
            loadFreshDefaultVoucher();
            Swal.fire('Ready!', 'A fresh voucher draft is ready.', 'success');
        }
    });
}

function resetToDefaults() {
    Swal.fire({
        title: 'Load Default Data?',
        text: 'This will fill the fields with the "Best Western Plus Revanta" hotel voucher details.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, load defaults'
    }).then((result) => {
        if (result.isConfirmed) {
            loadFreshDefaultVoucher();
            Swal.fire('Loaded!', 'Voucher details have been populated.', 'success');
        }
    });
}

function loadCustomLogo(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (event) {
            agencyLogoBase64 = event.target.result;
            document.getElementById('viewAgencyLogo').src = event.target.result;
            saveToLocalStorage();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function saveToLocalStorage() {
    const currentData = getVoucherFormData({
        id: currentEditingVoucherId,
        label: currentVoucherLabel
    });
    localStorage.setItem('hotel_voucher_current', JSON.stringify(currentData));
}

function addRoomRow(roomData = null) {
    const container = document.getElementById('roomRowsContainer');
    if (!container) return;

    const index = container.children.length + 1;
    const data = roomData || { room: `Room ${index}`, pax: '', type: '', meal: '' };

    const row = document.createElement('div');
    row.className = 'row g-2 mb-2 pb-2 border-bottom room-row';
    row.innerHTML = `
        <div class="col-md-2">
            <label class="form-label small fw-bold">Room</label>
            <input type="text" class="form-control form-control-sm room-input-label" value="${data.room || `Room ${index}`}">
        </div>
        <div class="col-md-4">
            <label class="form-label small fw-bold">Passenger Name(s)</label>
            <input type="text" class="form-control form-control-sm room-input-pax" placeholder="e.g. Mr. John Doe" value="${data.pax || ''}">
        </div>
        <div class="col-md-3">
            <label class="form-label small fw-bold">Room Type</label>
            <input type="text" class="form-control form-control-sm room-input-type" placeholder="e.g. Deluxe" value="${data.type || ''}">
        </div>
        <div class="col-md-2">
            <label class="form-label small fw-bold">Meal Type</label>
            <input type="text" class="form-control form-control-sm room-input-meal" placeholder="e.g. Breakfast" value="${data.meal || ''}">
        </div>
        <div class="col-md-1 d-flex align-items-end">
            <button type="button" class="btn btn-outline-danger btn-sm w-100" onclick="removeRoomRow(this)"><i class="fas fa-trash"></i></button>
        </div>
    `;
    container.appendChild(row);

    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            updateLivePreview();
            saveToLocalStorage();
        });
        input.addEventListener('change', () => {
            updateLivePreview();
            saveToLocalStorage();
        });
    });
}

function removeRoomRow(btn) {
    const row = btn.closest('.room-row');
    if (row) {
        row.remove();
        updateLivePreview();
        saveToLocalStorage();
    }
}

function getRoomRowsData() {
    const rows = document.querySelectorAll('.room-row');
    const data = [];

    rows.forEach(row => {
        data.push({
            room: row.querySelector('.room-input-label').value,
            pax: row.querySelector('.room-input-pax').value,
            type: row.querySelector('.room-input-type').value,
            meal: row.querySelector('.room-input-meal').value
        });
    });

    return data;
}

function setupBinding() {
    const inputs = [
        'inputAgencyName', 'inputAgencyEmail', 'inputAgencyPhone', 'inputAgencyWebsite',
        'inputHotelName', 'inputHotelAddress', 'inputHotelPhone', 'inputConfirmation',
        'inputNights', 'inputStatus', 'inputCheckIn', 'inputCheckOut',
        'inputRooms', 'inputGuests', 'inputCancellationPolicy', 'inputTerms'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                updateLivePreview();
                saveToLocalStorage();
            });
            el.addEventListener('change', () => {
                updateLivePreview();
                saveToLocalStorage();
            });
        }
    });
}

function updateLivePreview() {
    const agencyName = document.getElementById('inputAgencyName').value.trim() || "flyeasygo PVT LTD";
    const agencyEmail = document.getElementById('inputAgencyEmail').value.trim() || "bookings@flyeasygo.com";
    const agencyPhone = document.getElementById('inputAgencyPhone').value.trim() || "+91 98765 43210";
    const hotelName = document.getElementById('inputHotelName').value.trim() || "Hotel Name";
    const hotelAddress = document.getElementById('inputHotelAddress').value.trim() || "Hotel Address";
    const hotelPhone = document.getElementById('inputHotelPhone').value.trim() || "N/A";
    const confirmation = document.getElementById('inputConfirmation').value.trim() || "N/A";
    const nights = document.getElementById('inputNights').value.trim() || "0";
    const status = document.getElementById('inputStatus').value;
    const checkIn = document.getElementById('inputCheckIn').value.trim() || "N/A";
    const checkOut = document.getElementById('inputCheckOut').value.trim() || "N/A";
    const rooms = document.getElementById('inputRooms').value.trim() || "0";
    const guests = document.getElementById('inputGuests').value.trim() || "0";
    const cancellationPolicy = document.getElementById('inputCancellationPolicy').value.trim() || "N/A";
    const termsRaw = document.getElementById('inputTerms').value;

    document.getElementById('viewAgencyName').innerText = agencyName.toUpperCase();
    document.getElementById('viewFooterAgencyName').innerText = agencyName.toUpperCase();
    document.getElementById('viewAgencyEmail').innerText = agencyEmail;
    document.getElementById('viewAgencyPhone').innerText = agencyPhone;

    document.getElementById('viewHotelName').innerText = hotelName;
    document.getElementById('viewHotelAddress').innerText = hotelAddress;
    document.getElementById('viewHotelPhone').innerText = hotelPhone;
    document.getElementById('viewConfirmation').innerText = confirmation;
    document.getElementById('viewNights').innerText = nights.padStart(2, '0');

    const viewStatus = document.getElementById('viewStatus');
    viewStatus.innerText = status;
    viewStatus.className = 'badge-status';
    if (status === 'CONFIRMED') {
        viewStatus.classList.remove('unconfirmed');
    } else {
        viewStatus.classList.add('unconfirmed');
    }

    document.getElementById('viewCheckIn').innerText = checkIn;
    document.getElementById('viewCheckOut').innerText = checkOut;
    document.getElementById('viewRooms').innerText = rooms;
    document.getElementById('viewGuests').innerText = guests;
    document.getElementById('viewCancellationPolicy').innerText = cancellationPolicy;

    const tableBody = document.getElementById('viewRoomPaxTable');
    if (tableBody) {
        tableBody.innerHTML = '';
        const roomData = getRoomRowsData();
        if (roomData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted small py-2">No rooms configured</td></tr>`;
        } else {
            roomData.forEach(row => {
                tableBody.innerHTML += `
                    <tr style="border-color: #5a5a5a;">
                        <td class="px-2 py-1.5 fw-semibold text-dark" style="border-color: #5a5a5a;">${row.room || '-'}</td>
                        <td class="px-2 py-1.5" style="border-color: #5a5a5a;">${row.pax || '-'}</td>
                        <td class="px-2 py-1.5 text-secondary" style="border-color: #5a5a5a;">${row.type || '-'}</td>
                        <td class="px-2 py-1.5 text-secondary" style="border-color: #5a5a5a;">${row.meal || '-'}</td>
                    </tr>
                `;
            });
        }
    }

    const viewTerms = document.getElementById('viewTerms');
    viewTerms.innerHTML = "";
    const terms = termsRaw.split('\n').filter(line => line.trim() !== "");
    if (terms.length > 0) {
        terms.forEach(term => {
            const li = document.createElement('li');
            li.innerText = term.replace(/^[\s\-*+.\d)]+/, '').trim();
            viewTerms.appendChild(li);
        });
    } else {
        viewTerms.innerHTML = "<li class='text-muted'>No terms specified.</li>";
    }
}

function saveVoucherToHistory() {
    const form = document.getElementById('voucherForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const roomRows = getRoomRowsData();
    const firstPax = (roomRows.length > 0 && roomRows[0].pax) ? roomRows[0].pax.substring(0, 30) : "Passenger";
    const hotelName = document.getElementById('inputHotelName').value.trim();
    const defaultLabel = `${firstPax} - ${hotelName}`;

    const savedHistory = JSON.parse(localStorage.getItem('saved_hotel_vouchers') || '[]');

    if (currentEditingVoucherId) {
        const idx = savedHistory.findIndex(v => v.id === currentEditingVoucherId);
        if (idx !== -1) {
            Swal.fire({
                title: 'Update Saved Voucher?',
                text: `Do you want to save changes to the existing record "${currentVoucherLabel}"?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, update it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    const updatedVoucher = getVoucherFormData({
                        ...savedHistory[idx],
                        id: currentEditingVoucherId,
                        label: currentVoucherLabel,
                        updatedAt: new Date().toISOString()
                    });

                    savedHistory[idx] = updatedVoucher;
                    localStorage.setItem('saved_hotel_vouchers', JSON.stringify(savedHistory));
                    saveToLocalStorage();

                    Swal.fire({
                        title: 'Voucher Updated!',
                        text: 'Your voucher has been updated.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            });
            return;
        }
    }

    Swal.fire({
        title: 'Save Hotel Voucher',
        text: 'Enter a Name for this Voucher:',
        input: 'text',
        inputValue: defaultLabel,
        showCancelButton: true,
        confirmButtonText: 'Save Voucher',
        inputValidator: (value) => {
            if (!value) {
                return 'Please enter a valid reference label!';
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const chosenLabel = result.value.trim();
            const newId = 'voucher_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

            const newVoucher = getVoucherFormData({
                id: newId,
                label: chosenLabel,
                createdAt: new Date().toISOString()
            });

            savedHistory.push(newVoucher);
            localStorage.setItem('saved_hotel_vouchers', JSON.stringify(savedHistory));

            currentEditingVoucherId = newId;
            currentVoucherLabel = chosenLabel;
            saveToLocalStorage();

            Swal.fire({
                title: 'Saved Successfully!',
                text: 'You can now view, download, or edit this voucher anytime under "Voucher History".',
                icon: 'success',
                showCancelButton: true,
                cancelButtonColor: '#3085d6',
                confirmButtonColor: '#007bd1',
                confirmButtonText: 'View Saved Vouchers',
                cancelButtonText: 'Keep Editing'
            }).then((navResult) => {
                if (navResult.isConfirmed) {
                    window.location.href = "saved-vouchers.html";
                }
            });
        }
    });
}

async function exportVoucherToPDF() {
    const template = document.getElementById('voucherPDFTemplate');
    const hotelName = document.getElementById('inputHotelName').value.trim() || "hotel";
    const confirmation = document.getElementById('inputConfirmation').value.trim() || "voucher";

    Swal.fire({
        title: 'Preparing Hotel Voucher PDF...',
        text: 'Generating beautiful, high-fidelity A4 document with IATA stamps. Please wait...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 500));

        const opt = {
            margin: 0,
            filename: `${hotelName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_voucher_${confirmation}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(template).save();

        Swal.fire({
            title: 'Voucher Exported!',
            text: 'Premium PDF Voucher downloaded successfully.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Failed to generate high-fidelity PDF Voucher.', 'error');
    }
}
