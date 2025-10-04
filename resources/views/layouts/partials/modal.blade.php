<!-- Modal para nueva transacción -->
<div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4 opacity-0 invisible transition-all duration-300" id="modal-overlay">
    <div class="modal-content w-full max-w-sm sm:max-w-md bg-surface border border-border rounded-xl p-4 sm:p-6 relative shadow-xl transform translate-y-5 transition-all duration-300">
        <div class="modal-header flex items-center justify-between pb-4 border-b border-border mb-6">
            <h2 class="modal-title text-xl font-semibold text-text">Nuevo movimiento</h2>
            <button class="close-btn w-8 h-8 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center" id="close-modal">
                <i class="fas fa-times text-text"></i>
            </button>
        </div>
        <form class="modal-form flex flex-col gap-4" id="transaction-form">
            <fieldset class="type-selector grid grid-cols-2 gap-3">
                <label class="type-option flex items-center justify-center gap-2 rounded-xl border border-border p-3 cursor-pointer transition-all duration-200 selected border-primary bg-primary/10 text-primary">
                    <input type="radio" name="type" value="expense" checked class="hidden">
                    <i class="fas fa-arrow-down"></i>
                    <span>Gasto</span>
                </label>
                <label class="type-option flex items-center justify-center gap-2 rounded-xl border border-border p-3 cursor-pointer transition-all duration-200">
                    <input type="radio" name="type" value="income" class="hidden">
                    <i class="fas fa-arrow-up"></i>
                    <span>Ingreso</span>
                </label>
            </fieldset>

            <div class="form-group flex flex-col">
                <label class="form-label text-sm text-text/80 mb-2 font-medium">Cantidad</label>
                <input type="number" inputmode="decimal" step="0.01" placeholder="0,00" class="form-input rounded-xl border border-border bg-surface p-3 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary" required>
            </div>

            <div class="form-row grid grid-cols-2 gap-3">
                <div class="form-group flex flex-col">
                    <label class="form-label text-sm text-text/80 mb-2 font-medium">Categoría</label>
                    <select class="form-input rounded-xl border border-border bg-surface p-3 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>Alimentación</option>
                        <option>Vivienda</option>
                        <option>Transporte</option>
                        <option>Ocio</option>
                        <option>Salud</option>
                        <option>Otros</option>
                    </select>
                </div>
                <div class="form-group flex flex-col">
                    <label class="form-label text-sm text-text/80 mb-2 font-medium">Fecha</label>
                    <input type="date" class="form-input rounded-xl border border-border bg-surface p-3 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary">
                </div>
            </div>

            <div class="form-group flex flex-col">
                <label class="form-label text-sm text-text/80 mb-2 font-medium">Nota (opcional)</label>
                <input type="text" placeholder="Ej. Supermercado barrio" class="form-input rounded-xl border border-border bg-surface p-3 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary">
            </div>

            <div class="form-actions flex gap-3 pt-2">
                <button type="button" class="cancel-btn flex-1 rounded-xl border border-border p-3 bg-transparent cursor-pointer font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800" id="cancel-form">Cancelar</button>
                <button type="submit" class="submit-btn flex-1 rounded-xl border-none p-3 bg-gradient-to-r from-primary to-primary/80 text-white cursor-pointer font-medium transition-all duration-200 hover:from-primary/90 hover:to-primary/70">Guardar</button>
            </div>
        </form>
    </div>
</div>