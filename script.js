const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6Cf2AYo8IVs5DQU035Jo_CzepOW490P0TmCf_GdO_eD327jDpOJLIN6V5UZkHhXMN3w/exec';

let currentUser = '';
let chartInstance = null;
let isQrMode = false; // Penanda apakah aplikasi dibuka lewat scan HP Pasien

// ==========================================
// LOGIKA DASHBOARD (index.html)
// ==========================================
function loadDashboardData() {
    const chartCanvas = document.getElementById('kepuasanChart');
    if (!chartCanvas) return;

    const btnRefresh = document.getElementById('btn-refresh');
    if(btnRefresh) {
        btnRefresh.disabled = true;
        btnRefresh.innerHTML = '<i class="ph ph-spinner-gap spin-smooth text-lg"></i> Memuat...';
    }

    fetch(SCRIPT_URL)
    .then(response => response.json())
    .then(data => {
        animateCounter('statTotal', parseInt(data.total) || 0);
        animateCounter('statPuas', parseInt(data.puas) || 0);
        animateCounter('statTidakPuas', parseInt(data.tidakPuas) || 0);

        renderChart(data.puas, data.tidakPuas);

        if(btnRefresh) {
            btnRefresh.disabled = false;
            btnRefresh.innerHTML = '<i class="ph-bold ph-arrows-clockwise text-lg"></i> Refresh';
        }
    })
    .catch(error => {
        console.error('Gagal memuat data:', error);
        if(btnRefresh) {
            btnRefresh.disabled = false;
            btnRefresh.innerHTML = '<i class="ph-bold ph-arrows-clockwise text-lg"></i> Refresh';
        }
    });
}

function animateCounter(elementId, endValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = 0;
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = (endValue - startValue) / steps;

    let currentValue = startValue;
    let step = 0;

    element.classList.add('counter-animate');

    const timer = setInterval(() => {
        step++;
        currentValue += increment;

        if (step >= steps) {
            element.innerText = endValue;
            clearInterval(timer);
        } else {
            element.innerText = Math.floor(currentValue);
        }
    }, stepDuration);
}

function renderChart(puas, tidakPuas) {
    const ctx = document.getElementById('kepuasanChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const total = puas + tidakPuas;
    const puasPercentage = total > 0 ? ((puas / total) * 100).toFixed(1) : 0;
    const tidakPuasPercentage = total > 0 ? ((tidakPuas / total) * 100).toFixed(1) : 0;

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [`Sangat Puas (${puasPercentage}%)`, `Tidak Puas (${tidakPuasPercentage}%)`],
            datasets: [{
                data: [puas, tidakPuas],
                backgroundColor: ['#78BE20', '#F26522'],
                hoverBackgroundColor: ['#5C9615', '#D95214'],
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 12,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '70%'
        }
    });
}

// ==========================================
// LOGIKA SURVEI & QR CODE (survei.html)
// ==========================================
function bukaLayarSurvei() {
    const inputElement = document.getElementById('namaPasien');
    if(!inputElement) return;

    const nama = inputElement.value.trim();

    if (nama === '') {
        inputElement.classList.add('animate-pulse');
        inputElement.focus();
        setTimeout(() => inputElement.classList.remove('animate-pulse'), 1000);
        return;
    }

    currentUser = nama;
    document.getElementById('displayNama').innerText = currentUser;

    document.getElementById('main-nav').classList.add('hidden');
    document.getElementById('section-input').classList.add('hidden');

    setTimeout(() => {
        document.getElementById('section-survey').classList.remove('hidden');
    }, 200);
}

function generateQRCode() {
    const inputElement = document.getElementById('namaPasien');
    if(!inputElement) return;

    const nama = inputElement.value.trim();

    // Validasi input kosong
    if (nama === '') {
        alert("Mohon masukkan nama pasien terlebih dahulu!");
        inputElement.classList.add('animate-pulse');
        inputElement.focus();
        setTimeout(() => inputElement.classList.remove('animate-pulse'), 1000);
        return;
    }

    // Validasi Library QR
    if (typeof QRious === 'undefined') {
        alert("Gagal memuat sistem QR. Pastikan koneksi internet aktif untuk memuat library QRious.");
        return;
    }

    const qrContainer = document.getElementById('qr-container');
    const qrCanvas = document.getElementById('qr-canvas');
    
    // Tampilkan Container QR
    qrContainer.classList.remove('hidden');

    // Dapatkan URL saat ini (tanpa parameter query lama)
    const baseUrl = window.location.href.split('?')[0];
    
    // Peringatan jika dijalankan secara lokal (HP pasien tidak akan bisa mengakses file://)
    if(baseUrl.startsWith('file://')) {
        alert("PERHATIAN: Anda membuka file lokal (file://). QR Code akan terbuat, tapi HP pasien tidak akan bisa membukanya. Aplikasi harus di-hosting terlebih dahulu.");
    }

    const surveyUrl = `${baseUrl}?nama=${encodeURIComponent(nama)}`;

    // Generate ulang QR Code di Canvas
    new QRious({
        element: qrCanvas,
        value: surveyUrl,
        size: 220,
        background: 'white',
        foreground: '#00539C' // Warna Biru IHC
    });

    // Scroll otomatis ke bawah agar kasir bisa langsung melihat QR
    qrContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetKasir() {
    // Fungsi manual untuk kasir mengembalikan layar ke awal
    document.getElementById('namaPasien').value = '';
    document.getElementById('qr-container').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function kirimSurvei(kepuasan) {
    const loading = document.getElementById('loadingIndicator');
    loading.classList.remove('hidden');

    const payload = { nama: currentUser, kepuasan: kepuasan };

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        loading.classList.add('hidden');
        document.getElementById('section-survey').classList.add('hidden');
        
        const thankyouContent = document.getElementById('thankyou-content');

        if (isQrMode) {
            // MODE HP PASIEN: Berhenti di sini, tidak ada tombol kembali
            thankyouContent.innerHTML = `
                <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-ihc-blue/10 text-ihc-blue mb-6">
                    <i class="ph-fill ph-check-circle text-6xl"></i>
                </div>
                <h2 class="text-3xl font-extrabold text-slate-800 mb-4">Selesai</h2>
                <p class="text-slate-500 font-medium leading-relaxed">Terima kasih atas penilaian Anda. Anda dapat menutup halaman ini sekarang.</p>
            `;
            document.getElementById('section-thankyou').classList.remove('hidden');
        } else {
            // MODE DEVICE KASIR: Muncul terima kasih lalu otomatis kembali
            thankyouContent.innerHTML = `
                <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-ihc-green/10 text-ihc-green mb-6">
                    <i class="ph-fill ph-check-circle text-6xl"></i>
                </div>
                <h2 class="text-3xl font-extrabold text-slate-800 mb-4">Terima Kasih!</h2>
                <p class="text-slate-500 font-medium leading-relaxed mb-8">Tanggapan Anda sangat berharga bagi peningkatan layanan kami.</p>
                <p class="text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                    <i class="ph ph-spinner animate-spin"></i> Kembali ke awal...
                </p>
            `;
            document.getElementById('section-thankyou').classList.remove('hidden');

            setTimeout(() => {
                document.getElementById('namaPasien').value = '';
                document.getElementById('section-thankyou').classList.add('hidden');
                document.getElementById('section-input').classList.remove('hidden');
                document.getElementById('main-nav').classList.remove('hidden');
            }, 3000);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        loading.classList.add('hidden');
        alert('Kendala jaringan. Laporkan ke kasir.');
        location.reload();
    });
}

// ==========================================
// INITIALIZATION PADA SAAT LOAD HALAMAN
// ==========================================
window.onload = () => {
    // 1. Cek Parameter URL (Untuk mendeteksi mode HP pasien)
    const urlParams = new URLSearchParams(window.location.search);
    const namaDariUrl = urlParams.get('nama');
    
    if (namaDariUrl) {
        // JIKA ADA PARAMETER NAMA -> Buka mode HP Pasien
        isQrMode = true;
        currentUser = decodeURIComponent(namaDariUrl);
        
        const displayElem = document.getElementById('displayNama');
        if (displayElem) displayElem.innerText = currentUser;

        // Sembunyikan Navigasi & Form Kasir
        const mainNav = document.getElementById('main-nav');
        const sectionInput = document.getElementById('section-input');
        const sectionSurvey = document.getElementById('section-survey');
        
        if (mainNav) mainNav.classList.add('hidden');
        if (sectionInput) sectionInput.classList.add('hidden');
        
        // Langsung tampilkan layar survei
        if (sectionSurvey) sectionSurvey.classList.remove('hidden');
    } else {
        // JIKA TIDAK ADA -> Ini adalah mode Kasir, muat data dashboard jika di index.html
        loadDashboardData();
    }
};

// Smooth Scroll Navigation
document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a[href*="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
});