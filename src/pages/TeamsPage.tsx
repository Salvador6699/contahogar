import React from "react";
import { TeamManager } from "@/components/TeamManager";
import { Users } from "lucide-react";

const TeamsPage = () => {
  return (
    <div className="w-full">
      <div className="w-full max-w-4xl mx-auto px-4 lg:px-12 py-4">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Equipos</h1>
            <p className="text-sm text-muted-foreground">
              Administra tus contabilidades y familiares
            </p>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <TeamManager />
        </div>
      </div>
    </div>
  );
};

export default TeamsPage;
