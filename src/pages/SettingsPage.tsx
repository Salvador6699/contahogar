import { useTheme } from "next-themes"
import { Sun, Moon, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import MobileNav from '@/components/MobileNav';
import { AccountManager } from '@/components/AccountManager';

const SettingsPage = () => {
    const { setTheme } = useTheme()
    return (
        <div className="min-h-screen app-gradient-bg pb-20 lg:pl-20 pt-24">
            <div className="container max-w-2xl mx-auto px-4 py-4 sm:py-6">

                <div className="space-y-6">
                    <AccountManager />

                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sun className="w-5 h-5 text-income" />
                                Apariencia
                            </CardTitle>
                            <CardDescription>
                                Elige cómo se ve la aplicación en tu dispositivo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4">
                            <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setTheme("light")}>
                                <Sun className="w-5 h-5" />
                                Claro
                            </Button>
                            <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setTheme("dark")}>
                                <Moon className="w-5 h-5" />
                                Oscuro
                            </Button>
                            <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setTheme("system")}>
                                <Laptop className="w-5 h-5" />
                                Sistema
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="text-center py-4">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
                            ContaHogar v2.0 • Personalización
                        </p>
                    </div>
                </div>
            </div>
            <MobileNav />
        </div>
    );
};

export default SettingsPage;
