// GANTI DENGAN URL APPS SCRIPT ANDA
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6Cf2AYo8IVs5DQU035Jo_CzepOW490P0TmCf_GdO_eD327jDpOJLIN6V5UZkHhXMN3w/exec';

let currentUser = '';
let chartInstance = null;

// ==========================================
// LOGIKA DASHBOARD (Hanya jalan di index.html)
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
        // Animate counter numbers
        animateCounter('statTotal', parseInt(data.total) || 0);
        animateCounter('statPuas', parseInt(data.puas) || 0);
        animateCounter('statTidakPuas', parseInt(data.tidakPuas) || 0);

        renderChart(data.puas, data.tidakPuas);

        if(btnRefresh) {
            btnRefresh.disabled = false;
            btnRefresh.innerHTML = '<i class="ph-bold ph-arrows-clockwise text-lg"></i> Refresh Data';
        }
    })
    .catch(error => {
        console.error('Gagal memuat data:', error);
        if(btnRefresh) {
            btnRefresh.disabled = false;
            btnRefresh.innerHTML = '<i class="ph ph-arrows-clockwise text-lg"></i> Refresh Data';
        }
    });
}

// Animate counter dengan efek smooth count-up
function animateCounter(elementId, endValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = 0;
    const duration = 1500; // 1.5 detik
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
                backgroundColor: ['#00C896', '#FF6B35'],
                hoverBackgroundColor: ['#009B7F', '#FF5520'],
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 12,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            family: "'Plus Jakarta Sans', sans-serif",
                            size: 14,
                            weight: '600'
                        },
                        color: '#475569',
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + ' responden';
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// ==========================================
// LOGIKA SURVEI (Hanya jalan di survei.html)
// ==========================================
function bukaLayarSurvei() {
    const inputElement = document.getElementById('namaPasien');
    const nama = inputElement.value.trim();

    if (nama === '') {
        // Shake animation pada input
        inputElement.classList.add('animate-pulse');
        inputElement.focus();
        setTimeout(() => inputElement.classList.remove('animate-pulse'), 1000);
        return;
    }

    currentUser = nama;
    document.getElementById('displayNama').innerText = currentUser;

    // Sembunyikan dengan fade out, tampilkan dengan fade in
    document.getElementById('main-nav').classList.add('hidden');
    document.getElementById('section-input').classList.add('hidden');

    setTimeout(() => {
        document.getElementById('section-survey').classList.remove('hidden');
    }, 200);
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

        // Sembunyikan Survei, Tampilkan Terima Kasih dengan animasi
        document.getElementById('section-survey').classList.add('hidden');

        setTimeout(() => {
            document.getElementById('section-thankyou').classList.remove('hidden');
        }, 300);

        // Otomatis kembali ke layar Kasir setelah 4 detik
        setTimeout(() => {
            document.getElementById('namaPasien').value = '';
            document.getElementById('section-thankyou').classList.add('hidden');
            document.getElementById('section-input').classList.remove('hidden');
            document.getElementById('main-nav').classList.remove('hidden');
        }, 4000);
    })
    .catch(error => {
        console.error('Error:', error);
        loading.classList.add('hidden');
        alert('Kendala jaringan. Laporkan ke kasir.');
        location.reload();
    });
}

// Auto scroll untuk smooth navigation
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

window.onload = () => {
    loadDashboardData();
};