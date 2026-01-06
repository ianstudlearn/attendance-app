// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed'));
    });
}

// Global variables
let editingId = null;
let attendanceRecords = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadRecords();
    setDefaultDate();
    setupEventListeners();
    cleanOldRecords();
    updateTotalHours();
});

// Set today's date as default
function setDefaultDate() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('attendanceForm').addEventListener('submit', handleSubmit);
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
    document.getElementById('saveEdit').addEventListener('click', saveEditedRecord);
    document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
}

// Load records from localStorage
function loadRecords() {
    const saved = localStorage.getItem('attendanceRecords');
    attendanceRecords = saved ? JSON.parse(saved) : [];
    displayRecords();
}

// Save records to localStorage
function saveRecords() {
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
}

// Handle form submission
function handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const date = document.getElementById('date').value;
    const timeIn = document.getElementById('timeIn').value;
    const timeOut = document.getElementById('timeOut').value;

    const hours = calculateHours(timeIn, timeOut);

    if (hours < 0) {
        alert('Time Out must be after Time In!');
        return;
    }

    const record = {
        id: Date.now(),
        name,
        date,
        timeIn,
        timeOut,
        hours: hours.toFixed(2),
        timestamp: new Date().toISOString()
    };

    attendanceRecords.push(record);
    saveRecords();
    displayRecords();
    updateTotalHours();

    // Reset form
    document.getElementById('attendanceForm').reset();
    setDefaultDate();

    // Show success feedback
    showNotification('Attendance saved successfully!');
}

// Calculate hours worked
function calculateHours(timeIn, timeOut) {
    const [inHour, inMin] = timeIn.split(':').map(Number);
    const [outHour, outMin] = timeOut.split(':').map(Number);

    const inMinutes = inHour * 60 + inMin;
    const outMinutes = outHour * 60 + outMin;

    const diffMinutes = outMinutes - inMinutes;
    return diffMinutes / 60;
}

// Display all records
function displayRecords() {
    const recordsList = document.getElementById('recordsList');
    
    if (attendanceRecords.length === 0) {
        recordsList.innerHTML = '<div class="no-records">No attendance records yet. Add your first entry above!</div>';
        return;
    }

    // Sort by date (newest first)
    const sorted = [...attendanceRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

    recordsList.innerHTML = sorted.map(record => `
        <div class="record-card" data-id="${record.id}">
            <div class="record-header">
                <div>
                    <div class="record-name">${record.name}</div>
                    <div class="record-date">${formatDate(record.date)}</div>
                </div>
            </div>
            <div class="record-details">
                <div class="detail-item">
                    <div class="detail-label">Time In</div>
                    <div class="detail-value">${formatTime(record.timeIn)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Time Out</div>
                    <div class="detail-value">${formatTime(record.timeOut)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Hours Worked</div>
                    <div class="detail-value">${record.hours} hrs</div>
                </div>
            </div>
            <div class="record-actions">
                <button class="btn btn-edit" onclick="editRecord(${record.id})">✏️ Edit</button>
                <button class="btn btn-danger" onclick="deleteRecord(${record.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

// Format date for display
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Format time for display
function formatTime(timeStr) {
    const [hour, min] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${min} ${ampm}`;
}

// Edit record
function editRecord(id) {
    const record = attendanceRecords.find(r => r.id === id);
    if (!record) return;

    editingId = id;

    document.getElementById('editName').value = record.name;
    document.getElementById('editDate').value = record.date;
    document.getElementById('editTimeIn').value = record.timeIn;
    document.getElementById('editTimeOut').value = record.timeOut;

    document.getElementById('editModal').classList.add('active');
}

// Save edited record
function saveEditedRecord() {
    if (!editingId) return;

    const name = document.getElementById('editName').value;
    const date = document.getElementById('editDate').value;
    const timeIn = document.getElementById('editTimeIn').value;
    const timeOut = document.getElementById('editTimeOut').value;

    const hours = calculateHours(timeIn, timeOut);

    if (hours < 0) {
        alert('Time Out must be after Time In!');
        return;
    }

    const index = attendanceRecords.findIndex(r => r.id === editingId);
    if (index !== -1) {
        attendanceRecords[index] = {
            ...attendanceRecords[index],
            name,
            date,
            timeIn,
            timeOut,
            hours: hours.toFixed(2)
        };

        saveRecords();
        displayRecords();
        updateTotalHours();
        closeEditModal();
        showNotification('Record updated successfully!');
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    editingId = null;
}

// Delete record
function deleteRecord(id) {
    if (confirm('Are you sure you want to delete this record?')) {
        attendanceRecords = attendanceRecords.filter(r => r.id !== id);
        saveRecords();
        displayRecords();
        updateTotalHours();
        showNotification('Record deleted successfully!');
    }
}

// Update total hours
function updateTotalHours() {
    const total = attendanceRecords.reduce((sum, record) => sum + parseFloat(record.hours), 0);
    document.getElementById('totalHours').textContent = total.toFixed(2);
}

// Clean old records (older than 5 months)
function cleanOldRecords() {
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

    const initialCount = attendanceRecords.length;
    attendanceRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= fiveMonthsAgo;
    });

    if (attendanceRecords.length < initialCount) {
        saveRecords();
        console.log(`Cleaned ${initialCount - attendanceRecords.length} old records`);
    }
}

// Export to PDF
function exportToPDF() {
    if (attendanceRecords.length === 0) {
        alert('No records to export!');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('Attendance Records', 14, 20);

    // Date range
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    // Table data
    const tableData = attendanceRecords
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(record => [
            record.name,
            formatDate(record.date),
            formatTime(record.timeIn),
            formatTime(record.timeOut),
            record.hours
        ]);

    // Total hours
    const totalHours = attendanceRecords.reduce((sum, r) => sum + parseFloat(r.hours), 0).toFixed(2);

    doc.autoTable({
        head: [['Name', 'Date', 'Time In', 'Time Out', 'Hours']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [76, 175, 80] },
        foot: [['', '', '', 'Total Hours:', totalHours]],
        footStyles: { fillColor: [76, 175, 80], fontStyle: 'bold' }
    });

    doc.save(`attendance_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('PDF exported successfully!');
}

// Export to Excel
function exportToExcel() {
    if (attendanceRecords.length === 0) {
        alert('No records to export!');
        return;
    }

    const data = attendanceRecords
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(record => ({
            'Name': record.name,
            'Date': record.date,
            'Time In': record.timeIn,
            'Time Out': record.timeOut,
            'Hours Worked': record.hours
        }));

    // Add total row
    const totalHours = attendanceRecords.reduce((sum, r) => sum + parseFloat(r.hours), 0).toFixed(2);
    data.push({
        'Name': '',
        'Date': '',
        'Time In': '',
        'Time Out': 'Total Hours:',
        'Hours Worked': totalHours
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    XLSX.writeFile(workbook, `attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Excel exported successfully!');
}

// Show notification
function showNotification(message) {
    // Simple alert for now - could be enhanced with custom notification UI
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 2000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Run cleanup daily
setInterval(cleanOldRecords, 24 * 60 * 60 * 1000);
