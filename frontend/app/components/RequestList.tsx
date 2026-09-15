"use client";

import { useState } from "react";
import { useChatStore } from "@/lib/store/chatStore";
import { ArrowLeft, Check, X } from "lucide-react";

type Requests = "received" | "sent";

const receivedRequest = [
  {
    id: "1",
    name: "Aditya",
    phoneNumber: "1234567890",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    requestTime: "10 min ago",
  },
  {
    id: "2",
    name: "Ajay",
    phoneNumber: "1234356789",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    requestTime: "1 day ago",
  },
  {
    id: "3",
    name: "Aman",
    phoneNumber: "9876543210",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    requestTime: "1 hour ago",
  },
]

const sentRequest = [
  {
    id: "1",
    name: "Aditya",
    phoneNumber: "1234567890",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    requestTime: "40 min ago",
  },
  {
    id: "2",
    name: "Ajay",
    phoneNumber: "1234356789",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    requestTime: "1 week ago",
  },
  {
    id: "3",
    name: "Aman",
    phoneNumber: "9876543210",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    requestTime: "3 hour ago",
  },
]

export const RequestList = () => {
  const [activeRequestTab, setActiveRequestTab] = useState<Requests>("received");

  const setRequestOpen = useChatStore((state) => state.setRequestOpen);
  const setActiveTab = useChatStore((state) => state.setActiveTab);

  return (
    <div className="w-80 h-screen flex flex-col gap-4 shrink-0 pt-4 bg-[#0d1927] border-x-2 border-gray-800">
      <div className="flex items-center gap-2 px-2">
        <div className="group relative">
          <div 
            onClick={() => {
              setRequestOpen(false);
              setActiveTab("chat");
            }} 
            className="hover:bg-white/5 text-gray-300 hover:text-white p-2 cursor-pointer rounded-full"
          >
            <ArrowLeft size={22} />
          </div>
          <span className="pointer-events-none absolute z-10 top-full -right-1/2 mt-2 whitespace-nowrap rounded-md 
            bg-black px-3 py-1 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            Back
          </span>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xl text-white font-semibold">Requests</p>
          <p className="text-[12px] text-gray-300">Manage the connections you send and receive</p>
        </div>
      </div>
      <div className="border border-slate-800" />
      <div className="flex items-center justify-between gap-2 p-1 bg-slate-800 border border-gray-700 text-white rounded-full mx-3">
        <button 
          onClick={() => setActiveRequestTab("received")}
          className={`flex gap-2 items-center justify-center w-full rounded-full px-2 py-1.5 cursor-pointer 
            ${activeRequestTab === "received" 
              ? "bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]" 
              : ""}
            `}
        >
          <div className="font-semibold text-sm">
            Received
          </div>
          <div className="rounded-full px-2 py-1 text-xs bg-white/20">
            3
          </div>
        </button>
        <button
          onClick={() => setActiveRequestTab("sent")} 
          className={`flex gap-2 items-center justify-center w-full rounded-full px-2 py-1.5 cursor-pointer 
            ${activeRequestTab === "sent" 
              ? "bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]" 
              : ""}
            `}
        >
          <div className="font-semibold text-sm">
            Sent
          </div>
          <div className="rounded-full px-2 py-1 text-xs bg-white/20">
            2
          </div>
        </button>
      </div>
      <div className="px-3 py-2 overflow-y-auto
        [&::-webkit-scrollbar]:w-[8px]
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:border-[2px]
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
      >
        <div className="flex flex-col gap-2 justify-center">
          {activeRequestTab === "received" 
            ? 
              <>
                {receivedRequest.map((data) => {
                  return (
                    <div key={data.id} className="rounded-xl bg-slate-800 p-3 text-white flex flex-col gap-3">
                      <div className="flex gap-3 justify-between">
                        <div className="flex gap-3">
                          <img src={data.img} alt={data.name} className="shrink-0 h-12 w-12 object-cover rounded-full"/>
                          <div className="w-full flex flex-col justify-center">
                            <p>{data.name}</p>
                            <p className="text-gray-300 text-sm">{data.phoneNumber}</p>
                          </div>
                        </div>   
                        <div className="text-cyan-500 text-[11px]">
                          {data.requestTime}
                        </div>
                      </div>
                      <div className="w-full flex gap-3 items-center">
                        <button className="flex gap-1 items-center justify-center text-sm w-full rounded-md px-2 py-1 cursor-pointer bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]">
                          <Check size={18} strokeWidth={2} /> 
                          Accept
                        </button>
                        <button className="flex gap-1 items-center justify-center text-sm w-full rounded-md px-2 py-1 bg-white/10 hover:bg-red-500 cursor-pointer">
                          <X size={18} strokeWidth={2} />
                          Decline
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            :  
              <>
                {sentRequest.map((data) => {
                  return (
                    <div key={data.id} className="rounded-xl bg-slate-800 p-3 text-white">
                      <div className="flex gap-3 justify-between">
                        <div className="flex gap-3">
                          <img src={data.img} alt={data.name} className="shrink-0 h-12 w-12 object-cover rounded-full"/>
                          <div className="w-full flex flex-col justify-center">
                            <p>{data.name}</p>
                            <p className="text-gray-300 text-sm">{data.phoneNumber}</p>
                          </div>
                        </div>   
                        <div className="flex flex-col gap-2 items-end">
                          <div className="text-cyan-500 text-[11px]">
                            {data.requestTime}
                          </div>
                          <button className="flex gap-1 items-center justify-center text-[13px] w-full rounded-md px-2 py-1 bg-white/10 hover:bg-red-500 cursor-pointer">
                            <X size={16} strokeWidth={2}/>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
          }
        </div>
      </div>
    </div>
  );
};