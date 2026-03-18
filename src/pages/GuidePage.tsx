import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Book, Home, Plus, Minus, PiggyBank, BarChart3, Scale, History, Settings, Wallet, CreditCard, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Lightbulb, HelpCircle, FileText, Download, Upload, Palette, Calculator, Target, Calendar, Eye, EyeOff } from 'lucide-react';
import MobileNav from "@/components/MobileNav";

const GuidePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-32 lg:pl-20">
      <div className="container max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Book className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Guía Completa de ContaHogar</h1>
                <p className="text-sm text-muted-foreground mt-1">Tu compañero financiero paso a paso</p>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <Card className="mb-6 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">¡Bienvenido a ContaHogar! 👋</CardTitle>
            <CardDescription className="text-lg">
              La aplicación que te ayudará a tomar el control de tus finanzas personales de manera sencilla y visual.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Si eres nuevo en el control de finanzas personales, ¡no te preocupes! Esta guía te explicará
              todo paso a paso, con ejemplos prácticos y consejos útiles.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="text-xs">Fácil de usar</Badge>
              <Badge variant="secondary" className="text-xs">Gratuito</Badge>
              <Badge variant="secondary" className="text-xs">Sin publicidad</Badge>
              <Badge variant="secondary" className="text-xs">Privado y seguro</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Table of Contents */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Índice de Contenidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">🚀 Primeros Pasos</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• ¿Qué es ContaHogar?</li>
                  <li>• Instalación y configuración</li>
                  <li>• Primer inicio de sesión</li>
                  <li>• Configuración inicial</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">💰 Gestión de Dinero</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Añadir cuentas bancarias</li>
                  <li>• Registrar ingresos</li>
                  <li>• Registrar gastos</li>
                  <li>• Transferencias entre cuentas</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📊 Análisis y Control</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Ver balances y resúmenes</li>
                  <li>• Crear presupuestos</li>
                  <li>• Análisis de gastos</li>
                  <li>• Comparar periodos</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">⚙️ Configuración</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Personalizar apariencia</li>
                  <li>• Copias de seguridad</li>
                  <li>• Importar/exportar datos</li>
                  <li>• Consejos avanzados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: What is ContaHogar */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              ¿Qué es ContaHogar?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>ContaHogar</strong> es una aplicación web gratuita que te ayuda a controlar tus finanzas personales.
                No necesitas ser un experto en contabilidad para usarla - está diseñada para ser intuitiva y fácil de usar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">Registra Ingresos</h3>
                <p className="text-sm text-muted-foreground">
                  Anota todos tus ingresos: sueldo, freelance, ventas, etc.
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-semibold mb-2">Controla Gastos</h3>
                <p className="text-sm text-muted-foreground">
                  Registra y categoriza todos tus gastos diarios.
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">Analiza Tendencias</h3>
                <p className="text-sm text-muted-foreground">
                  Ve gráficos y estadísticas de tus hábitos financieros.
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">¿Por qué usar ContaHogar?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Gratis y sin límites:</strong> No hay suscripciones ni límites de transacciones.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Privacidad total:</strong> Tus datos se guardan solo en tu dispositivo.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Fácil de usar:</strong> Interfaz intuitiva diseñada para principiantes.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Análisis visual:</strong> Gráficos y estadísticas claras.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: First Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Primeros Pasos - Configuración Inicial
            </CardTitle>
            <CardDescription>
              Vamos a configurar tu ContaHogar paso a paso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Configura tus cuentas</h3>
                  <p className="text-muted-foreground mb-2">
                    Ve a <strong>Ajustes</strong> (icono de engranaje) y añade tus cuentas bancarias.
                    Por defecto ya tienes "Banco" y "Efectivo".
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded border">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 <strong>Consejo:</strong> Si solo tienes efectivo, puedes eliminar la cuenta "Banco".
                      Si tienes varias cuentas bancarias, añade una para cada una.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Establece saldos iniciales</h3>
                  <p className="text-muted-foreground mb-2">
                    Por defecto, todas las cuentas empiezan con saldo 0.
                    Ve a <strong>Ajustes</strong> cuando empieces a usar la app para configurar
                    cuánto dinero tienes actualmente en cada cuenta.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 <strong>Importante:</strong> No necesitas configurar los saldos iniciales ahora.
                      Puedes empezar a registrar transacciones inmediatamente y ajustar los saldos
                      en Ajustes cuando tengas tiempo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">¡Ya puedes empezar!</h3>
                  <p className="text-muted-foreground">
                    Ahora puedes empezar a registrar tus ingresos y gastos.
                    La aplicación ya está configurada y lista para usar.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Recording Transactions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-500" />
              Registrar Ingresos y Gastos
            </CardTitle>
            <CardDescription>
              Aprende a registrar todas tus transacciones financieras
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Registrar un Ingreso
                </h3>
                <div className="space-y-3">
                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Paso 1: Botón + verde</span>
                      <Badge variant="secondary">Ingreso</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Toca el botón <strong>+</strong> verde en la esquina inferior derecha
                    </p>
                  </div>
                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Paso 2: Rellenar datos</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Cantidad:</strong> €1,500.00</li>
                      <li>• <strong>Categoría:</strong> Sueldo</li>
                      <li>• <strong>Cuenta:</strong> Banco</li>
                      <li>• <strong>Fecha:</strong> Hoy</li>
                    </ul>
                  </div>
                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Paso 3: Guardar</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Toca "Guardar" y ¡listo!
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  Registrar un Gasto
                </h3>
                <div className="space-y-3">
                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Paso 1: Botón - rojo</span>
                      <Badge variant="destructive">Gasto</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Toca el botón <strong>-</strong> rojo en la esquina inferior derecha
                    </p>
                  </div>
                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Paso 2: Rellenar datos</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Cantidad:</strong> €25.50</li>
                      <li>• <strong>Categoría:</strong> Supermercado</li>
                      <li>• <strong>Cuenta:</strong> Efectivo</li>
                      <li>• <strong>Fecha:</strong> Hoy</li>
                    </ul>
                  </div>
                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Paso 3: Guardar</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Toca "Guardar" y ¡listo!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200">Sistema Inteligente de Categorías</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    <strong>¿Cómo funciona?</strong> La primera vez que uses la app, encontrarás 5 categorías sugeridas
                    ya disponibles: <strong>Sueldo</strong>, <strong>Comida</strong>, <strong>Transporte</strong>,
                    <strong>Ocio</strong> y <strong>Hogar</strong>. Cuando escribas una categoría por primera vez,
                    quedará guardada automáticamente. La próxima vez que registres una transacción,
                    esa categoría aparecerá como sugerencia para que no tengas que escribirla de nuevo.
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    <strong>Ejemplo práctico:</strong> Imagina que tienes gastos en "Restaurante",
                    "Comida rápida" y "Cena fuera". Si quieres mantenerlos separados, escribe cada
                    uno diferente. Pero si prefieres agruparlos como "Comida fuera", usa siempre
                    la misma categoría y el sistema te la sugerirá automáticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Consejo Importante</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Registra <strong>TODOS</strong> tus ingresos y gastos, incluso los más pequeños.
                    Un café de €1.50 al día son €45 al mes. ¡Suma mucho!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Understanding the Dashboard */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-500" />
              Entendiendo el Panel Principal
            </CardTitle>
            <CardDescription>
              Tu centro de control financiero
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">📊 Tarjetas de Resumen</h3>
                <div className="space-y-3">
                  <div className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Saldo Total</span>
                      <Badge variant="secondary">€1,274.50</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Dinero disponible en todas tus cuentas
                    </p>
                  </div>
                  <div className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Ingresos del Mes</span>
                      <Badge className="bg-green-100 text-green-800">€1,500.00</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total de dinero que has recibido
                    </p>
                  </div>
                  <div className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Gastos del Mes</span>
                      <Badge variant="destructive">€225.50</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total de dinero que has gastado
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">📈 Gráficos y Análisis</h3>
                <div className="space-y-3">
                  <div className="border rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4" />
                      <span className="font-medium">Distribución de Gastos</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Gráfico circular que muestra en qué gastas más
                    </p>
                  </div>
                  <div className="border rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-medium">Tendencias Mensuales</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Comparación de ingresos vs gastos por mes
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">🎯 Selector de Cuentas</h3>
              <p className="text-muted-foreground mb-3">
                En la parte superior puedes seleccionar qué cuenta ver:
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm">Total</Button>
                <Button variant="default" size="sm">Banco €1,250</Button>
                <Button variant="outline" size="sm">Efectivo €24.50</Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                💡 "Total" muestra todas tus cuentas juntas. Las otras opciones muestran solo esa cuenta específica.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Budgets */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-pink-500" />
              Presupuestos - Controla tus Gastos
            </CardTitle>
            <CardDescription>
              Establece límites mensuales para no gastar de más
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-pink-50 dark:bg-pink-950/20 p-4 rounded-lg border border-pink-200 dark:border-pink-800">
              <p className="text-sm text-pink-800 dark:text-pink-200">
                <strong>¿Qué es un presupuesto?</strong> Es un límite que te pones para gastar en una categoría específica.
                Por ejemplo: "No gastar más de €300 en comida al mes".
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Cómo crear un presupuesto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded p-4 text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-2">1</div>
                  <p className="font-medium mb-1">Ir a Presupuestos</p>
                  <p className="text-sm text-muted-foreground">Toca el icono de la alcancía</p>
                </div>
                <div className="border rounded p-4 text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-2">2</div>
                  <p className="font-medium mb-1">Seleccionar mes</p>
                  <p className="text-sm text-muted-foreground">Usa las flechas para elegir el mes</p>
                </div>
                <div className="border rounded p-4 text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-2">3</div>
                  <p className="font-medium mb-1">Añadir presupuesto</p>
                  <p className="text-sm text-muted-foreground">Toca el botón + para crear uno</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Ejemplo de presupuesto</h3>
              <div className="border rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Supermercado</span>
                    <Badge variant="secondary">€300 límite</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">Marzo 2026</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Gastado: €127.50</span>
                    <span>Restante: €172.50</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '42%'}}></div>
                  </div>
                  <p className="text-xs text-muted-foreground">42% del presupuesto utilizado</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-2">
                <Target className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200">Consejo para presupuestos</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Empieza con presupuestos realistas. Si sueles gastar €400 en comida,
                    no pongas €200 de límite o te frustrarás. Mejor ve bajando el límite gradualmente.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Analysis Tools */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Herramientas de Análisis
            </CardTitle>
            <CardDescription>
              Descubre patrones en tus finanzas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded p-4 text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Historial</h3>
                <p className="text-sm text-muted-foreground">
                  Ve todos tus ingresos y gastos organizados por meses
                </p>
              </div>
              <div className="border rounded p-4 text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Scale className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">Comparativa</h3>
                <p className="text-sm text-muted-foreground">
                  Compara tus balances reales con los de la app
                </p>
              </div>
              <div className="border rounded p-4 text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calculator className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">Medias</h3>
                <p className="text-sm text-muted-foreground">
                  Calcula tus gastos e ingresos promedio por categoría
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">¿Cómo usar el Historial?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <strong>Selecciona el mes:</strong> Usa el calendario para ver datos de meses anteriores
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <strong>Filtra por tipo:</strong> Ve solo ingresos, solo gastos, o ambos
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <strong>Analiza patrones:</strong> Identifica en qué gastas más y cuándo
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Settings and Backup */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              Ajustes y Copias de Seguridad
            </CardTitle>
            <CardDescription>
              Mantén tus datos seguros y personaliza la app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-500" />
                  Hacer Copia de Seguridad
                </h3>
                <div className="space-y-3">
                  <div className="border rounded p-3">
                    <p className="text-sm">
                      <strong>¿Por qué?</strong> Para no perder tus datos si cambias de dispositivo o se borra el navegador
                    </p>
                  </div>
                  <div className="border rounded p-3">
                    <p className="text-sm">
                      <strong>¿Cuándo?</strong> Después de registrar transacciones importantes, o semanalmente
                    </p>
                  </div>
                  <div className="border rounded p-3">
                    <p className="text-sm">
                      <strong>¿Cómo?</strong> Ve a Ajustes → "Descargar datos" → Guardar el archivo
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-green-500" />
                  Restaurar Datos
                </h3>
                <div className="space-y-3">
                  <div className="border rounded p-3">
                    <p className="text-sm">
                      <strong>¿Cuándo usarlo?</strong> Si cambias de dispositivo o borraste datos accidentalmente
                    </p>
                  </div>
                  <div className="border rounded p-3">
                    <p className="text-sm">
                      <strong>¿Cómo?</strong> Ve a Ajustes → "Cargar datos" → Selecciona tu archivo de backup
                    </p>
                  </div>
                  <div className="border rounded p-3 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      ⚠️ <strong>Atención:</strong> Restaurar datos reemplaza toda la información actual
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" />
                Personalizar Apariencia
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded p-4 text-center">
                  <div className="w-8 h-8 bg-white border-2 border-gray-300 rounded-full mx-auto mb-2"></div>
                  <p className="font-medium text-sm">Tema Claro</p>
                  <p className="text-xs text-muted-foreground">Para usar de día</p>
                </div>
                <div className="border rounded p-4 text-center">
                  <div className="w-8 h-8 bg-gray-900 rounded-full mx-auto mb-2"></div>
                  <p className="font-medium text-sm">Tema Oscuro</p>
                  <p className="text-xs text-muted-foreground">Para usar de noche</p>
                </div>
                <div className="border rounded p-4 text-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-white to-gray-900 rounded-full mx-auto mb-2"></div>
                  <p className="font-medium text-sm">Automático</p>
                  <p className="text-xs text-muted-foreground">Sigue tu sistema</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-orange-500" />
              Preguntas Frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="border rounded p-4">
                <h4 className="font-semibold mb-2">❓ ¿Es seguro usar ContaHogar?</h4>
                <p className="text-sm text-muted-foreground">
                  Sí, completamente seguro. Tus datos se guardan solo en tu dispositivo,
                  nunca se envían a ningún servidor. Solo tú tienes acceso a tu información financiera.
                </p>
              </div>

              <div className="border rounded p-4">
                <h4 className="font-semibold mb-2">❓ ¿Puedo usar ContaHogar en mi móvil?</h4>
                <p className="text-sm text-muted-foreground">
                  Sí, funciona perfectamente en móviles y tablets. La interfaz se adapta automáticamente
                  al tamaño de tu pantalla para una experiencia óptima.
                </p>
              </div>

              <div className="border rounded p-4">
                <h4 className="font-semibold mb-2">❓ ¿Qué pasa si borro mis datos accidentalmente?</h4>
                <p className="text-sm text-muted-foreground">
                  Si has hecho copias de seguridad, puedes restaurar todos tus datos desde Ajustes.
                  Te recomendamos hacer backup al menos una vez por semana.
                </p>
              </div>

              <div className="border rounded p-4">
                <h4 className="font-semibold mb-2">❓ ¿Puedo categorizar mis gastos como quiera?</h4>
                <p className="text-sm text-muted-foreground">
                  ¡Por supuesto! El sistema de categorías funciona de manera inteligente:
                  simplemente escribe el nombre de la categoría cuando registres una transacción.
                  Esa categoría quedará almacenada y aparecerá como sugerencia automática
                  en futuras transacciones, facilitando la organización y evitando duplicados.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Beneficio:</strong> Si siempre compras en el mismo supermercado,
                  escribe "Supermercado" una vez y la próxima vez solo tendrás que seleccionarla
                  de la lista de sugerencias, en lugar de escribirla nuevamente.
                </p>
              </div>

              <div className="border rounded p-4">
                <h4 className="font-semibold mb-2">❓ ¿Funciona sin conexión a internet?</h4>
                <p className="text-sm text-muted-foreground">
                  Una vez cargada la aplicación, puedes usarla sin conexión.
                  Solo necesitas internet para la carga inicial.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Final Tips */}
        <Card className="mb-6 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-5 h-5" />
              Consejos Finales para el Éxito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <p className="text-sm">Registra <strong>TODAS</strong> tus transacciones, por pequeñas que sean</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <p className="text-sm">Revisa tus finanzas al menos una vez por semana</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <p className="text-sm">Haz copias de seguridad regularmente</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  <p className="text-sm">Usa presupuestos para controlar tus gastos</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                  <p className="text-sm">Analiza tus patrones de gasto mensualmente</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">6</span>
                  <p className="text-sm">Sé constante - la disciplina financiera da resultados</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                ¿Necesitas más ayuda? La guía se actualiza constantemente con nuevos consejos y funcionalidades.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Volver al Inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <MobileNav />
    </div>
  );
};

export default GuidePage;
