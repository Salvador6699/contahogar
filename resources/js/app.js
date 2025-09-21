import './bootstrap';

import Alpine from 'alpinejs';

window.Alpine = Alpine;

Alpine.start();

// Funcionalidad de la cabecera y sidebar
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const closeSidebar = document.getElementById('close-sidebar');
    const themeToggle = document.getElementById('theme-toggle');
    const addButton = document.getElementById('add-transaction-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const closeModal = document.getElementById('close-modal');
    const cancelForm = document.getElementById('cancel-form');
    const transactionForm = document.getElementById('transaction-form');
    const typeOptions = document.querySelectorAll('.type-option');
    
    // Menú lateral
    if (menuBtn && sidebar && sidebarOverlay) {
        menuBtn.addEventListener('click', function() {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('opacity-0', 'invisible');
            sidebarOverlay.classList.add('opacity-100', 'visible');
        });
        
        function hideSidebar() {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.remove('opacity-100', 'visible');
            sidebarOverlay.classList.add('opacity-0', 'invisible');
        }
        
        if (closeSidebar) {
            closeSidebar.addEventListener('click', hideSidebar);
        }
        
        sidebarOverlay.addEventListener('click', hideSidebar);
    }
    
    // Toggle de tema
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const html = document.documentElement;
            const isDark = html.classList.contains('dark');
            
            if (isDark) {
                html.classList.remove('dark');
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon text-text"></i>';
            } else {
                html.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun text-text"></i>';
            }
        });
        
        // Inicializar tema
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('dark');
            themeToggle.innerHTML = '<i class="fas fa-sun text-text"></i>';
        } else {
            document.documentElement.classList.remove('dark');
            themeToggle.innerHTML = '<i class="fas fa-moon text-text"></i>';
        }
    }
    
    // Modal de nueva transacción
    if (addButton && modalOverlay) {
        addButton.addEventListener('click', function() {
            modalOverlay.classList.remove('opacity-0', 'invisible');
            modalOverlay.classList.add('opacity-100', 'visible');
            document.body.style.overflow = 'hidden';
        });
        
        function hideModal() {
            modalOverlay.classList.remove('opacity-100', 'visible');
            modalOverlay.classList.add('opacity-0', 'invisible');
            document.body.style.overflow = 'auto';
        }
        
        if (closeModal) {
            closeModal.addEventListener('click', hideModal);
        }
        
        if (cancelForm) {
            cancelForm.addEventListener('click', hideModal);
        }
        
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                hideModal();
            }
        });
        
        // Cerrar modal con tecla Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modalOverlay.classList.contains('opacity-100')) {
                hideModal();
            }
        });
    }
    
    // Selección de tipo (ingreso/gasto)
    if (typeOptions.length > 0) {
        typeOptions.forEach(option => {
            option.addEventListener('click', function() {
                typeOptions.forEach(opt => {
                    opt.classList.remove('selected', 'border-primary', 'bg-primary/10', 'text-primary');
                    opt.classList.add('border-border');
                });
                this.classList.add('selected', 'border-primary', 'bg-primary/10', 'text-primary');
                this.classList.remove('border-border');
                this.querySelector('input').checked = true;
            });
        });
    }
    
    // Envío del formulario
    if (transactionForm) {
        transactionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Aquí procesarías los datos del formulario
            const formData = new FormData(this);
            const type = formData.get('type');
            const amount = this.querySelector('input[type="number"]').value;
            const category = this.querySelector('select').value;
            const date = this.querySelector('input[type="date"]').value;
            const note = this.querySelector('input[type="text"]').value;
            
            // Simular guardado (aquí conectarías con tu backend)
            console.log('Nueva transacción:', {
                type,
                amount,
                category,
                date,
                note
            });
            
            // Mostrar mensaje de éxito (opcional)
            showNotification('Transacción guardada correctamente', 'success');
            
            // Cerrar modal y limpiar formulario
            hideModal();
            this.reset();
            
            // Resetear selección de tipo
            typeOptions.forEach(opt => {
                opt.classList.remove('selected', 'border-primary', 'bg-primary/10', 'text-primary');
                opt.classList.add('border-border');
            });
            typeOptions[0].classList.add('selected', 'border-primary', 'bg-primary/10', 'text-primary');
            typeOptions[0].classList.remove('border-border');
            typeOptions[0].querySelector('input').checked = true;
        });
    }
    
    // Función para mostrar notificaciones
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg transition-all duration-300 transform translate-x-full ${
            type === 'success' ? 'bg-emerald-500 text-white' : 
            type === 'error' ? 'bg-rose-500 text-white' : 
            'bg-primary text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Inicializar gráficos
    function initCharts() {
        // Gráfico de gastos (tarta)
        const expensesCtx = document.getElementById('expensesChart');
        if (expensesCtx) {
            new Chart(expensesCtx.getContext('2d'), {
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
        
        // Gráfico de ingresos vs gastos (barras)
        const incomeVsExpensesCtx = document.getElementById('incomeVsExpensesChart');
        if (incomeVsExpensesCtx) {
            new Chart(incomeVsExpensesCtx.getContext('2d'), {
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
    
    // Inicializar gráficos cuando el DOM esté listo
    initCharts();
    
    // Inicializar gráficos adicionales para Analytics
    function initAnalyticsCharts() {
        // Gráfico de gastos para Analytics
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
        
        // Gráfico de ingresos vs gastos para Analytics
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
        
        // Gráfico de tendencia
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
    }
    
    // Inicializar gráficos de Reports
    function initReportsCharts() {
        // Gráfico de ahorro
        const savingsCtx = document.getElementById('savingsChart');
        if (savingsCtx) {
            new Chart(savingsCtx.getContext('2d'), {
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
        }
    }
    
    // Inicializar gráficos según la página actual
    const currentPath = window.location.pathname;
    if (currentPath.includes('/analytics')) {
        initAnalyticsCharts();
    } else if (currentPath.includes('/reports')) {
        initReportsCharts();
    }
});
