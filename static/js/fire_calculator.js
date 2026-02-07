let chartObj = null;
let resultsHistory = [];

// Theme Control
function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.getElementById('themeBtn').innerHTML = theme === 'dark' ? '☀️' : '🌙';
}
const userPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(userPrefersDark ? 'dark' : 'light');
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-bs-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
    if(calculationData.length > 0) calculate();
}

function calculateFIRE() {
    // Inputs
    const currency = document.getElementById('currency').value;
    const startAge = parseFloat(document.getElementById('age').value);
    const savings = parseFloat(document.getElementById('currentSavings').value);
    const monthlySavings = parseFloat(document.getElementById('monthlySavings').value);
    const annualSpend = parseFloat(document.getElementById('annualSpending').value);
    const otherIncome = parseFloat(document.getElementById('otherIncome').value);
    const swr = (parseFloat(document.getElementById('swr').value) / 100);
    const annualReturn = (parseFloat(document.getElementById('expectedReturn').value) / 100);

    const netNeed = Math.max(0, annualSpend - otherIncome);
    const fireTarget = netNeed / swr;
    
    let currentBalance = savings;
    let totalInvested = savings;
    let totalInterest = 0;
    let months = 0;
    resultsHistory = [];

    // Starting State
    resultsHistory.push({ month: 0, age: startAge, balance: currentBalance, invested: totalInvested, interest: totalInterest });

    // Loop until FIRE number or age 100
    while (currentBalance < fireTarget && months < (100 - startAge) * 12) {
        months++;
        const monthlyInt = currentBalance * (annualReturn / 12);
        currentBalance += (monthlyInt + monthlySavings);
        totalInterest += monthlyInt;
        totalInvested += monthlySavings;

        resultsHistory.push({
            month: months,
            age: startAge + (months / 12),
            balance: currentBalance,
            invested: totalInvested,
            interest: totalInterest
        });
    }

    // Update Results Cards
    document.getElementById('resNumber').innerText = currency + fireTarget.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('resAge').innerText = (startAge + (months / 12)).toFixed(1);
    document.getElementById('resYears').innerText = (months / 12).toFixed(1);

    updateVisuals();
}

function updateVisuals() {
    if (resultsHistory.length === 0) return;

    const currency = document.getElementById('currency').value;
    const mode = document.getElementById('viewMode').value;
    const isYearly = mode === 'yearly';
    const step = isYearly ? 12 : 1;
    
    // Update Table Column Header
    document.getElementById('tableColHeading').innerText = isYearly ? "Age" : "Month";

    const filtered = resultsHistory.filter((d, i) => (i) % step === 0);

    // Update Chart
    const ctx = document.getElementById('fireChart').getContext('2d');
    if (chartObj) chartObj.destroy();
    chartObj = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filtered.map(d => isYearly ? `Age ${Math.floor(d.age)}` : `Mo ${d.month}`),
            datasets: [
                { label: 'Total Invested', data: filtered.map(d => d.invested), backgroundColor: '#0d6efd' },
                { label: 'Compound Interest', data: filtered.map(d => d.interest), backgroundColor: '#198754' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${currency}${Math.round(c.raw).toLocaleString()}` } } }
        }
    });

    // Update Table Body
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    filtered.forEach(d => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${isYearly ? Math.floor(d.age) : d.month}</td>
            <td>${currency}${Math.round(d.invested).toLocaleString()}</td>
            <td class="text-success">${currency}${Math.round(d.interest).toLocaleString()}</td>
            <td class="fw-bold">${currency}${Math.round(d.balance).toLocaleString()}</td>
        `;
    });
}

function downloadCSV() {
    if (resultsHistory.length === 0) return;
    let csv = 'Age,Month,Invested,Interest,TotalValue\n';
    resultsHistory.forEach(d => {
        csv += `${d.age.toFixed(2)},${d.month},${d.invested.toFixed(2)},${d.interest.toFixed(2)},${d.balance.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fire_plan_export.csv';
    a.click();
}

// Default run on load
window.onload = calculateFIRE;