// Aplicación principal K-Means
const app = {
    // Configuración
    API_URL: 'https://kmenas-backend.onrender.com',
    
    // Estado de la aplicación
    estado: {
        casas: [],
        resultadoKMeans: null,
        iteracionActual: 0,
        anchoEspacio: 100,
        altoEspacio: 100,
        colores: [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8B195', '#F67280', '#C06C84', '#6C5B7B', '#355C7D'
        ],
        tamañoPuntosCasas: 5,
        tamañoPuntosClusters: 5,
        tamañoHospitales: 12,
        charts: {
            casas: null,
            resultado: null,
            comparacion: null
        }
    },

    // =============================================================================
    // FUNCIONES PRINCIPALES
    // =============================================================================

    async generarCasas() {
        const nCasas = parseInt(document.getElementById('nCasas').value);
        const anchoEspacio = parseInt(document.getElementById('anchoEspacio').value);
        const altoEspacio = parseInt(document.getElementById('altoEspacio').value);
        
        if (!nCasas || nCasas < 10) {
            alert('Por favor ingresa un número válido de casas (mínimo 10)');
            return;
        }

        if (!anchoEspacio || !altoEspacio || anchoEspacio < 50 || altoEspacio < 50) {
            alert('Por favor ingresa dimensiones válidas para el espacio (mínimo 50x50)');
            return;
        }

        this.mostrarLoading();
        
        try {
            console.log('Generando casas...', { nCasas, anchoEspacio, altoEspacio });
            
            const response = await fetch(`${this.API_URL}/generar-vecindarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    n_vecindarios: nCasas,
                    tamano_espacio: Math.max(anchoEspacio, altoEspacio)
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Casas generadas:', data);
            
            this.estado.casas = data.vecindarios;
            this.estado.anchoEspacio = anchoEspacio;
            this.estado.altoEspacio = altoEspacio;
            
            this.limpiarVisualizaciones();
            this.actualizarEstadisticas();
            this.dibujarCasas();
            
            alert(`✅ ${nCasas} casas generadas en espacio ${anchoEspacio}x${altoEspacio}`);
            
        } catch (error) {
            console.error('Error al generar casas:', error);
            alert(`Error al generar casas: ${error.message}. Verifica que el backend esté ejecutándose en ${this.API_URL}`);
        } finally {
            this.ocultarLoading();
        }
    },

    async calcularHospitales() {
        if (this.estado.casas.length === 0) {
            alert('Primero genera las casas');
            return;
        }
        
        const kHospitales = parseInt(document.getElementById('kHospitales').value);
        const anchoEspacio = parseInt(document.getElementById('anchoEspacio').value);
        const altoEspacio = parseInt(document.getElementById('altoEspacio').value);
        
        if (!kHospitales || kHospitales < 1) {
            alert('Por favor ingresa un número válido de hospitales');
            return;
        }

        // Validación
        if (kHospitales > this.estado.casas.length) {
            alert(`El número de hospitales (k=${kHospitales}) no puede ser mayor que el número de casas (${this.estado.casas.length}). Reduciendo k a ${this.estado.casas.length}`);
            document.getElementById('kHospitales').value = this.estado.casas.length;
            return this.calcularHospitales();
        }

        this.mostrarLoading();
        
        try {
            console.log('Calculando hospitales...', { 
                k: kHospitales, 
                casas: this.estado.casas.length,
                ancho: anchoEspacio,
                alto: altoEspacio
            });
            
            const response = await fetch(`${this.API_URL}/calcular-hospitales`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    vecindarios: this.estado.casas,
                    k: kHospitales,
                    tamano_espacio: Math.max(anchoEspacio, altoEspacio)
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Resultado K-Means:', data);
            
            this.estado.resultadoKMeans = data;
            this.estado.iteracionActual = data.historial_centroides.length - 1;
            
            this.actualizarEstadisticas();
            this.dibujarResultado();
            this.mostrarMetricas();
            this.mostrarEvaluacionCalidad();
            
        } catch (error) {
            console.error('Error al calcular hospitales:', error);
            alert(`Error al calcular ubicaciones de hospitales: ${error.message}`);
        } finally {
            this.ocultarLoading();
        }
    },

    async analizarKOptimo() {
        if (this.estado.casas.length === 0) {
            alert('Primero genera las casas');
            return;
        }

        this.mostrarLoading();
        
        try {
            console.log('Analizando k óptimo...');
            // Usar el k que indicó el usuario como k_max para el análisis del codo
            const kInput = parseInt(document.getElementById('kHospitales').value) || 0;
            const suggested = Math.max(2, Math.min(30, Math.floor(Math.sqrt(this.estado.casas.length) * 2)));
            let k_max_used = kInput > 1 ? Math.min(kInput, this.estado.casas.length - 1) : Math.min(suggested, this.estado.casas.length - 1);

            const response = await fetch(`${this.API_URL}/analizar-k-optimo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    vecindarios: this.estado.casas,
                    k_max: k_max_used,
                    tamano_espacio: Math.max(this.estado.anchoEspacio, this.estado.altoEspacio)
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Análisis k óptimo:', data);
            
            this.mostrarComparacionK(data);
            
        } catch (error) {
            console.error('Error al analizar k óptimo:', error);
            alert(`Error al analizar k óptimo: ${error.message}`);
        } finally {
            this.ocultarLoading();
        }
    },

    // =============================================================================
    // VISUALIZACIONES
    // =============================================================================

    limpiarVisualizaciones() {
        // Destruir todos los charts existentes
        Object.values(this.estado.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        
        this.estado.charts = {
            casas: null,
            resultado: null,
            comparacion: null
        };
        
        // Limpiar resultados anteriores
        this.estado.resultadoKMeans = null;
        this.estado.iteracionActual = 0;
        
        // Ocultar secciones
        document.getElementById('metricsSection').style.display = 'none';
        document.getElementById('qualityAssessment').style.display = 'none';
        document.getElementById('comparisonSection').style.display = 'none';
        
        // Limpiar información de clusters
        this.limpiarInfoClusters();

        // Vaciar sidebar de hospitales cuando no hay resultado K-Means
        try {
            const sidebar = document.getElementById('sidebarHospitals');
            if (sidebar) sidebar.innerHTML = '';
        } catch (err) {
            console.debug('No se pudo limpiar sidebar:', err);
        }
    },

    dibujarCasas() {
        const ctx = document.getElementById('mapaCasas').getContext('2d');
        
        // Destruir chart anterior
        if (this.estado.charts.casas) {
            this.estado.charts.casas.destroy();
        }
        
        this.estado.charts.casas = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: '🏠 Casas',
                    data: this.estado.casas.map(p => ({x: p[0], y: p[1]})),
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    pointRadius: this.estado.tamañoPuntosCasas,
                    pointHoverRadius: this.estado.tamañoPuntosCasas + 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: 0,
                        max: this.estado.anchoEspacio,
                        title: {
                            display: true,
                            text: 'Coordenada X (m)'
                        },
                    },
                    y: {
                        min: 0,
                        max: this.estado.altoEspacio,
                        title: {
                            display: true,
                            text: 'Coordenada Y (n)'
                        },
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Mapa de ${this.estado.casas.length} Casas`,
                    },
                    legend: {
                        display: true,
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Casa: (${context.parsed.x.toFixed(1)}, ${context.parsed.y.toFixed(1)})`;
                            }
                        }
                    }
                },
            }
        });

        // Configurar slider
        document.getElementById('tamañoPuntosCasas').oninput = (e) => {
            this.estado.tamañoPuntosCasas = parseInt(e.target.value);
            if (this.estado.charts.casas) {
                this.estado.charts.casas.data.datasets[0].pointRadius = this.estado.tamañoPuntosCasas;
                this.estado.charts.casas.data.datasets[0].pointHoverRadius = this.estado.tamañoPuntosCasas + 2;
                this.estado.charts.casas.update('none');
            }
        };

        // Asegurar que el sidebar de hospitales esté vacío mientras sólo mostramos el mapa de casas
        try {
            const sidebar = document.getElementById('sidebarHospitals');
            if (sidebar) sidebar.innerHTML = '';
        } catch (err) {
            console.debug('No se pudo limpiar sidebar al dibujar casas:', err);
        }
    },

    dibujarResultado() {
        if (!this.estado.resultadoKMeans) return;
        
        const ctx = document.getElementById('mapaResultado').getContext('2d');
        const centroides = this.estado.resultadoKMeans.historial_centroides[this.estado.iteracionActual];
        const etiquetas = this.estado.resultadoKMeans.etiquetas;
        
        // Destruir chart anterior
        if (this.estado.charts.resultado) {
            this.estado.charts.resultado.destroy();
        }
        
        console.log('Dibujando resultado:', {
            centroides: centroides.length,
            kUsuario: this.estado.resultadoKMeans.resumen.k_usuario,
            iteracion: this.estado.iteracionActual + 1
        });

        // Preparar datos
        const datasets = [];
        const k = centroides.length;
        
        // 1. Agregar casas por cluster
        for (let i = 0; i < k; i++) {
            const puntosCluster = this.estado.casas.filter((_, index) => etiquetas[index] === i);
            const cantidad = puntosCluster.length;
            
            datasets.push({
                label: `Cluster ${i+1} (${cantidad} casas)`,
                data: puntosCluster.map(p => ({x: p[0], y: p[1]})),
                backgroundColor: this.estado.colores[i],
                borderColor: this.estado.colores[i],
                pointRadius: this.estado.tamañoPuntosClusters,
                pointHoverRadius: this.estado.tamañoPuntosClusters + 2,
            });
        }
        
        // 2. Agregar hospitales como dataset separado (siempre visibles)
        const hospitalesData = centroides.map((centroide, i) => ({ x: centroide[0], y: centroide[1] }));

        // Log para depuración: asegurar que la cantidad de centroides coincide con k
        console.log('Hospitales a dibujar:', hospitalesData.length, 'esperado k=', k, hospitalesData);

        datasets.push({
            label: '🏥 Hospitales',
            data: hospitalesData,
            backgroundColor: '#e74c3c',
            borderColor: '#c0392b',
            pointRadius: this.estado.tamañoHospitales,
            pointHoverRadius: this.estado.tamañoHospitales + 3,
            pointStyle: 'rectRot',
            borderWidth: 2,
            order: 999 // dibujar siempre encima
        });
        
        this.estado.charts.resultado = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: 0,
                        max: this.estado.anchoEspacio,
                        title: { display: true, text: 'Coordenada X (m)' }
                    },
                    y: {
                        min: 0,
                        max: this.estado.altoEspacio,
                        title: { display: true, text: 'Coordenada Y (n)' }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `K-Means con ${k} Hospitales - Iteración ${this.estado.iteracionActual + 1}`,
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                if (context.dataset.label === '🏥 Hospitales') {
                                    return `🏥 Hospital: (${context.parsed.x.toFixed(1)}, ${context.parsed.y.toFixed(1)})`;
                                }
                                return `${context.dataset.label}: (${context.parsed.x.toFixed(1)}, ${context.parsed.y.toFixed(1)})`;
                            }
                        }
                    }
                }
            }
        });

        // Añadir plugin para dibujar numeritos sobre los hospitales
        // Registrarlo globalmente con Chart.register para evitar mutar objetos internos
        const hospitalLabelPlugin = {
            id: 'hospitalLabels',
            afterDatasetsDraw: (chart) => {
                const ctx2 = chart.ctx;
                const datasets = chart.data.datasets || [];
                const hospIdx = datasets.findIndex(d => d.label && d.label.includes('Hospital'));
                if (hospIdx === -1) return;

                const hospData = datasets[hospIdx].data || [];
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx2.save();
                ctx2.font = '12px Arial';
                ctx2.textAlign = 'center';
                ctx2.textBaseline = 'middle';

                for (let i = 0; i < hospData.length; i++) {
                    // Si el hospital está oculto visualmente (radio 0), no dibujar el número
                    const ds = datasets[hospIdx];
                    const radii = Array.isArray(ds.pointRadius) ? ds.pointRadius : null;
                    if (radii && radii[i] === 0) continue;

                    const p = hospData[i];
                    const px = xScale.getPixelForValue(p.x);
                    const py = yScale.getPixelForValue(p.y);

                    // Draw white circle background for readability
                    ctx2.beginPath();
                    ctx2.fillStyle = 'rgba(255,255,255,0.85)';
                    ctx2.arc(px + 10, py - 10, 10, 0, 2 * Math.PI);
                    ctx2.fill();

                    // Draw number (original index + 1)
                    ctx2.fillStyle = '#c0392b';
                    ctx2.fillText(String(i + 1), px + 10, py - 10);
                }

                ctx2.restore();
            }
        };

        // Registrar el plugin globalmente (si no está registrado ya)
        try {
            // Chart.registry may vary by Chart.js version; use Chart.register directly but avoid duplicate registration
            if (!Chart.registry.plugins.get('hospitalLabels')) {
                Chart.register(hospitalLabelPlugin);
            }
        } catch (e) {
            // Fallback: intentar registrar sin chequear
            try { Chart.register(hospitalLabelPlugin); } catch (err) { /* ignore */ }
        }
        // Forzar redraw para que el plugin actúe
        this.estado.charts.resultado.update();

        // (No click-to-hide behavior) Interacciones con hospitales son sólo informativas ahora.

        // Actualizar controles
        document.getElementById('iteracionActual').textContent = 
            `Iteración: ${this.estado.iteracionActual + 1} de ${this.estado.resultadoKMeans.historial_centroides.length}`;

        // Configurar sliders
        this.configurarSliders();
        
        // Mostrar información de clusters
        this.mostrarInfoClusters(etiquetas, k);

        // Generar panel con lista de hospitales y botones para centrar la vista (sidebar)
        try {
            const sidebar = document.getElementById('sidebarHospitals');
            if (!sidebar) throw new Error('Sidebar no encontrado');

            const hospitalsHTML = [`<div class="hospitals-panel">`, `<h4>🏥 Hospitales</h4>`, `<ul class="hospitals-list">`];

            // Calcular conteo de casas por cluster (etiquetas)
            const clusterCounts = Array(k).fill(0);
            try {
                if (Array.isArray(etiquetas)) {
                    etiquetas.forEach(e => {
                        if (typeof e === 'number' && e >= 0 && e < k) clusterCounts[e]++;
                    });
                }
            } catch (err) {
                console.debug('Error calculando conteos por cluster:', err);
            }

            hospitalesData.forEach((h, i) => {
                const count = clusterCounts[i] || 0;
                hospitalsHTML.push(`<li><strong>#${i+1}</strong> (${h.x.toFixed(1)}, ${h.y.toFixed(1)}) — ${count} casas <button class="btn btn-sm center-hospital" data-idx="${i}">Centrar</button></li>`);
            });
            hospitalsHTML.push(`</ul><div class="hospitals-actions"><button id="resetViewBtn" class="btn btn-info">Restablecer vista</button></div></div>`);

            sidebar.innerHTML = hospitalsHTML.join('');

            // Añadir listeners a botones dentro del sidebar
            sidebar.querySelectorAll('.center-hospital').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.currentTarget.dataset.idx, 10);
                    this.centerOnHospital(idx);
                });
            });

            const resetBtn = sidebar.querySelector('#resetViewBtn');
            if (resetBtn) resetBtn.addEventListener('click', () => this.resetView());
        } catch (err) {
            console.debug('No se pudo generar panel de hospitales en sidebar:', err);
        }
    },

    configurarSliders() {
        // Slider tamaño casas en clusters
        document.getElementById('tamañoPuntosClusters').oninput = (e) => {
            this.estado.tamañoPuntosClusters = parseInt(e.target.value);
            if (this.estado.charts.resultado) {
                this.estado.charts.resultado.data.datasets.forEach((dataset, i) => {
                    if (!dataset.label.includes('Hospital')) {
                        dataset.pointRadius = this.estado.tamañoPuntosClusters;
                        dataset.pointHoverRadius = this.estado.tamañoPuntosClusters + 2;
                    }
                });
                this.estado.charts.resultado.update('none');
            }
        };

        // Slider tamaño hospitales
        document.getElementById('tamañoHospitales').oninput = (e) => {
            this.estado.tamañoHospitales = parseInt(e.target.value);
            if (this.estado.charts.resultado) {
                this.estado.charts.resultado.data.datasets.forEach(dataset => {
                    if (dataset.label.includes('Hospital')) {
                        dataset.pointRadius = this.estado.tamañoHospitales;
                        dataset.pointHoverRadius = this.estado.tamañoHospitales + 3;
                    }
                });
                this.estado.charts.resultado.update('none');
            }
        };
    },

    mostrarInfoClusters(etiquetas, k) {
        this.limpiarInfoClusters();
        
        // Contar casas por cluster
        const conteo = {};
        for (let i = 0; i < k; i++) {
            conteo[i] = 0;
        }
        etiquetas.forEach(etiqueta => {
            if (conteo[etiqueta] !== undefined) {
                conteo[etiqueta]++;
            }
        });

        const infoHTML = `
            <div class="clusters-summary">
                <h4>📊 Resumen de Clusters</h4>
                <div class="clusters-grid">
                    ${Object.entries(conteo).map(([cluster, cantidad]) => `
                        <div class="cluster-item" style="border-left-color: ${this.estado.colores[cluster]}">
                            <div class="cluster-header">
                                <span class="cluster-number">Cluster ${parseInt(cluster) + 1}</span>
                                <span class="cluster-count">${cantidad} casas</span>
                            </div>
                            <div class="cluster-hospital">
                                🏥 Hospital ${parseInt(cluster) + 1}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const container = document.querySelector('#mapaResultado').closest('.chart-container');
        const title = container.querySelector('h3');
        title.insertAdjacentHTML('afterend', infoHTML);
    },

    centerOnHospital(index) {
        if (!this.estado.charts.resultado) return;
        const chart = this.estado.charts.resultado;
        const centroides = this.estado.resultadoKMeans.historial_centroides[this.estado.iteracionActual];
        if (!centroides || !centroides[index]) return;

        const cx = centroides[index][0];
        const cy = centroides[index][1];

        // Mostrar ventana centrada (50% del espacio por defecto)
        const spanX = Math.max(this.estado.anchoEspacio * 0.5, 20);
        const spanY = Math.max(this.estado.altoEspacio * 0.5, 20);

        const minX = Math.max(0, cx - spanX / 2);
        const maxX = Math.min(this.estado.anchoEspacio, cx + spanX / 2);
        const minY = Math.max(0, cy - spanY / 2);
        const maxY = Math.min(this.estado.altoEspacio, cy + spanY / 2);

        if (chart.options && chart.options.scales) {
            if (chart.options.scales.x) {
                chart.options.scales.x.min = minX;
                chart.options.scales.x.max = maxX;
            }
            if (chart.options.scales.y) {
                chart.options.scales.y.min = minY;
                chart.options.scales.y.max = maxY;
            }
        }
        chart.update();
    },

    resetView() {
        if (!this.estado.charts.resultado) return;
        const chart = this.estado.charts.resultado;
        if (chart.options && chart.options.scales) {
            if (chart.options.scales.x) {
                chart.options.scales.x.min = 0;
                chart.options.scales.x.max = this.estado.anchoEspacio;
            }
            if (chart.options.scales.y) {
                chart.options.scales.y.min = 0;
                chart.options.scales.y.max = this.estado.altoEspacio;
            }
        }
        chart.update();
    },

    limpiarInfoClusters() {
        const existingInfo = document.querySelector('.clusters-summary');
        if (existingInfo) {
            existingInfo.remove();
        }
    },

    mostrarComparacionK(data) {
        document.getElementById('comparisonSection').style.display = 'block';
        const ctx = document.getElementById('chartComparacion').getContext('2d');
        
        if (this.estado.charts.comparacion) {
            this.estado.charts.comparacion.destroy();
        }
        
        const kValues = data.resultados.map(r => r.k);
        const inercias = data.resultados.map(r => r.inercia);
        const silhouettes = data.resultados.map(r => r.silhouette);
        
        this.estado.charts.comparacion = new Chart(ctx, {
            type: 'line',
            data: {
                labels: kValues,
                datasets: [
                    {
                        label: 'Inercia (Método del Codo)',
                        data: inercias,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'Silhouette Score',
                        data: silhouettes,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Número de Hospitales (k)'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Inercia'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Silhouette Score'
                        },
                        min: 0,
                        max: 1,
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Análisis de K Óptimo - Recomendado: k=${data.k_optimo}`,
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
    },

    // =============================================================================
    // FUNCIONES AUXILIARES
    // =============================================================================

    actualizarEstadisticas() {
        document.getElementById('statAncho').textContent = this.estado.anchoEspacio;
        document.getElementById('statAlto').textContent = this.estado.altoEspacio;
        document.getElementById('statCasas').textContent = this.estado.casas.length;
        document.getElementById('statHospitales').textContent = this.estado.resultadoKMeans ? 
            this.estado.resultadoKMeans.resumen.k_usuario : '0';
        
        document.getElementById('statsPanel').style.display = 'grid';
    },

    mostrarMetricas() {
        if (!this.estado.resultadoKMeans) return;
        
        const metricas = this.estado.resultadoKMeans.metricas;
        const metricsGrid = document.getElementById('metricsGrid');
        
        metricsGrid.innerHTML = `
            <div class="metric-card ${this.getClaseMetrica(metricas.silhouette_score, 0.7, 0.5)}">
                <h4>Silhouette Score</h4>
                <div class="metric-value">${metricas.silhouette_score.toFixed(3)}</div>
                <small>Cohesión vs Separación (-1 a 1)</small>
            </div>
            <div class="metric-card ${this.getClaseMetrica(metricas.davies_bouldin_index, 0.5, 1.0, true)}">
                <h4>Davies-Bouldin</h4>
                <div class="metric-value">${metricas.davies_bouldin_index.toFixed(3)}</div>
                <small>Separación (menor es mejor)</small>
            </div>
            <div class="metric-card">
                <h4>Inercia</h4>
                <div class="metric-value">${metricas.inercia.toFixed(1)}</div>
                <small>Suma de distancias al cuadrado</small>
            </div>
            <div class="metric-card">
                <h4>Distancia Promedio</h4>
                <div class="metric-value">${metricas.distancia_promedio.toFixed(2)}</div>
                <small>Unidades al hospital más cercano</small>
            </div>
        `;
        
        document.getElementById('metricsSection').style.display = 'block';
    },

    mostrarEvaluacionCalidad() {
        if (!this.estado.resultadoKMeans) return;
        
        const evaluacion = this.estado.resultadoKMeans.metricas.evaluacion_calidad;
        const kUsuario = this.estado.resultadoKMeans.resumen.k_usuario;
        const kOptimo = this.estado.resultadoKMeans.resumen.k_optimo;
        
        document.getElementById('assessmentTitle').textContent = 
            `Evaluación para k=${kUsuario} (Óptimo: k=${kOptimo})`;
        document.getElementById('scoreBadge').textContent = 
            `${evaluacion.puntuacion_total}/8`;
        document.getElementById('assessmentDetails').innerHTML = 
            `<ul>${evaluacion.detalles.map(d => `<li>${d}</li>`).join('')}</ul>`;
        document.getElementById('assessmentRecommendation').textContent = 
            evaluacion.recomendacion;
        
        document.getElementById('qualityAssessment').style.display = 'block';
    },

    getClaseMetrica(valor, buen, regular, invertido = false) {
        if (invertido) {
            return valor <= buen ? 'good' : (valor <= regular ? 'warning' : 'poor');
        } else {
            return valor >= buen ? 'good' : (valor >= regular ? 'warning' : 'poor');
        }
    },

    iteracionAnterior() {
        if (this.estado.resultadoKMeans && this.estado.iteracionActual > 0) {
            this.estado.iteracionActual--;
            this.dibujarResultado();
        }
    },

    iteracionSiguiente() {
        if (this.estado.resultadoKMeans && this.estado.iteracionActual < this.estado.resultadoKMeans.historial_centroides.length - 1) {
            this.estado.iteracionActual++;
            this.dibujarResultado();
        }
    },

    mostrarLoading() {
        document.getElementById('loading').style.display = 'block';
    },

    ocultarLoading() {
        document.getElementById('loading').style.display = 'none';
    },

    // Inicialización
    init() {
        console.log(' Aplicación K-Means inicializada');
    }
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    app.init();
});
