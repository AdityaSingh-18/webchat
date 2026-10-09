"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/supabaseClient";
import { useChatStore } from "@/lib/store/chatStore";

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const router = useRouter();

  const setCurrentUser = useChatStore((state) => state.setCurrentUser);
  const connectSocket = useChatStore((state) => state.connectSocket);
  const disconnectSocket = useChatStore((state) => state.disconnectSocket);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data && !error) {
        setCurrentUser(data);
      } else {
        console.error("Failed to fetch profile:", error);
        setCurrentUser(null);
      }

      setIsLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Failed to get session:", error);
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        connectSocket(session.access_token);
        fetchUserProfile(session.user.id);
      } else {
        disconnectSocket();
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          connectSocket(session.access_token);
          fetchUserProfile(session.user.id);
        } else if (event === "TOKEN_REFRESHED" && session?.access_token) {
          connectSocket(session.access_token);
        } else if (event === "SIGNED_OUT") {
          disconnectSocket();
          setCurrentUser(null);
          setIsLoading(false);
          router.push("/login");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, setCurrentUser, connectSocket, disconnectSocket,]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a1220] text-cyan-500">
        Loading WebChat...
      </div>
    );
  }

  return <>{children}</>;
};