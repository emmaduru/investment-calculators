let chartInstance = null;
let calculationData = [];

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

function calculate() {
    const curr = document.getElementById('currency').value;
    const initial = parseFloat(document.getElementById('initialAmount').value) || 0;
    const rate = (parseFloat(document.getElementById('interestRate').value) / 100) || 0;
    const totalMonths = (parseInt(document.getElementById('years').value) || 0) * 12 + (parseInt(document.getElementById('months').value) || 0);

    const deposit = parseFloat(document.getElementById('depositAmount').value) || 0;
    const depFreq = parseInt(document.getElementById('depositFreq').value);
    const depInc = (parseFloat(document.getElementById('depositIncrease').value) / 100) || 0;

    const withdrawal = parseFloat(document.getElementById('withdrawalAmount').value) || 0;
    const witFreq = parseInt(document.getElementById('withdrawalFreq').value);
    const witInc = (parseFloat(document.getElementById('withdrawalIncrease').value) / 100) || 0;

    let balance = initial;
    let totalInterest = 0;
    let cumulativeNetDeposits = initial;
    let currentMonthlyDeposit = deposit;
    let currentMonthlyWithdrawal = withdrawal;
    
    calculationData = [];
    let periodNetFlow = 0;

    for (let m = 1; m <= totalMonths; m++) {
        let monthlyInterest = balance * (rate / 12);
        let monthlyNet = 0;

        // Apply deposits
        if (m % (12 / depFreq) === 0) monthlyNet += currentMonthlyDeposit;
        // Apply withdrawals
        if (m % (12 / witFreq) === 0) monthlyNet -= currentMonthlyWithdrawal;

        balance += monthlyInterest + monthlyNet;
        totalInterest += monthlyInterest;
        cumulativeNetDeposits += monthlyNet;
        periodNetFlow += monthlyNet;

        // Annual increase adjustments
        if (m % 12 === 0) {
            currentMonthlyDeposit *= (1 + depInc);
            currentMonthlyWithdrawal *= (1 + witInc);
        }

        calculationData.push({
            period: m,
            interest: monthlyInterest,
            accruedInterest: totalInterest,
            periodNet: monthlyNet, // monthly flow
            cumulativeNet: cumulativeNetDeposits, // total principal at this point
            balance: Math.max(0, balance),
            periodSumNet: periodNetFlow // used for yearly view summation
        });
        
        // Reset period flow sum after each month if view is monthly, otherwise keep summing for year
        if (document.getElementById('viewMode').value === 'monthly') periodNetFlow = 0;
        else if (m % 12 === 0) periodNetFlow = 0;
    }

    updateResults(curr, balance, totalInterest, cumulativeNetDeposits);
    renderChart(document.getElementById('viewMode').value);
    renderTable(document.getElementById('viewMode').value, curr);
}

function updateResults(curr, balance, interest, principal) {
    const fmt = (v) => curr + v.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('resFutureValue').innerText = fmt(balance);
    document.getElementById('resTotalInterest').innerText = fmt(interest);
    const ror = principal > 0 ? ((balance - principal) / principal * 100).toFixed(2) : "0.00";
    document.getElementById('resRateReturn').innerText = ror + '%';
}

function renderChart(view) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    const step = view === 'yearly' ? 12 : 1;
    const filtered = calculationData.filter((_, i) => (i + 1) % step === 0);
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filtered.map(d => view === 'yearly' ? `Yr ${d.period/12}` : `Mo ${d.period}`),
            datasets: [
                { label: 'Cumulative Net Deposits', data: filtered.map(d => d.cumulativeNet.toFixed(2)), backgroundColor: '#0d6efd' },
                { label: 'Accrued Interest', data: filtered.map(d => d.accruedInterest.toFixed(2)), backgroundColor: '#198754' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, ticks: { color: isDark ? '#adb5bd' : '#495057' } },
                y: { stacked: true, ticks: { color: isDark ? '#adb5bd' : '#495057' } }
            },
            plugins: { 
                legend: { labels: { color: isDark ? '#fff' : '#000' } },
                tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${Number(c.raw).toFixed(2)}` } }
            }
        }
    });
}

function renderTable(view, curr) {
    const step = view === 'yearly' ? 12 : 1;
    const header = document.getElementById('tableHeader');
    header.innerHTML = `
        <th>${view === 'yearly' ? 'Year' : 'Month'}</th>
        <th>Interest</th>
        <th>Net Flow</th>
        <th>Cumul. Deposits</th>
        <th>Balance</th>
    `;
    
    const body = document.getElementById('tableBody');
    body.innerHTML = '';
    
    let yearInterestSum = 0;

    calculationData.forEach((d, i) => {
        yearInterestSum += d.interest;
        
        if ((i + 1) % step === 0) {
            const row = body.insertRow();
            const displayNet = view === 'yearly' ? 
                calculationData.slice(i-11, i+1).reduce((acc, curr) => acc + curr.periodNet, 0) : 
                d.periodNet;

            row.innerHTML = `
                <td>${view === 'yearly' ? (i + 1) / 12 : i + 1}</td>
                <td class="text-success">+${d.interest.toFixed(2)}</td>
                <td class="${displayNet >= 0 ? 'text-primary' : 'text-danger'}">${displayNet.toFixed(2)}</td>
                <td>${d.cumulativeNet.toFixed(2)}</td>
                <td class="fw-bold">${d.balance.toFixed(2)}</td>
            `;
            yearInterestSum = 0; 
        }
    });
}

function downloadCSV() {
    let csv = 'Period,Interest,Net Flow,Cumulative Deposits,Total Balance\n';
    calculationData.forEach(d => { 
        csv += `${d.period},${d.interest.toFixed(2)},${d.periodNet.toFixed(2)},${d.cumulativeNet.toFixed(2)},${d.balance.toFixed(2)}\n`; 
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'wealth_projection.csv'; a.click();
}

calculate();