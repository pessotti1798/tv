"use client";

import React from "react";
import Image from "next/image";
import { PlaySquare, Calendar, BookOpen, List, User, Search, Clock } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalMinutesWatched: number;
  onOpenSearch: () => void;
  userName?: string;
  userAvatar?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalMinutesWatched,
  onOpenSearch,
  userName = "Rodrigo",
  userAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
}) => {
  const days = Math.floor(totalMinutesWatched / (60 * 24));
  const hours = Math.floor((totalMinutesWatched % (60 * 24)) / 60);
  const formattedTime = `${days}d ${hours}h`;

  return (
    <header className="sticky top-0 z-40 bg-[#14181c]/95 backdrop-blur border-b border-[#242d36] px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("upnext")}
            className="flex items-center gap-2.5 group text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00e054] to-[#00a83e] flex items-center justify-center text-black font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              <PlaySquare className="w-5 h-5 text-black fill-current" />
            </div>
            <div>
              <span className="font-extrabold tracking-wider text-white text-lg group-hover:text-[#00e054] transition-colors">
                EPISODIC
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest text-[#8b9baa] ml-2 px-1.5 py-0.5 rounded bg-[#1f272f] border border-[#2c3642]">
                tmdb
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab("upnext")}
              className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "upnext"
                  ? "text-white bg-[#242f38]"
                  : "text-[#8b9baa] hover:text-white hover:bg-[#1b2228]"
              }`}
            >
              <PlaySquare className={`w-4 h-4 ${activeTab === "upnext" ? "text-[#00e054]" : ""}`} />
              A Seguir
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "calendar"
                  ? "text-white bg-[#242f38]"
                  : "text-[#8b9baa] hover:text-white hover:bg-[#1b2228]"
              }`}
            >
              <Calendar className={`w-4 h-4 ${activeTab === "calendar" ? "text-[#00e054]" : ""}`} />
              Calendário
            </button>
            <button
              onClick={() => setActiveTab("diary")}
              className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "diary"
                  ? "text-white bg-[#242f38]"
                  : "text-[#8b9baa] hover:text-white hover:bg-[#1b2228]"
              }`}
            >
              <BookOpen className={`w-4 h-4 ${activeTab === "diary" ? "text-[#00e054]" : ""}`} />
              Diário (Diary)
            </button>
            <button
              onClick={() => setActiveTab("lists")}
              className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "lists"
                  ? "text-white bg-[#242f38]"
                  : "text-[#8b9baa] hover:text-white hover:bg-[#1b2228]"
              }`}
            >
              <List className={`w-4 h-4 ${activeTab === "lists" ? "text-[#00e054]" : ""}`} />
              Listas
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "profile"
                  ? "text-white bg-[#242f38]"
                  : "text-[#8b9baa] hover:text-white hover:bg-[#1b2228]"
              }`}
            >
              <User className={`w-4 h-4 ${activeTab === "profile" ? "text-[#00e054]" : ""}`} />
              Perfil
            </button>
          </nav>
        </div>

        {/* Right Section: Search & Watch Time Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 bg-[#1b2228] border border-[#2c3642] hover:border-[#00e054] rounded-full py-1.5 px-3.5 text-xs text-[#8b9baa] hover:text-white transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#00e054]" />
            <span className="hidden sm:inline">Buscar no TMDB...</span>
            <span className="sm:hidden">Buscar</span>
          </button>

          {/* TV Time Watch Time Pill */}
          <div
            className="hidden xl:flex items-center gap-2 bg-[#1b2228] border border-[#2c3642] px-3 py-1 rounded-full text-xs text-[#8b9baa]"
            title="Tempo total acumulado de séries assistidas"
          >
            <Clock className="w-3.5 h-3.5 text-[#00e054] animate-pulse" />
            <span>
              Tempo assistido: <strong className="text-white">{formattedTime}</strong>
            </span>
          </div>

          {/* User Profile Capsule */}
          <button
            onClick={() => setActiveTab("profile")}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-[#1b2228] border border-transparent hover:border-[#2c3642] transition-colors cursor-pointer"
          >
            <span className="text-xs font-semibold text-white hidden md:inline">{userName}</span>
            <Image width={28} height={28} unoptimized
              src={userAvatar}
              alt="Avatar"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-[#00e054]"
            />
          </button>
        </div>

      </div>

      {/* Mobile Bottom Navigation */}
      <div className="flex md:hidden items-center justify-around pt-2 mt-2 border-t border-[#242d36] text-xs">
        <button
          onClick={() => setActiveTab("upnext")}
          className={`py-1 px-2 font-medium flex flex-col items-center ${
            activeTab === "upnext" ? "text-[#00e054]" : "text-[#8b9baa]"
          }`}
        >
          <span>A Seguir</span>
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`py-1 px-2 font-medium flex flex-col items-center ${
            activeTab === "calendar" ? "text-[#00e054]" : "text-[#8b9baa]"
          }`}
        >
          <span>Calendário</span>
        </button>
        <button
          onClick={() => setActiveTab("diary")}
          className={`py-1 px-2 font-medium flex flex-col items-center ${
            activeTab === "diary" ? "text-[#00e054]" : "text-[#8b9baa]"
          }`}
        >
          <span>Diário</span>
        </button>
        <button
          onClick={() => setActiveTab("lists")}
          className={`py-1 px-2 font-medium flex flex-col items-center ${
            activeTab === "lists" ? "text-[#00e054]" : "text-[#8b9baa]"
          }`}
        >
          <span>Listas</span>
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`py-1 px-2 font-medium flex flex-col items-center ${
            activeTab === "profile" ? "text-[#00e054]" : "text-[#8b9baa]"
          }`}
        >
          <span>Perfil</span>
        </button>
      </div>
    </header>
  );
};
