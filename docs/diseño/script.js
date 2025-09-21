document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const body = document.body;
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const addButton = document.getElementById('add-transaction-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const closeModal = document.getElementById('close-modal');
    const cancelForm = document.getElementById('cancel-form');
    const transactionForm = document.getElementById('transaction-form');
    const typeOptions = document.querySelectorAll('.type-option');
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const closeSidebar = document.getElementById('close-sidebar');
    const themeToggle = document.getElementById('theme-toggle');
    const themeSelect = document.getElementById('theme-select');
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const transactionList = document.getElementById('transaction-list');
    
    // Datos de ejemplo para transacciones
    const transactions = [
        {
            title: 'Supermercado',
            amount: -24.90,
            category: 'Alimentación',
            date: '20/08/2025',
            icon: 'shopping-cart'
        },
        {
            title: 'Gasolina',
            amount: -45.00,
            category: 'Transporte',
            date: '19/08/2025',
            icon: 'gas-pump'
        },
        {
            title: 'Nómina',
            amount: 1200.00,
            category: 'Ingreso',
            date: '15/08/2025',
            icon: 'money-check'
        },
        {
            title: 'Netflix',
            amount: -15.99,
            category: 'Ocio',
            date: '10/08/2025',
            icon: 'tv'
        },
        {
            title: 'Restaurante',
            amount: -32.50,
            category: 'Alimentación',
            date: '18/08/2025',
            icon: 'utensils'
        },
        {
            title: 'Gimnasio',
            amount: -35.00,
            category: 'Salud',
            date: '05/08/2025',
            icon: 'dumbbell'
        }
    ];
    
    // Inicializar el tema
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'auto';
        
        if (savedTheme === 'dark' || (savedTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            body.classList.add('dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            body.classList.remove('dark');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        if (themeSelect) {
            themeSelect.value = savedTheme;
        }
    }
    
    // Cambiar tema
    function toggleTheme() {
        if (body.classList.contains('dark')) {
            body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    // Navegación entre pestañas
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Actualizar elemento de navegación activo
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar contenido de pestaña seleccionada
            tabContents.forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Modal de nueva transacción
    addButton.addEventListener('click', function() {
        modalOverlay.classList.add('active');
    });
    
    function hideModal() {
        modalOverlay.classList.remove('active');
    }
    
    closeModal.addEventListener('click', hideModal);
    cancelForm.addEventListener('click', hideModal);
    
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            hideModal();
        }
    });
    
    // Selección de tipo (ingreso/gasto)
    typeOptions.forEach(option => {
        option.addEventListener('click', function() {
            typeOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input').checked = true;
        });
    });
    
    // Envío del formulario
    transactionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // Aquí procesarías los datos del formulario
        hideModal();
        // Reiniciar formulario
        this.reset();
    });
    
    // Menú lateral
    menuBtn.addEventListener('click', function() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    });
    
    function hideSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
    
    closeSidebar.addEventListener('click', hideSidebar);
    sidebarOverlay.addEventListener('click', hideSidebar);
    
    // Cambio de tema
    themeToggle.addEventListener('click', toggleTheme);
    
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            localStorage.setItem('theme', this.value);
            initTheme();
        });
    }
    
    // Búsqueda
    searchBtn.addEventListener('click', function() {
        searchInput.classList.toggle('active');
        if (searchInput.classList.contains('active')) {
            searchInput.focus();
        }
    });
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterTransactions(searchTerm);
    });
    
    // Filtrar transacciones
    function filterTransactions(term) {
        const transactionItems = transactionList.querySelectorAll('.transaction-item');
        
        transactionItems.forEach(item => {
            const title = item.querySelector('.transaction-title').textContent.toLowerCase();
            const category = item.querySelector('.transaction-meta').textContent.toLowerCase();
            
            if (title.includes(term) || category.includes(term)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    // Renderizar transacciones
    function renderTransactions() {
        let transactionsHTML = '';
        
        transactions.forEach(transaction => {
            const isIncome = transaction.amount > 0;
            const amountClass = isIncome ? 'positive-amount' : 'negative-amount';
            const amountSign = isIncome ? '+' : '';
            const iconClass = isIncome ? 'income' : '';
            
            transactionsHTML += `
                <li class="transaction-item">
                    <div class="transaction-icon ${iconClass}">
                        <i class="fas fa-${transaction.icon}"></i>
                    </div>
                    <div class="transaction-details">
                        <p class="transaction-title">${transaction.title}</p>
                        <p class="transaction-meta">
                            <i class="far fa-calendar"></i> ${transaction.date} • ${transaction.category}
                        </p>
                    </div>
                    <div class="transaction-amount ${amountClass}">${amountSign}${transaction.amount.toFixed(2)} €</div>
                </li>
            `;
        });
        
        transactionList.innerHTML = transactionsHTML;
    }
    
    // Inicializar gráficos
    function initCharts() {
        // Gráfico de gastos (tarta)
        const expensesCtx = document.getElementById('expensesChart').getContext('2d');
        new Chart(expensesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Alimentación', 'Vivienda', 'Transporte', 'Ocio', 'Otros'],
                datasets: [{
                    data: [220, 180, 75, 60, 44],
                    backgroundColor: [
                        '#6366F1', '#22C55E', '#06B6D4', '#F59E0B', '#EF4444'
                    ],
                    borderWidth: 0,
                    borderRadius: 6,
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // Gráfico de ingresos vs gastos (barras)
        const incomeVsExpensesCtx = document.getElementById('incomeVsExpensesChart').getContext('2d');
        new Chart(incomeVsExpensesCtx, {
            type: 'bar',
            data: {
                labels: ['May', 'Jun', 'Jul', 'Ago'],
                datasets: [
                    {
                        label: 'Ingresos',
                        data: [1100, 1200, 1180, 1200],
                        backgroundColor: '#22C55E',
                        borderRadius: 6
                    },
                    {
                        label: 'Gastos',
                        data: [820, 930, 760, 580],
                        backgroundColor: '#EF4444',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // Gráfico de ahorro (línea)
        const savingsCtx = document.getElementById('savingsChart').getContext('2d');
        new Chart(savingsCtx, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    label: 'Ahorro',
                    data: [200, 150, 220, 180, 260, 300],
                    borderColor: '#6366F1',
                    tension: 0.3,
                    pointBackgroundColor: '#6366F1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    fill: true,
                    backgroundColor: 'rgba(99, 102, 241, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // Gráfico de tendencia (área)
        const trendCtx = document.getElementById('trendChart');
        if (trendCtx) {
            new Chart(trendCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'],
                    datasets: [{
                        label: 'Gastos',
                        data: [820, 930, 760, 880, 920, 850, 760, 580],
                        borderColor: '#EF4444',
                        tension: 0.4,
                        pointBackgroundColor: '#EF4444',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                drawBorder: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
        
        // Inicializar gráficos duplicados para pestaña de analytics
        const analyticsExpensesCtx = document.getElementById('analyticsExpensesChart');
        if (analyticsExpensesCtx) {
            new Chart(analyticsExpensesCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Alimentación', 'Vivienda', 'Transporte', 'Ocio', 'Otros'],
                    datasets: [{
                        data: [220, 180, 75, 60, 44],
                        backgroundColor: [
                            '#6366F1', '#22C55E', '#06B6D4', '#F59E0B', '#EF4444'
                        ],
                        borderWidth: 0,
                        borderRadius: 6,
                        hoverOffset: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
        
        const analyticsIncomeVsExpensesCtx = document.getElementById('analyticsIncomeVsExpensesChart');
        if (analyticsIncomeVsExpensesCtx) {
            new Chart(analyticsIncomeVsExpensesCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['May', 'Jun', 'Jul', 'Ago'],
                    datasets: [
                        {
                            label: 'Ingresos',
                            data: [1100, 1200, 1180, 1200],
                            backgroundColor: '#22C55E',
                            borderRadius: 6
                        },
                        {
                            label: 'Gastos',
                            data: [820, 930, 760, 580],
                            backgroundColor: '#EF4444',
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                drawBorder: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    }
    
    // Inicializar la aplicación
    function initApp() {
        initTheme();
        renderTransactions();
        initCharts();
    }
    
    // Ejecutar inicialización
    initApp();
});