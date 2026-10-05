"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { EyeIcon, EyeOffIcon, LockKeyhole, Mail } from "lucide-react";

export default function page () {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(data.error);
      toast.error(data.error || "Invalid login credentials");
      return;
    }

    router.push("/");
  };

  return (
    <div className="flex items-center justify-center h-screen overflow-y-auto">
      <div className="absolute z-0 w-full h-screen">
        <img src="./images/background.png" alt="background" className="h-full w-full object-cover"/>
      </div>

      <div className="relative text-white max-w-xs md:max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src="./Logo.svg" alt="webchat logo" className="w-20 h-20 drop-shadow-[0_0_16px_#c568f5]"/>
          <span className="text-5xl font-semibold bg-gradient-to-br from-[#c568f5] via-[#68a8ff] to-[#4ee7e8] 
            bg-clip-text text-transparent [text-shadow:0_0_30px_#4ee7e8]"
          >
            WebChat
          </span>
        </div>

        <div className="text-center text-3xl font-semibold">
          Welcome back to WebChat
        </div>
        <div className="text-[17px] text-center text-gray-400 mb-6">
          Sign in to continue chatting
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4 mx-auto bg-gray-800/40 flex items-center gap-4 border-2 border-gray-800 rounded-xl px-4 pt-2 pb-1">
            <Mail size={22} className="text-cyan-500"/>
            <div className="flex-1 flex flex-col">
              <label htmlFor="email" className="text-gray-400 text-[13px]">
                Email Address
              </label>
              <input
                type="email"
                id="email" 
                name="email" 
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="outline-none py-1 text-[15px]"
              />
            </div>
          </div>
          
          <div className="mx-auto bg-gray-800/70 flex items-center gap-4 border-2 border-gray-800 rounded-xl px-4 py-1 mb-3">
            <LockKeyhole size={22} className="text-cyan-500"/>
            <div className="flex-1 flex flex-col">
              <label htmlFor="password" className="text-gray-400 text-[13px]">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="outline-none py-1 text-[15px]"
              />
            </div>
            {showPassword 
              ? 
                <EyeIcon 
                  onClick={() => setShowPassword(false)} 
                  size={22} 
                  className="text-cyan-500 cursor-pointer"
                /> 
              :
                <EyeOffIcon 
                  onClick={() => setShowPassword(true)} 
                  size={22} 
                  className="text-cyan-500 cursor-pointer"
                />
            }
          </div>
          
          <div className="flex justify-between items-center text-[15px] mb-6">
            <div className="text-cyan-600 cursor-pointer hover:text-cyan-500">
              Forgot Password?
            </div>
            <div className="flex items-center jusify-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-cyan-600 cursor-pointer" />
              <p className="text-gray-300">
                Remember Me
              </p>
            </div>
          </div>
          
          <button type="submit" className="w-full text-center px-4 py-2 rounded-lg text-white cursor-pointer mb-4
            bg-gradient-to-r from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] [box-shadow:0_0_12px_rgba(159,32,227,0.25),0_0_18px_rgba(59,130,246,0.2),0_0_24px_rgba(0,210,211,0.25)]">
            Sign in
          </button>
        </form>
        
        <div className="flex justify-center items-center gap-2 text-gray-400 mb-4">
          <div className="flex-1 h-0 border border-gray-700" />
          <span>Or sign in with</span>
          <div className="flex-1 h-0 border border-gray-700" />
        </div>
        
        <button className="w-full flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-white cursor-pointer mb-4 bg-gray-600">
          <img
            src="https://img.icons8.com/?size=100&id=17949&format=png&color=000000"
            alt="Google"
            className="w-5 h-5"
          /> 
          Sign in with Google
        </button>
        
        <div className="text-gray-400 text-center">
          Don't have an account?{" "}
          <Link href="signup" className="text-cyan-600 cursor-pointer hover:text-cyan-500">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}