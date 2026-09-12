"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { LockKeyhole, Mail, User } from "lucide-react";

export default function page () {
  const router = useRouter();

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullname,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(data.error);
      return;
    }

    router.push("/login");
  };

  return (
    <div className="bg-gray-900 flex items-center justify-center h-screen overflow-y-auto">
      <img src="./images/background.png" alt="background" className="w-screen max-h-screen z-0 absolute"/>
      <div className="relative text-white max-w-xs md:min-w-sm rounded-lg">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src="./Logo.svg" alt="webchat logo" className="w-20 h-20 drop-shadow-[0_0_16px_#c568f5]"/>
          <span className="text-5xl font-semibold bg-gradient-to-br from-[#c568f5] via-[#68a8ff] to-[#4ee7e8] 
            bg-clip-text text-transparent [text-shadow:0_0_30px_#4ee7e8]"
          >
            WebChat
          </span>
        </div>
        <div className="text-center text-3xl font-semibold">
          Create an Account
        </div>
        <div className="text-[17px] text-center text-gray-400 mb-4">
          Sign up to start chatting on WebChat
        </div>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="fullname" className="text-gray-400 text-sm">
              Full Name
            </label>
            <div className="p-[1px] rounded-full bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]">
              <div className="flex items-center">
                <div className="p-2.5 rounded-tl-full rounded-bl-full bg-gray-900/90">
                  <User size={20} className="text-cyan-600" />
                </div>
                <input
                  type="text" 
                  id="fullname" 
                  name="fullname"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)} 
                  className="w-full rounded-tr-full rounded-br-full bg-gray-900/90 outline-none py-2 pr-2" 
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-gray-400 text-sm">
              Email
            </label>
            <div className="p-[1px] rounded-full bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]">
              <div className="flex items-center">
                <div className="p-2.5 rounded-tl-full rounded-bl-full bg-gray-900/90">
                  <Mail size={20} className="text-cyan-600" />
                </div>
                <input
                  type="email" 
                  id="email" 
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}  
                  className="w-full rounded-tr-full rounded-br-full bg-gray-900/90 outline-none py-2 pr-2" 
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 mb-2">
            <label htmlFor="password" className="text-gray-400 text-sm">
              Password
            </label>
            <div className="p-[1px] rounded-full bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]">
              <div className="flex items-center">
                <div className="p-2.5 rounded-tl-full rounded-bl-full bg-gray-900/90">
                  <LockKeyhole size={20} className="text-cyan-600" />
                </div>
                <input 
                  type="text" 
                  id="password" 
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full rounded-tr-full rounded-br-full bg-gray-900/90 outline-none py-2 pr-2" 
                />
              </div>
            </div>
          </div>
          <button type="submit" className="w-full text-center px-4 py-2 rounded-full text-white cursor-pointer
            bg-gradient-to-r from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] [box-shadow:0_0_12px_rgba(159,32,227,0.3),0_0_18px_rgba(59,130,246,0.2),0_0_24px_rgba(0,210,211,0.3)]">
            Create Account
          </button>
        </form>
        
        <div className="flex justify-center items-center gap-2 text-gray-400 mb-4">
          <div className="flex-1 h-0 border border-gray-700" />
          <span>Or sign up with</span>
          <div className="flex-1 h-0 border border-gray-700" />
        </div>
        <button className="w-full flex items-center justify-center gap-1 px-4 py-2 rounded-full text-white cursor-pointer mb-4 bg-gray-600">
          <img
            src="https://img.icons8.com/?size=100&id=17949&format=png&color=000000"
            alt="Google"
            className="w-5 h-5"
          /> 
          Sign in with Google
        </button>
        <div className="text-gray-400 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-600 cursor-pointer hover:text-cyan-500">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}