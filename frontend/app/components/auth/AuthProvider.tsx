"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/supabaseClient";
import { useChatStore } from "@/lib/store/chatStore";

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const setCurrentUser = useChatStore((state) => state.setCurrentUser);
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
      }

      setIsLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          fetchUserProfile(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [setCurrentUser]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a1220] text-cyan-500">
        Loading WebChat...
      </div>
    );
  }

  return <>{children}</>;
};